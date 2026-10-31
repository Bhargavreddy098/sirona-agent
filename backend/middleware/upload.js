import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import fs from "fs";
import { s3, S3_BUCKET_NAME } from "../config/s3.js";

/* =====================================================================
   File Upload Middleware (S3 with Local Disk Fallback)
   ===================================================================== */

const hasS3Config = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

let storage;

if (hasS3Config) {
  storage = multerS3({
    s3,
    bucket: S3_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname, uploadedBy: req.user?.id || "anonymous" });
    },
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      cb(null, filename);
    },
  });
} else {
  // Local fallback directory
  const localUploadDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, localUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`);
    },
  });
}

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max for code archives and datasets
  },
});

export default upload;
