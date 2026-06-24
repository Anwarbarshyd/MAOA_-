// backend/src/controllers/report.controller.js
const crypto = require("crypto");
const pool = require("../../db");

const isGuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

const normStr = (v) => String(v || "").trim();

const ALLOWED_STATUS = new Set(["new", "in_progress", "accepted", "rejected"]);
const DEDUP_WINDOW_SECONDS = 45;
const COORD_EPS = 0.00005;

function normalizeMediaArray(media) {
  if (!Array.isArray(media)) return [];
  return media
    .map((m) => ({
      type: String(m?.type || m?.Type || "").toLowerCase(),
      fileUrl: String(m?.fileUrl || m?.FileUrl || "").trim(),
    }))
    .filter((m) => (m.type === "image" || m.type === "video") && !!m.fileUrl);
}

async function insertNotification(conn, { userId, reportId, type, title, message }) {
  try {
    if (!isGuid(userId)) return;
    await conn.query(
      `INSERT INTO Notifications (Id, UserId, ReportId, Type, Title, Message, IsRead, CreatedAt)
       VALUES (UUID(), ?, ?, ?, ?, ?, 0, NOW())`,
      [userId, isGuid(reportId) ? reportId : null, String(type || "info"), String(title || ""), String(message || "")]
    );
  } catch (err) {
    console.log("Notification insert skipped:", err.message);
  }
}

async function insertStatusHistory(conn, { reportId, changedBy, fromStatus, toStatus, note = null }) {
  try {
    if (!isGuid(reportId) || !isGuid(changedBy)) return;
    await conn.query(
      `INSERT INTO ReportStatusHistory
       (Id, ReportId, ChangedBy, FromStatus, ToStatus, Note, ChangedAt)
       VALUES (UUID(), ?, ?, ?, ?, ?, NOW())`,
      [reportId, changedBy, String(fromStatus || "").trim().toLowerCase(), String(toStatus || "").trim().toLowerCase(), note ? String(note) : null]
    );
  } catch (_) {
    // skip history failures without breaking report creation
  }
}

exports.createReport = async (req, res) => {
  const { userId, departmentId, description, latitude, longitude, lat, lng, media } = req.body || {};
  const UserId = String(userId || "").trim();
  const DepartmentId = String(departmentId || "").trim();
  const Description = normStr(description);
  const Lat = Number(latitude ?? lat);
  const Lng = Number(longitude ?? lng);
  const MediaList = normalizeMediaArray(media);

  if (!isGuid(UserId) || !isGuid(DepartmentId) || !Description) {
    return res.status(400).json({ message: "بيانات ناقصة أو غير صحيحة" });
  }
  if (!Number.isFinite(Lat) || !Number.isFinite(Lng)) {
    return res.status(400).json({ message: "إحداثيات الموقع غير صحيحة" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [dupRows] = await conn.query(
      `SELECT Id AS ReportId
       FROM Reports
       WHERE UserId = ?
         AND DepartmentId = ?
         AND TRIM(Description) = ?
         AND ABS(LocationLat - ?) <= ?
         AND ABS(LocationLng - ?) <= ?
         AND TIMESTAMPDIFF(SECOND, CreatedAt, NOW()) BETWEEN 0 AND ?
       ORDER BY CreatedAt DESC
       LIMIT 1`,
      [UserId, DepartmentId, Description, Lat, COORD_EPS, Lng, COORD_EPS, DEDUP_WINDOW_SECONDS]
    );

    const existingId = dupRows[0]?.ReportId;
    if (existingId) {
      await conn.commit();
      return res.status(200).json({
        message: "تم استلام البلاغ مسبقًا (منع تكرار الإرسال)",
        reportId: existingId,
        dedup: true,
      });
    }

    const reportId = crypto.randomUUID();
    await conn.query(
      `INSERT INTO Reports
       (Id, UserId, DepartmentId, Description, LocationLat, LocationLng, Status, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'new', NOW())`,
      [reportId, UserId, DepartmentId, Description, Lat, Lng]
    );

    for (const m of MediaList) {
      await conn.query(
        `INSERT INTO Media (Id, ReportId, Type, FileUrl, CreatedAt)
         VALUES (UUID(), ?, ?, ?, NOW())`,
        [reportId, m.type, m.fileUrl]
      );
    }

    await insertStatusHistory(conn, {
      reportId,
      changedBy: UserId,
      fromStatus: "new",
      toStatus: "new",
      note: null,
    });

    await insertNotification(conn, {
      userId: UserId,
      reportId,
      type: "report_created",
      title: "تم استلام البلاغ",
      message: "تم إرسال البلاغ بنجاح وسيتم مراجعته قريباً",
    });

    await conn.commit();
    return res.status(201).json({ message: "تم إرسال البلاغ بنجاح", reportId });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("CREATE REPORT ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  } finally {
    if (conn) conn.release();
  }
};

exports.getMyReports = async (req, res) => {
  const userId = String(req.params?.userId || "").trim();
  if (!isGuid(userId)) return res.status(400).json({ message: "userId غير صحيح" });

  try {
    const [reports] = await pool.query(
      `SELECT
         R.Id,
         R.UserId,
         R.DepartmentId,
         D.Name AS DepartmentName,
         R.Description,
         R.LocationLat,
         R.LocationLng,
         R.Status,
         R.CreatedAt,
         R.UpdatedAt,
         R.UpdatedBy
       FROM Reports R
       LEFT JOIN Departments D ON D.Id = R.DepartmentId
       WHERE R.UserId = ?
       ORDER BY R.CreatedAt DESC`,
      [userId]
    );

    if (!reports.length) return res.json([]);

    const ids = reports.map((x) => x.Id).filter(Boolean);
    const placeholders = ids.map(() => "?").join(", ");
    const [mediaRows] = await pool.query(
      `SELECT Id, ReportId, Type, FileUrl, CreatedAt
       FROM Media
       WHERE ReportId IN (${placeholders})
       ORDER BY CreatedAt ASC`,
      ids
    );

    const mediaByReport = new Map();
    for (const m of mediaRows) {
      const k = String(m.ReportId);
      if (!mediaByReport.has(k)) mediaByReport.set(k, []);
      mediaByReport.get(k).push(m);
    }

    const out = reports.map((rep) => ({
      ...rep,
      Media: mediaByReport.get(String(rep.Id)) || [],
    }));

    return res.json(out);
  } catch (err) {
    console.error("GET MY REPORTS ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.getDepartmentReports = async (req, res) => {
  const departmentId = String(req.params?.departmentId || "").trim();
  if (!isGuid(departmentId)) return res.status(400).json({ message: "departmentId غير صحيح" });

  try {
    const [reports] = await pool.query(
      `SELECT
         R.Id,
         R.UserId,
         R.DepartmentId,
         D.Name AS DepartmentName,
         R.Description,
         R.LocationLat,
         R.LocationLng,
         R.Status,
         R.CreatedAt,
         R.UpdatedAt,
         R.UpdatedBy
       FROM Reports R
       LEFT JOIN Departments D ON D.Id = R.DepartmentId
       WHERE R.DepartmentId = ?
       ORDER BY R.CreatedAt DESC`,
      [departmentId]
    );

    if (!reports.length) return res.json([]);

    const ids = reports.map((x) => x.Id).filter(Boolean);
    const placeholders = ids.map(() => "?").join(", ");
    const [mediaRows] = await pool.query(
      `SELECT Id, ReportId, Type, FileUrl, CreatedAt
       FROM Media
       WHERE ReportId IN (${placeholders})
       ORDER BY CreatedAt ASC`,
      ids
    );

    const mediaByReport = new Map();
    for (const m of mediaRows) {
      const k = String(m.ReportId);
      if (!mediaByReport.has(k)) mediaByReport.set(k, []);
      mediaByReport.get(k).push(m);
    }

    const out = reports.map((rep) => ({
      ...rep,
      Media: mediaByReport.get(String(rep.Id)) || [],
    }));

    return res.json(out);
  } catch (err) {
    console.error("GET DEPARTMENT REPORTS ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.updateStatus = async (req, res) => {
  const id = String(req.params?.id || "").trim();
  const { status, employeeId } = req.body || {};
  const Status = String(status || "").toLowerCase().trim();
  const EmployeeId = String(employeeId || "").trim();

  if (!isGuid(id)) return res.status(400).json({ message: "Report id غير صحيح" });
  if (!ALLOWED_STATUS.has(Status)) return res.status(400).json({ message: "Status غير صحيح" });
  if (!isGuid(EmployeeId)) return res.status(400).json({ message: "employeeId غير صحيح" });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(`SELECT Id, Status, UserId FROM Reports WHERE Id = ? LIMIT 1`, [id]);
    const row = rows[0];
    if (!row) {
      await conn.rollback();
      return res.status(404).json({ message: "البلاغ غير موجود" });
    }

    const oldStatus = String(row.Status || "").trim().toLowerCase();
    const reportOwnerId = row.UserId ? String(row.UserId).trim() : null;

    await conn.query(
      `UPDATE Reports SET Status = ?, UpdatedAt = NOW(), UpdatedBy = ? WHERE Id = ?`,
      [Status, EmployeeId, id]
    );

    await insertStatusHistory(conn, {
      reportId: id,
      changedBy: EmployeeId,
      fromStatus: oldStatus,
      toStatus: Status,
      note: null,
    });

    if (reportOwnerId && isGuid(reportOwnerId)) {
      let title = "تحديث حالة البلاغ";
      let message = "تم تحديث حالة البلاغ";

      if (Status === "accepted") {
        title = "تم حل البلاغ ";
        message = "تمت معالجة البلاغ بنجاح";
      } else if (Status === "rejected") {
        title = "تم رفض البلاغ ";
        message = "تم رفض البلاغ من الجهة المختصة";
      } else if (Status === "in_progress") {
        title = "جاري معالجة البلاغ ";
        message = "تم البدء في معالجة البلاغ";
      }

      await insertNotification(conn, {
        userId: reportOwnerId,
        reportId: id,
        type: "status_changed",
        title,
        message,
      });
    }

    await conn.commit();
    return res.json({ message: "تم تحديث الحالة" });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("UPDATE STATUS ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  } finally {
    if (conn) conn.release();
  }
};
