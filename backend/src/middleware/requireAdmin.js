module.exports = function requireAdmin(req, res, next) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token !== "dummy-token-admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};