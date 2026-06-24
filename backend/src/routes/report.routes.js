// backend/src/routes/report.routes.js
const router = require("express").Router();
const rep = require("../controllers/report.controller");

router.post("/", rep.createReport);
router.get("/my/:userId", rep.getMyReports);
router.get("/department/:departmentId", rep.getDepartmentReports);
router.patch("/:id/status", rep.updateStatus);

module.exports = router;
