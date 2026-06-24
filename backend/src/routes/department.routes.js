// backend/src/routes/department.routes.js
const router = require("express").Router();
const dept = require("../controllers/department.controller");

router.get("/", dept.getDepartments);

module.exports = router;
