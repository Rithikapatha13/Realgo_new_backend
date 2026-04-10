import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { s3 } from "../utils/aws.js";

export default async function commonRoutes(fastify) {
  fastify.post("/presigned-url", async (req, res) => {
    try {
      const { fileType } = req.body;
      console.log("Presigned URL request for fileType:", fileType);

      if (!fileType) {
        return res.code(400).send({ success: false, message: "fileType is required" });
      }

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
      console.error("❌ Error generating presigned URL:", err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  fastify.post("/update-profile", async (req, res) => {
    try {
      const { id, username, email, image, userType, isAdmin, ...details } = req.body;
      const type = (userType || (isAdmin ? "admin" : "user")).toLowerCase();

      const updateData = {
        username,
        email,
        image,
        fatherOrHusband: details.fatherOrHusband,
        gender: details.gender,
        bloodGroup: details.bloodGroup,
        dob: details.dob ? new Date(details.dob) : undefined,
        aadharNo: details.aadharNo,
        panNo: details.panNo,
        bankName: details.bankName,
        bankAccountNo: details.bankAccountNo,
        ifsc: details.ifsc,
        branch: details.branch,
        accountHolder: details.accountHolder,
        nomineeName: details.nomineeName,
        nomineePhone: details.nomineePhone,
        nomineeRelation: details.nomineeRelation,
        city: details.city,
        state: details.state,
        pinCode: details.pinCode || details.zipCode,
        country: details.country,
      };

      if (type === "clientadmin") {
        await fastify.prisma.clientAdmin.update({
          where: { id },
          data: updateData,
        });
      } else if (type === "admin") {
        await fastify.prisma.admin.update({
          where: { id },
          data: updateData,
        });
      } else if (type === "superadmin") {
        await fastify.prisma.superAdmin.update({
          where: { id },
          data: { username, email, image },
        });
      } else {
        await fastify.prisma.user.update({
          where: { id },
          data: updateData,
        });
      }

      return res.code(200).send({
        success: true,
        message: "Profile Updated Successfully",
      });
    } catch (error) {
      console.log(error);
      return res.code(500).send({ success: false, error: error.message || error });
    }
  });

  fastify.get("/proxy-image", async (req, res) => {
    try {
      const { url, filename } = req.query;
      if (!url) return res.code(400).send({ error: "URL is required" });

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

      const contentType = response.headers.get("content-type");
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.header("Content-Type", contentType);
      res.header("Access-Control-Allow-Origin", "*"); // Ensure CORS is allowed from our own proxy if needed
      if (filename) {
        res.header("Content-Disposition", `attachment; filename="${filename}"`);
      }
      return res.send(buffer);
    } catch (error) {
      console.error("Proxy Error:", error);
      return res.code(500).send({ error: error.message });
    }
  });
}
