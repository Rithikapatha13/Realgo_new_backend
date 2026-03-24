import "dotenv/config";
import { S3Client } from "@aws-sdk/client-s3";

console.log("Initializing S3 Client with Region:", process.env.AWS_REGION);
export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
