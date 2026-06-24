// backend/src/controllers/department.controller.js
const pool = require("../../db");

exports.getDepartments = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT Id, Name, CreatedAt FROM Departments ORDER BY CreatedAt DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error("GET DEPARTMENTS ERROR:", err);
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};
