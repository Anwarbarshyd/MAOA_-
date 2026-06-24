// backend/src/routes/notification.routes.js
const router = require("express").Router();
const n = require("../controllers/notification.controller");

// ✅ قديم (يشتغل مع واجهتك الحالية)
router.get("/my/:userId", n.getMyNotifications);
 router.patch("/my/:userId/read-all", n.markAllRead);
router.delete("/my/:userId", n.clearAll);

// ✅ جديد (لو بتخليه لاحقًا يعتمد على التوكن فقط)
router.get("/my", n.getMyNotifications);
router.patch("/my/read-all", n.markAllRead);
router.delete("/my", n.clearAll);

// عام
 router.patch("/:id/read", n.markRead);
router.delete("/:id", n.removeOne);

module.exports = router;