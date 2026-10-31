import dotenv from "dotenv";
dotenv.config();

import { S3Client } from "@aws-sdk/client-s3";

/* =====================================================================
   AWS S3 Configuration (AWS SDK v3)
   - Configures S3 client with IAM or environment credentials
   - Supports custom endpoints (MinIO, LocalStack, Cloudflare R2)
   ===================================================================== */

const s3Config = {
  region: process.env.AWS_REGION || "us-east-1",
};

// If explicit credentials are provided in env, pass them
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

// Support custom endpoint (MinIO, R2, LocalStack)
if (process.env.AWS_S3_ENDPOINT) {
  s3Config.endpoint = process.env.AWS_S3_ENDPOINT;
  s3Config.forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === "true";
}

export const s3 = new S3Client(s3Config);
export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET || "sirona-artifacts";

export default s3;
