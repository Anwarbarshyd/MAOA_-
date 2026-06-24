// backend/src/controllers/manager.controller.js
const bcrypt = require("bcryptjs");
const pool = require("../../db");

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v || "").trim());
}
function cleanPhone(v) {
  return String(v || "").replace(/[^\d]/g, "");
}
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
function normStr(v) {
  return String(v || "").trim();
}
function normBool01(v) {
  if (v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true") return 1;
  if (v === false || v === 0 || v === "0" || String(v).toLowerCase() === "false") return 0;
  return null;
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
    console.log("MANAGER insertNotification skipped:", e?.message);
  }
}

// ---------- Employees ----------
exports.listEmployees = async (req, res) => {
  try {
    const deptId = getDeptId(req);
    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });

    const [rows] = await pool.query(
      `SELECT UserId, FullName, Phone, Email, Role, DepartmentId, IsActive, CreatedAt
       FROM UsersProfile
       WHERE DepartmentId = ? AND LOWER(Role) = 'employee'
       ORDER BY CreatedAt DESC`,
      [deptId]
    );

    return res.json({ items: rows || [] });
  } catch (err) {
    console.error("MANAGER listEmployees ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const deptId = getDeptId(req);
    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });

    const { fullName, email, phone, nationalId, password } = req.body || {};
    const name = normStr(fullName);
    const em = normStr(email).toLowerCase();
    const ph = cleanPhone(phone);
    const nid = String(nationalId || "").replace(/[^\d]/g, "");
    const pw = String(password || "");

    if (name.length < 3) return res.status(400).json({ message: "الاسم غير صحيح" });
    if (!isEmail(em)) return res.status(400).json({ message: "البريد غير صحيح" });
    if (!ph) return res.status(400).json({ message: "رقم الجوال مطلوب" });
    if (pw.length < 6) return res.status(400).json({ message: "كلمة المرور لازم 6 أحرف+" });

    // تحقق من عدم التكرار
    let dupQuery = `SELECT UserId FROM UsersProfile WHERE Email = ? OR Phone = ?`;
    let dupParams = [em, ph];
    if (nid) {
      dupQuery += ` OR NationalId = ?`;
      dupParams.push(nid);
    }
    dupQuery += ` LIMIT 1`;

    const [existsRows] = await pool.query(dupQuery, dupParams);
    if (existsRows.length)
      return res.status(409).json({ message: "الموظف موجود مسبقًا (بريد/جوال/هوية)" });

    const hash = await bcrypt.hash(pw, 10);
    const newId = require("crypto").randomUUID();

    await pool.query(
      `INSERT INTO UsersProfile (UserId, FullName, Phone, Role, DepartmentId, IsActive, CreatedAt, Email, NationalId, PasswordHash)
       VALUES (?, ?, ?, 'employee', ?, 1, NOW(), ?, ?, ?)`,
      [newId, name, ph, deptId, em, nid || null, hash]
    );

    const [newRow] = await pool.query(
      `SELECT UserId, FullName, Phone, Email, Role, DepartmentId, IsActive, CreatedAt
       FROM UsersProfile WHERE UserId = ? LIMIT 1`,
      [newId]
    );

    return res.status(201).json({ item: newRow[0] });
  } catch (err) {
    console.error("MANAGER createEmployee ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.disableEmployee = async (req, res) => {
  try {
    const deptId = getDeptId(req);
    const userId = String(req.params.userId || "").trim();

    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });
    if (!isGuid(userId)) return res.status(400).json({ message: "Invalid userId" });

    const [result] = await pool.query(
      `UPDATE UsersProfile SET IsActive = 0
       WHERE UserId = ? AND DepartmentId = ? AND LOWER(Role) = 'employee'`,
      [userId, deptId]
    );

    if (!result.affectedRows)
      return res.status(404).json({ message: "موظف غير موجود ضمن جهتك" });

    return res.json({ message: "تم إيقاف الموظف" });
  } catch (err) {
    console.error("MANAGER disableEmployee ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.setEmployeeActive = async (req, res) => {
  try {
    const deptId = getDeptId(req);
    const userId = String(req.params.userId || "").trim();

    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });
    if (!isGuid(userId)) return res.status(400).json({ message: "Invalid userId" });

    const desired = normBool01(req.body?.isActive);

    const [curRows] = await pool.query(
      `SELECT IsActive FROM UsersProfile
       WHERE UserId = ? AND DepartmentId = ? AND LOWER(Role) = 'employee' LIMIT 1`,
      [userId, deptId]
    );

    const row = curRows[0];
    if (!row) return res.status(404).json({ message: "موظف غير موجود ضمن جهتك" });

    const current = row.IsActive === true || row.IsActive === 1 || String(row.IsActive) === "1";
    const next = desired === null ? (current ? 0 : 1) : desired;

    const [result] = await pool.query(
      `UPDATE UsersProfile SET IsActive = ?
       WHERE UserId = ? AND DepartmentId = ? AND LOWER(Role) = 'employee'`,
      [next ? 1 : 0, userId, deptId]
    );

    if (!result.affectedRows)
      return res.status(404).json({ message: "موظف غير موجود ضمن جهتك" });

    return res.json({ message: next ? "تم تفعيل الموظف" : "تم إيقاف الموظف", isActive: !!next });
  } catch (err) {
    console.error("MANAGER setEmployeeActive ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const deptId = getDeptId(req);
    const userId = String(req.params.userId || "").trim();

    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });
    if (!isGuid(userId)) return res.status(400).json({ message: "Invalid userId" });

    const fullName = normStr(req.body?.fullName);
    const email = normStr(req.body?.email).toLowerCase();
    const phone = cleanPhone(req.body?.phone);
    const nationalId = String(req.body?.nationalId || "").replace(/[^\d]/g, "");
    const password = String(req.body?.password || "");

    if (!fullName && !email && !phone && !nationalId && !password)
      return res.status(400).json({ message: "لا توجد بيانات للتعديل" });

    if (email && !isEmail(email)) return res.status(400).json({ message: "البريد غير صحيح" });
    if (fullName && fullName.length < 3) return res.status(400).json({ message: "الاسم غير صحيح" });
    if (password && password.length < 6) return res.status(400).json({ message: "كلمة المرور لازم 6 أحرف+" });

    const [empRows] = await pool.query(
      `SELECT UserId FROM UsersProfile WHERE UserId = ? AND DepartmentId = ? AND LOWER(Role) = 'employee' LIMIT 1`,
      [userId, deptId]
    );

    if (!empRows.length) return res.status(404).json({ message: "موظف غير موجود ضمن جهتك" });

    // تحقق من التكرار
    if (email || phone || nationalId) {
      let dupQ = `SELECT UserId FROM UsersProfile WHERE UserId <> ? AND (`;
      const dupConds = [];
      const dupParams = [userId];

      if (email) { dupConds.push(`Email = ?`); dupParams.push(email); }
      if (phone) { dupConds.push(`Phone = ?`); dupParams.push(phone); }
      if (nationalId) { dupConds.push(`NationalId = ?`); dupParams.push(nationalId); }

      dupQ += dupConds.join(" OR ") + `) LIMIT 1`;
      const [dupRows] = await pool.query(dupQ, dupParams);
      if (dupRows.length)
        return res.status(409).json({ message: "لا يمكن التعديل: (بريد/جوال/هوية) مستخدمة مسبقًا" });
    }

    const sets = [];
    const vals = [];

    if (fullName) { sets.push("FullName = ?"); vals.push(fullName); }
    if (email) { sets.push("Email = ?"); vals.push(email); }
    if (phone) { sets.push("Phone = ?"); vals.push(phone); }
    if (nationalId) { sets.push("NationalId = ?"); vals.push(nationalId); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      sets.push("PasswordHash = ?");
      vals.push(hash);
    }

    if (!sets.length) return res.status(400).json({ message: "لا توجد بيانات صالحة للتعديل" });

    vals.push(userId, deptId);
    await pool.query(
      `UPDATE UsersProfile SET ${sets.join(", ")}
       WHERE UserId = ? AND DepartmentId = ? AND LOWER(Role) = 'employee'`,
      vals
    );

    const [updatedRows] = await pool.query(
      `SELECT UserId, FullName, Phone, Email, Role, DepartmentId, IsActive, CreatedAt
       FROM UsersProfile WHERE UserId = ? LIMIT 1`,
      [userId]
    );

    return res.json({ message: "تم تحديث بيانات الموظف", item: updatedRows[0] || null });
  } catch (err) {
    console.error("MANAGER updateEmployee ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.deleteEmployeeHard = async (req, res) => {
  try {
    const deptId = getDeptId(req);
    const userId = String(req.params.userId || "").trim();

    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });
    if (!isGuid(userId)) return res.status(400).json({ message: "Invalid userId" });

    const [empRows] = await pool.query(
      `SELECT UserId FROM UsersProfile WHERE UserId = ? AND DepartmentId = ? AND LOWER(Role) = 'employee' LIMIT 1`,
      [userId, deptId]
    );

    if (!empRows.length) return res.status(404).json({ message: "موظف غير موجود ضمن جهتك" });

    try {
      await pool.query(
        `DELETE FROM UsersProfile WHERE UserId = ? AND DepartmentId = ? AND LOWER(Role) = 'employee'`,
        [userId, deptId]
      );
      return res.json({ message: "تم حذف الموظف نهائيًا" });
    } catch (e) {
      return res.status(409).json({
        message: "لا يمكن حذف الموظف نهائيًا لأن له سجلات مرتبطة بالنظام. استخدم (توقيف/تفعيل) بدل الحذف.",
      });
    }
  } catch (err) {
    console.error("MANAGER deleteEmployeeHard ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

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
        SELECT r.Id, r.UserId, r.DepartmentId, r.Description, r.Status, r.CreatedAt, r.UpdatedAt,
               u.FullName AS ReporterName, u.Phone AS ReporterPhone
        FROM Reports r
        INNER JOIN UsersProfile u ON u.UserId = r.UserId
        WHERE r.DepartmentId = ?
        ORDER BY r.CreatedAt DESC
      `;
      params = [deptId];
    } else {
      query = `
        SELECT r.Id, r.UserId, r.DepartmentId, r.Description, r.Status, r.CreatedAt, r.UpdatedAt,
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
    console.error("MANAGER listReports ERROR:", err);
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

    if (!reportRows.length) return res.status(404).json({ message: "البلاغ غير موجود ضمن جهتك" });

    const [mediaRows] = await pool.query(
      `SELECT Id, ReportId, Type, FileUrl, CreatedAt
       FROM Media
       WHERE ReportId = ?
       ORDER BY CreatedAt DESC`,
      [reportId]
    );

    const [historyRows] = await pool.query(
      `SELECT h.Id, h.ReportId, h.ChangedBy, h.FromStatus, h.ToStatus, h.ChangedAt,
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
    console.error("MANAGER getReportDetails ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.updateReportStatus = async (req, res) => {
  let conn;
  try {
    const deptId = getDeptId(req);
    const managerId = getUserId(req);
    const reportId = String(req.params.id || "").trim();
    const nextStatus = normStatus(req.body?.status);

    if (!deptId) return res.status(400).json({ message: "departmentId missing/invalid in token" });
    if (!managerId) return res.status(400).json({ message: "Invalid manager userId in token" });
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
    const ownerId = row.UserId ? String(row.UserId).trim() : null;

    if (oldStatus === nextStatus) {
      await conn.rollback();
      return res.json({ message: "الحالة نفسها (لا يوجد تغيير)" });
    }

    await conn.query(
      `UPDATE Reports SET Status = ?, UpdatedAt = NOW(), UpdatedBy = ? WHERE Id = ?`,
      [nextStatus, managerId, reportId]
    );

    // سجل التاريخ
    try {
      await conn.query(
        `INSERT INTO ReportStatusHistory (Id, ReportId, ChangedBy, FromStatus, ToStatus, ChangedAt)
         VALUES (UUID(), ?, ?, ?, ?, NOW())`,
        [reportId, managerId, oldStatus, nextStatus]
      );
    } catch (_) {}

    // إشعار لصاحب البلاغ
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
        title = "جاري معالجة البلاغ ⏳";
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
    console.error("MANAGER updateReportStatus ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  } finally {
    if (conn) conn.release();
  }
};

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
    console.error("MANAGER getStats ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};