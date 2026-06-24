const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadsPath = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsPath),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || "") || (file.mimetype?.includes("video") ? ".mp4" : ".jpg");
    const name = `f_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

exports.uploadSingle = (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed" });
    if (!req.file) return res.status(400).json({ message: "لم يتم إرسال ملف" });

    const type = req.file.mimetype?.startsWith("video") ? "video" : "image";
    const fileUrl = `/uploads/${req.file.filename}`;

    return res.json({
      message: "Uploaded",
      fileUrl,
      type,
      mime: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
    });
  });
};
