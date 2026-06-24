// backend/src/controllers/employee.controller.js
const pool = require("../../db");

// ---------- Helpers ----------
function isGuid(v) {
  const s = String(v || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
function normStatus(v) {
  return String(v || "").trim().toLowerCase();
}
function getDeptId(req) {
  const deptId = String(req.user?.departmentId || "").trim();
  return isGuid(deptId) ? deptId : null;
}
function getUserId(req) {
  const uid = String(req.user?.userId || "").trim();
  return isGuid(uid) ? uid : null;
}

const ALLOWED_STATUS = new Set(["in_progress", "accepted", "rejected"]);

async function insertNotification(conn, { userId, reportId, type, title, message }) {
  try {
    const uid = String(userId || "").trim();
    const rid = String(reportId || "").trim();
    if (!isGuid(uid)) return;

    await conn.query(
      `INSERT INTO Notifications (Id, UserId, ReportId, Type, Title, Message, IsRead, CreatedAt)
       VALUES (UUID(), ?, ?, ?, ?, ?, 0, NOW())`,
      [uid, isGuid(rid) ? rid : null, String(type || "info"), String(title || ""), String(message || "")]
    );
  } catch (e) {
    // ما نوقف العملية لو الإشعار فشل
    console.log("EMPLOYEE insertNotification skipped:", e?.message);
  }
}

// ---------- Reports ----------
exports.listReports = async (req, res) => {
  try {
    const deptId = getDeptId(req);
    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });

    const status = normStatus(req.query.status || "");

    let query;
    let params;

    if (status === "") {
      query = `
        SELECT
          r.Id, r.UserId, r.DepartmentId, r.Description, r.Status, r.CreatedAt, r.UpdatedAt,
          u.FullName AS ReporterName, u.Phone AS ReporterPhone
        FROM Reports r
        INNER JOIN UsersProfile u ON u.UserId = r.UserId
        WHERE r.DepartmentId = ?
        ORDER BY r.CreatedAt DESC
      `;
      params = [deptId];
    } else {
      query = `
        SELECT
          r.Id, r.UserId, r.DepartmentId, r.Description, r.Status, r.CreatedAt, r.UpdatedAt,
          u.FullName AS ReporterName, u.Phone AS ReporterPhone
        FROM Reports r
        INNER JOIN UsersProfile u ON u.UserId = r.UserId
        WHERE r.DepartmentId = ?
          AND LOWER(TRIM(r.Status)) = ?
        ORDER BY r.CreatedAt DESC
      `;
      params = [deptId, status];
    }

    const [rows] = await pool.query(query, params);
    return res.json({ items: rows || [] });
  } catch (err) {
    console.error("EMPLOYEE listReports ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.getReportDetails = async (req, res) => {
  try {
    const deptId = getDeptId(req);
    const reportId = String(req.params.id || "").trim();

    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });
    if (!isGuid(reportId)) return res.status(400).json({ message: "Invalid report id" });

    const [reportRows] = await pool.query(
      `SELECT r.*, u.FullName AS ReporterName, u.Phone AS ReporterPhone, u.Email AS ReporterEmail
       FROM Reports r
       INNER JOIN UsersProfile u ON u.UserId = r.UserId
       WHERE r.Id = ? AND r.DepartmentId = ?
       LIMIT 1`,
      [reportId, deptId]
    );

    if (!reportRows.length)
      return res.status(404).json({ message: "البلاغ غير موجود ضمن جهتك" });

    const [mediaRows] = await pool.query(
      `SELECT Id, ReportId, Type, FileUrl, CreatedAt
       FROM Media
       WHERE ReportId = ?
       ORDER BY CreatedAt DESC`,
      [reportId]
    );

    // سجل تغيير الحالة مع اسم اللي غيّرها
    const [historyRows] = await pool.query(
      `SELECT
         h.Id, h.ReportId, h.ChangedBy, h.FromStatus, h.ToStatus, h.ChangedAt,
         up.FullName AS ChangedByName
       FROM ReportStatusHistory h
       LEFT JOIN UsersProfile up ON up.UserId = h.ChangedBy
       WHERE h.ReportId = ?
       ORDER BY h.ChangedAt DESC`,
      [reportId]
    );

    return res.json({
      report: reportRows[0],
      media: mediaRows || [],
      history: historyRows || [],
    });
  } catch (err) {
    console.error("EMPLOYEE getReportDetails ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.updateReportStatus = async (req, res) => {
  let conn;
  try {
    const deptId = getDeptId(req);
    const employeeId = getUserId(req);
    const reportId = String(req.params.id || "").trim();
    const nextStatus = normStatus(req.body?.status);

    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });
    if (!employeeId) return res.status(400).json({ message: "Invalid employee userId in token" });
    if (!isGuid(reportId)) return res.status(400).json({ message: "Invalid report id" });
    if (!ALLOWED_STATUS.has(nextStatus)) return res.status(400).json({ message: "Status غير صحيح" });

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [r0] = await conn.query(
      `SELECT Id, Status, UserId FROM Reports WHERE Id = ? AND DepartmentId = ? LIMIT 1`,
      [reportId, deptId]
    );

    const row = r0?.[0];
    if (!row) {
      await conn.rollback();
      return res.status(404).json({ message: "البلاغ غير موجود ضمن جهتك" });
    }

    const oldStatus = normStatus(row.Status);
    const ownerId = row.UserId ? String(row.UserId) : null;

    if (oldStatus === nextStatus) {
      await conn.rollback();
      return res.json({ message: "الحالة نفسها (لا يوجد تغيير)" });
    }

    await conn.query(
      `UPDATE Reports SET Status = ?, UpdatedAt = NOW(), UpdatedBy = ? WHERE Id = ?`,
      [nextStatus, employeeId, reportId]
    );

    await conn.query(
      `INSERT INTO ReportStatusHistory (Id, ReportId, ChangedBy, FromStatus, ToStatus, ChangedAt)
       VALUES (UUID(), ?, ?, ?, ?, NOW())`,
      [reportId, employeeId, oldStatus, nextStatus]
    );

    // notification to owner
    if (ownerId && isGuid(ownerId)) {
      let title = "تحديث حالة البلاغ";
      let message = "تم تحديث حالة البلاغ";

      if (nextStatus === "accepted") {
        title = "تم حل البلاغ ";
        message = "تمت معالجة البلاغ بنجاح";
      } else if (nextStatus === "rejected") {
        title = "تم رفض البلاغ ";
        message = "تم رفض البلاغ من الجهة المختصة";
      } else if (nextStatus === "in_progress") {
        title = "جاري معالجة البلاغ ";
        message = "تم البدء في معالجة البلاغ";
      }

      await insertNotification(conn, {
        userId: ownerId,
        reportId,
        type: "status_changed",
        title,
        message,
      });
    }

    await conn.commit();
    return res.json({ message: "تم تحديث الحالة" });
  } catch (err) {
    try {
      if (conn) await conn.rollback();
    } catch {}
    console.error("EMPLOYEE updateReportStatus ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  } finally {
    if (conn) conn.release();
  }
};

// ---------- Stats ----------
exports.getStats = async (req, res) => {
  try {
    const deptId = getDeptId(req);
    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });

    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN LOWER(TRIM(Status)) = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
         SUM(CASE WHEN LOWER(TRIM(Status)) = 'accepted' THEN 1 ELSE 0 END) AS accepted,
         SUM(CASE WHEN LOWER(TRIM(Status)) = 'rejected' THEN 1 ELSE 0 END) AS rejected
       FROM Reports
       WHERE DepartmentId = ?`,
      [deptId]
    );

    return res.json({
      stats: rows?.[0] || { total: 0, in_progress: 0, accepted: 0, rejected: 0 },
    });
  } catch (err) {
    console.error("EMPLOYEE getStats ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};