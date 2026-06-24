// backend/middleware/auth.js
const jwt = require("jsonwebtoken");

exports.requireAuth = (req, res, next) => {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, role, departmentId }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  const r = String(req.user?.role || "").toLowerCase();
  const ok = roles.map(x => String(x).toLowerCase()).includes(r);
  if (!ok) return res.status(403).json({ message: "Forbidden" });
  next();
};