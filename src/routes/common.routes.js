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
      const { id, username, email, image, userType, isAdmin, firstName, lastName, phone, ...details } = req.body;
      const type = (userType || (isAdmin ? "admin" : "user")).toLowerCase();
      
      console.log(`Updating profile for ID: ${id}, Type: ${type}`);

      // Robust date parsing for dob
      let parsedDob = undefined;
      if (details.dob && details.dob.trim() !== "") {
        const dateObj = new Date(details.dob);
        if (!isNaN(dateObj.getTime())) {
          parsedDob = dateObj;
        }
      }

      // Sanitize Enum fields (Gender, BloodGroup)
      const sanitizeEnum = (val, allowed) => {
        if (!val || val.trim() === "") return undefined;
        const upper = val.toUpperCase();
        return allowed.includes(upper) ? upper : undefined;
      };

      // BASE FIELDS (Existent in User, Admin, and ClientAdmin)
      const baseUpdateData = {
        username,
        firstName,
        lastName,
        email,
        phone,
        image,
        fatherOrHusband: details.fatherOrHusband,
        gender: sanitizeEnum(details.gender, ["MALE", "FEMALE", "OTHER"]),
        bloodGroup: sanitizeEnum(details.bloodGroup, ["A_POS", "A_NEG", "B_POS", "B_NEG", "O_POS", "O_NEG", "AB_POS", "AB_NEG"]),
        dob: parsedDob,
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
        country: details.country,
      };

      if (type === "clientadmin") {
        await fastify.prisma.clientAdmin.update({
          where: { id },
          data: {
            ...baseUpdateData,
            pinCode: details.pinCode || details.zipCode
          },
        });
      } else if (type === "admin") {
        await fastify.prisma.admin.update({
          where: { id },
          data: {
            ...baseUpdateData,
            zipCode: details.pinCode || details.zipCode
          },
        });
      } else if (type === "superadmin") {
        await fastify.prisma.superAdmin.update({
          where: { id },
          data: { 
            username, 
            email, 
            phone,
            image,
            firstName,
            lastName
          },
        });
      } else {
        // Default to USER table
        await fastify.prisma.user.update({
          where: { id },
          data: {
            ...baseUpdateData,
            pinCode: details.pinCode || details.zipCode
          },
        });
      }

      return res.code(200).send({
        success: true,
        message: "Profile Updated Successfully",
      });
    } catch (error) {
      console.error("❌ Error updating profile:", error);
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
