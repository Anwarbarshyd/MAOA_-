// backend/src/controllers/notification.controller.js
const pool = require("../../db");

const isGuid = (v) =>
  typeof v === "string" &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

function getUserIdFromToken(req) {
  const uid = String(req.user?.userId || "").trim();
  return isGuid(uid) ? uid : null;
}

function resolveUserId(req) {
  const tok = getUserIdFromToken(req);
  if (tok) return tok;

  const p = String(req.params?.userId || "").trim();
  return isGuid(p) ? p : null;
}

exports.getMyNotifications = async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(400).json({ message: "userId غير صحيح" });

  try {
    const [rows] = await pool.query(
      `SELECT Id, Type, Title, Message, IsRead, CreatedAt, ReportId
       FROM Notifications
       WHERE UserId = ?
       ORDER BY CreatedAt DESC
       LIMIT 200`,
      [userId]
    );

    const out = (rows || []).map((x) => ({
      id: String(x.Id),
      title: x.Title || "",
      body: x.Message || "",
      read: !!x.IsRead,
      createdAt: x.CreatedAt ? new Date(x.CreatedAt).getTime() : Date.now(),
      route: "MyReports",
      params: x.ReportId ? { reportId: String(x.ReportId) } : null,
      type: x.Type || null,
      reportId: x.ReportId ? String(x.ReportId) : null,
    }));

    return res.json(out);
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.markRead = async (req, res) => {
  const id = String(req.params?.id || "").trim();
  if (!isGuid(id)) return res.status(400).json({ message: "id غير صحيح" });
  const tokenUid = getUserIdFromToken(req);

  try {
    const [result] = tokenUid
      ? await pool.query(`UPDATE Notifications SET IsRead = 1 WHERE Id = ? AND UserId = ?`, [id, tokenUid])
      : await pool.query(`UPDATE Notifications SET IsRead = 1 WHERE Id = ?`, [id]);

    if (!result.affectedRows) return res.status(404).json({ message: "الإشعار غير موجود" });
    return res.json({ message: "تم" });
  } catch (err) {
    console.error("MARK READ ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.markAllRead = async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(400).json({ message: "userId غير صحيح" });

  try {
    await pool.query(`UPDATE Notifications SET IsRead = 1 WHERE UserId = ?`, [userId]);
    return res.json({ message: "تم" });
  } catch (err) {
    console.error("MARK ALL READ ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.removeOne = async (req, res) => {
  const id = String(req.params?.id || "").trim();
  if (!isGuid(id)) return res.status(400).json({ message: "id غير صحيح" });
  const tokenUid = getUserIdFromToken(req);

  try {
    const [result] = tokenUid
      ? await pool.query(`DELETE FROM Notifications WHERE Id = ? AND UserId = ?`, [id, tokenUid])
      : await pool.query(`DELETE FROM Notifications WHERE Id = ?`, [id]);

    if (!result.affectedRows) return res.status(404).json({ message: "الإشعار غير موجود" });
    return res.json({ message: "تم" });
  } catch (err) {
    console.error("REMOVE ONE ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.clearAll = async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) return res.status(400).json({ message: "userId غير صحيح" });

  try {
    await pool.query(`DELETE FROM Notifications WHERE UserId = ?`, [userId]);
    return res.json({ message: "تم" });
  } catch (err) {
    console.error("CLEAR ALL ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};
