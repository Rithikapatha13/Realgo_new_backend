import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { s3 } from "../utils/aws.js";

export default async function commonRoutes(fastify) {
  fastify.post("/presigned-url", async (req, res) => {
    try {
      const { fileType } = req.body;

      const ext = fileType.split("/")[1];
      const key = `realgo/images/${crypto.randomUUID()}.${ext}`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: 60 * 5,
      });

      const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      return res.code(200).send({
        success: true,
        uploadUrl,
        fileUrl,
      });
    } catch (err) {
      console.error(err);
      return res.code(500).send({ success: false });
    }
  });

  fastify.post("/update-profile", async (req, res) => {
    try {
      const { id, username, email, image, isAdmin } = req.body;

      if (isAdmin) {
        await fastify.prisma.admin.update({
          where: { id },
          data: { username, email, image },
        });
      } else {
        await fastify.prisma.user.update({
          where: { id },
          data: { username, email, image },
        });
      }

      return res.code(200).send({
        success: true,
        message: "Profile Updated Successfully",
      });
    } catch (error) {
      console.log(error);
      return res.code(500).send({ success: false, error });
    }
  });
}
