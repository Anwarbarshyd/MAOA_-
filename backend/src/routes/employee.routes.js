const router = require("express").Router();
const employee = require("../controllers/employee.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("employee"));

router.get("/stats", employee.getStats);
router.get("/reports", employee.listReports);
router.get("/reports/:id", employee.getReportDetails);
router.patch("/reports/:id/status", employee.updateReportStatus);

module.exports = router;