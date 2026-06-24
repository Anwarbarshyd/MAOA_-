const router = require("express").Router();
const admin = require("../controllers/admin.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth, requireRole("admin"));

router.get("/dashboard-stats", admin.getStats);
router.get("/managers", admin.listManagers);
router.post("/managers", admin.createManager);

router.patch("/managers/:userId", admin.updateManager);
router.put("/managers/:userId", admin.updateManager);

router.delete("/managers/:userId", admin.deleteManager);

module.exports = router;