// backend/src/controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../../db");

const normEmail = (v) => String(v || "").trim().toLowerCase();
const onlyDigits = (v) => String(v || "").replace(/[^\d]/g, "");
const normRole = (v) => String(v || "user").trim().toLowerCase();

function ensureJwtSecret() {
  const s = String(process.env.JWT_SECRET || "").trim();
  if (!s) throw new Error("JWT_SECRET is missing in .env");
  return s;
}

exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, nationalId, password } = req.body || {};

    const FullName = String(fullName || "").trim();
    const Email = normEmail(email);
    const Phone = onlyDigits(phone);
    const NationalId = onlyDigits(nationalId);
    const Password = String(password || "");

    if (!FullName || FullName.length < 6)
      return res.status(400).json({ message: "الاسم غير صحيح" });
    if (!Email) return res.status(400).json({ message: "البريد مطلوب" });
    if (!Phone) return res.status(400).json({ message: "رقم الجوال مطلوب" });
    if (!Password) return res.status(400).json({ message: "كلمة المرور مطلوبة" });

    const [rows] = await pool.query(
      `SELECT UserId FROM UsersProfile WHERE LOWER(TRIM(Email)) = ? LIMIT 1`,
      [Email]
    );

    if (rows.length) return res.status(409).json({ message: "البريد مستخدم من قبل" });

    const hash = await bcrypt.hash(Password, 10);

    await pool.query(
      `INSERT INTO UsersProfile
         (UserId, FullName, Phone, Role, DepartmentId, IsActive, CreatedAt, Email, NationalId, PasswordHash, NotificationsEnabled)
       VALUES
         (UUID(), ?, ?, 'user', NULL, 1, NOW(), ?, ?, ?, 1)`,
      [FullName, Phone, Email, NationalId || null, hash]
    );

    return res.status(201).json({ message: "تم إنشاء الحساب بنجاح" });
  } catch (err) {
    if (err?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "البريد مستخدم من قبل" });
    }
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const Email = normEmail(email);
    const Password = String(password || "");

    if (!Email || !Password)
      return res.status(400).json({ message: "أدخل البريد وكلمة المرور" });

    const [rows] = await pool.query(
      `SELECT UserId, FullName, Phone, Role, DepartmentId, IsActive, Email, NationalId, PasswordHash
       FROM UsersProfile
       WHERE LOWER(TRIM(Email)) = ?
       LIMIT 1`,
      [Email]
    );

    const u = rows[0];
    if (!u) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    if (u.IsActive === false || u.IsActive === 0)
      return res.status(403).json({ message: "الحساب موقوف" });

    const passwordHash = String(u.PasswordHash || "");
    let ok = false;

    if (/^\$2[aby]\$\d{2}\$/.test(passwordHash)) {
      ok = await bcrypt.compare(Password, passwordHash);
    } else {
      // دعم ترحيل حسابات قديمة عندما يكون الحقل مخزنًا كنص صريح
      if (Password === passwordHash) {
        ok = true;
        const newHash = await bcrypt.hash(Password, 10);
        await pool.query(`UPDATE UsersProfile SET PasswordHash = ? WHERE UserId = ?`, [newHash, u.UserId]);
      }
    }

    if (!ok) return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });

    const role = normRole(u.Role);
    const jwtSecret = ensureJwtSecret();

    const token = jwt.sign(
      { userId: u.UserId, role, departmentId: u.DepartmentId },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        userId: u.UserId,
        fullName: u.FullName,
        email: u.Email,
        phone: u.Phone,
        nationalId: u.NationalId,
        role,
        departmentId: u.DepartmentId,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    const Email = normEmail(email);
    if (!Email) return res.status(400).json({ message: "البريد مطلوب" });

    const [rows] = await pool.query(
      `SELECT UserId, IsActive FROM UsersProfile WHERE LOWER(TRIM(Email)) = ? LIMIT 1`,
      [Email]
    );

    const u = rows[0];
    if (!u) return res.status(404).json({ message: "البريد غير موجود" });
    if (u.IsActive === false || u.IsActive === 0)
      return res.status(403).json({ message: "الحساب موقوف" });

    const resetToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = await bcrypt.hash(resetToken, 10);
    const expiresMinutes = 15;

    await pool.query(
      `INSERT INTO PasswordResetTokens (Id, UserId, TokenHash, ExpiresAt, CreatedAt)
       VALUES (UUID(), ?, ?, ?, NOW())`,
      [u.UserId, tokenHash, new Date(Date.now() + expiresMinutes * 60 * 1000)]
    );

    return res.json({
      message: "تم إنشاء طلب استعادة كلمة المرور",
      resetToken,
      expiresInMinutes: expiresMinutes,
    });
  } catch (err) {
    console.error("FORGOT ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  let conn;
  try {
    const { email, resetToken, newPassword } = req.body || {};
    const Email = normEmail(email);
    const Token = String(resetToken || "").trim();
    const PW = String(newPassword || "");

    if (!Email || !Token || !PW) return res.status(400).json({ message: "البيانات ناقصة" });
    if (PW.length < 8) return res.status(400).json({ message: "كلمة المرور ضعيفة (8+)" });

    const [userRows] = await pool.query(
      `SELECT UserId, IsActive FROM UsersProfile WHERE LOWER(TRIM(Email)) = ? LIMIT 1`,
      [Email]
    );

    const u = userRows[0];
    if (!u) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (u.IsActive === false || u.IsActive === 0)
      return res.status(403).json({ message: "الحساب موقوف" });

    const [tokenRows] = await pool.query(
      `SELECT Id, TokenHash FROM PasswordResetTokens
       WHERE UserId = ? AND UsedAt IS NULL AND ExpiresAt > NOW()
       ORDER BY CreatedAt DESC LIMIT 1`,
      [u.UserId]
    );

    const t = tokenRows[0];
    if (!t) return res.status(400).json({ message: "لا يوجد توكن صالح. اطلب توكن جديد." });

    const ok = await bcrypt.compare(Token, String(t.TokenHash));
    if (!ok) return res.status(400).json({ message: "رمز الاستعادة غير صحيح" });

    const newHash = await bcrypt.hash(PW, 10);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.query(`UPDATE UsersProfile SET PasswordHash = ? WHERE UserId = ?`, [newHash, u.UserId]);
    await conn.query(`UPDATE PasswordResetTokens SET UsedAt = NOW() WHERE Id = ?`, [t.Id]);

    await conn.commit();
    return res.json({ message: "تم تحديث كلمة المرور بنجاح" });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  } finally {
    if (conn) conn.release();
  }
};