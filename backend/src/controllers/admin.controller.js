// backend/src/controllers/admin.controller.js
const bcrypt = require("bcryptjs");
const pool = require("../../db");

// إحصائيات الأدمن
exports.getStats = async (req, res) => {
  try {
    // إجمالي + حسب الحالة
    const [statsRows] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN LOWER(TRIM(Status)) = 'in_progress' THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN LOWER(TRIM(Status)) = 'accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN LOWER(TRIM(Status)) = 'rejected' THEN 1 ELSE 0 END) AS rejected
      FROM Reports
    `);

    // توزيع حسب الجهات
    const [byDeptRows] = await pool.query(`
      SELECT
        d.Id AS id,
        d.Name AS name,
        COUNT(r.Id) AS total,
        SUM(CASE WHEN LOWER(TRIM(r.Status)) = 'in_progress' THEN 1 ELSE 0 END) AS inProgress,
        SUM(CASE WHEN LOWER(TRIM(r.Status)) = 'accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN LOWER(TRIM(r.Status)) = 'rejected' THEN 1 ELSE 0 END) AS rejected
      FROM Departments d
      LEFT JOIN Reports r ON r.DepartmentId = d.Id
      GROUP BY d.Id, d.Name
      ORDER BY total DESC
    `);

    const s = statsRows?.[0] || {};
    return res.json({
      totalReports: Number(s.total || 0),
      inProgress: Number(s.inProgress || 0),
      accepted: Number(s.accepted || 0),
      rejected: Number(s.rejected || 0),
      departments: byDeptRows || [],
    });
  } catch (err) {
    console.error("ADMIN STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.listManagers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT UserId, FullName, Email, Phone, Role, DepartmentId, IsActive, CreatedAt
      FROM UsersProfile
      WHERE LOWER(TRIM(Role)) = 'manager'
      ORDER BY CreatedAt DESC
    `);

    return res.json({ items: rows || [] });
  } catch (err) {
    console.error("LIST MANAGERS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// إضافة مدير
exports.createManager = async (req, res) => {
  try {
    const { fullName, email, phone, password, departmentId } = req.body || {};

    const FullName = String(fullName || "").trim();
    const Email = String(email || "").trim().toLowerCase();
    const Phone = String(phone || "").replace(/[^\d]/g, "");
    const Password = String(password || "");

    if (!FullName || FullName.length < 3) return res.status(400).json({ message: "الاسم غير صحيح" });
    if (!Email) return res.status(400).json({ message: "البريد مطلوب" });
    if (!Password || Password.length < 6) return res.status(400).json({ message: "كلمة المرور ضعيفة" });

    // تأكد البريد مو مستخدم
    const [existsRows] = await pool.query(
      `SELECT UserId FROM UsersProfile WHERE LOWER(TRIM(Email)) = ? LIMIT 1`,
      [Email]
    );
    if (existsRows.length) return res.status(409).json({ message: "البريد مستخدم من قبل" });

    // لو departmentId مرسل، تأكد الجهة موجودة
    if (departmentId) {
      const [deptRows] = await pool.query(
        `SELECT Id FROM Departments WHERE Id = ? LIMIT 1`,
        [departmentId]
      );
      if (!deptRows.length) {
        return res.status(400).json({ message: "الجهة غير موجودة" });
      }
    }

    const hash = await bcrypt.hash(Password, 10);

    await pool.query(
      `INSERT INTO UsersProfile
         (UserId, FullName, Phone, Role, DepartmentId, IsActive, CreatedAt, Email, NationalId, PasswordHash, NotificationsEnabled)
       VALUES
         (UUID(), ?, ?, 'manager', ?, 1, NOW(), ?, NULL, ?, 1)`,
      [FullName, Phone || "", departmentId || null, Email, hash]
    );

    return res.status(201).json({ message: "تم إنشاء مدير بنجاح" });
  } catch (err) {
    console.error("CREATE MANAGER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// تعديل مدير
exports.updateManager = async (req, res) => {
  try {
    const { userId } = req.params || {};
    if (!userId) return res.status(400).json({ message: "userId required" });

    // تأكد أنه مدير موجود
    const [currentRows] = await pool.query(
      `SELECT UserId, Email, Role FROM UsersProfile
       WHERE UserId = ? AND LOWER(TRIM(Role)) = 'manager' LIMIT 1`,
      [userId]
    );

    if (!currentRows.length) {
      return res.status(404).json({ message: "المدير غير موجود" });
    }

    const fullNameRaw = req.body?.fullName;
    const emailRaw = req.body?.email;
    const phoneRaw = req.body?.phone;
    const passwordRaw = req.body?.password;
    const departmentIdRaw = req.body?.departmentId;

    const FullName = fullNameRaw !== undefined ? String(fullNameRaw || "").trim() : undefined;
    const Email = emailRaw !== undefined ? String(emailRaw || "").trim().toLowerCase() : undefined;
    const Phone = phoneRaw !== undefined ? String(phoneRaw || "").replace(/[^\d]/g, "") : undefined;
    const Password = passwordRaw !== undefined ? String(passwordRaw || "") : undefined;
    const DepartmentId = departmentIdRaw !== undefined ? (departmentIdRaw ? String(departmentIdRaw) : null) : undefined;

    if (FullName !== undefined && FullName.length < 3) {
      return res.status(400).json({ message: "الاسم غير صحيح" });
    }
    if (Email !== undefined) {
      if (!Email) return res.status(400).json({ message: "البريد مطلوب" });

      const [dupRows] = await pool.query(
        `SELECT UserId FROM UsersProfile WHERE LOWER(TRIM(Email)) = ? AND UserId <> ? LIMIT 1`,
        [Email, userId]
      );
      if (dupRows.length) return res.status(409).json({ message: "البريد مستخدم من قبل" });
    }

    if (DepartmentId !== undefined && DepartmentId !== null) {
      const [deptRows] = await pool.query(
        `SELECT Id FROM Departments WHERE Id = ? LIMIT 1`,
        [DepartmentId]
      );
      if (!deptRows.length) {
        return res.status(400).json({ message: "الجهة غير موجودة" });
      }
    }

    let PasswordHash = undefined;
    if (Password !== undefined && Password !== "") {
      if (Password.length < 6) return res.status(400).json({ message: "كلمة المرور ضعيفة" });
      PasswordHash = await bcrypt.hash(Password, 10);
    }

    const hasAny =
      FullName !== undefined ||
      Email !== undefined ||
      Phone !== undefined ||
      DepartmentId !== undefined ||
      PasswordHash !== undefined;

    if (!hasAny) return res.status(400).json({ message: "لا يوجد حقول للتعديل" });

    const sets = [];
    const vals = [];

    if (FullName !== undefined) { sets.push("FullName = ?"); vals.push(FullName); }
    if (Email !== undefined) { sets.push("Email = ?"); vals.push(Email); }
    if (Phone !== undefined) { sets.push("Phone = ?"); vals.push(Phone || ""); }
    if (DepartmentId !== undefined) { sets.push("DepartmentId = ?"); vals.push(DepartmentId); }
    if (PasswordHash !== undefined) { sets.push("PasswordHash = ?"); vals.push(PasswordHash); }

    vals.push(userId);

    await pool.query(
      `UPDATE UsersProfile SET ${sets.join(", ")}
       WHERE UserId = ? AND LOWER(TRIM(Role)) = 'manager'`,
      vals
    );

    return res.json({ message: "تم تحديث بيانات المدير" });
  } catch (err) {
    console.error("UPDATE MANAGER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// حذف مدير
exports.deleteManager = async (req, res) => {
  try {
    const { userId } = req.params || {};
    if (!userId) return res.status(400).json({ message: "userId required" });

    await pool.query(
      `DELETE FROM UsersProfile WHERE UserId = ? AND LOWER(TRIM(Role)) = 'manager'`,
      [userId]
    );

    return res.json({ message: "تم الحذف" });
  } catch (err) {
    console.error("DELETE MANAGER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};