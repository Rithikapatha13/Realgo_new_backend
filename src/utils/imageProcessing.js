import path from "path";
import { fileURLToPath } from "url";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";
import { s3 } from "./aws.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

export async function getS3File(filePath) {
    try {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: filePath,
        };
        const command = new GetObjectCommand(params);
        const response = await s3.send(command);
        return await streamToBuffer(response.Body);
    } catch (err) {
        console.error("Error fetching S3 file:", err);
        throw err;
    }
}

export async function uploadS3File(outputBuffer, filename) {
    try {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Body: outputBuffer,
            // ACL: process.env.AWS_ACL, // Assuming public access or signed URLs
            Key: filename,
        };
        const command = new PutObjectCommand(params);
        const response = await s3.send(command);

        const location = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;

        return {
            success: true,
            status: response.$metadata.httpStatusCode,
            location: location,
        };
    } catch (err) {
        console.error("Error uploading file to S3:", err);
        throw { success: false, status: 400, message: "The file upload failed" };
    }
}

async function cleanupTempFiles(...files) {
    try {
        for (const file of files) {
            await fs.unlink(file).catch(() => { }); // Delete each file, ignore if not found
        }
    } catch (error) {
        console.error("Error during cleanup:", error);
    }
}

function toTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b(\w)/g, (match) => match.toUpperCase());
}

export async function imageOverlay(
    layout,
    avatar,
    user,
    recipientName,
    company,
    selectedTemplate
) {
    try {
        const time = new Date().getTime();

        // We'll process this entirely in memory buffer to avoid extensive file I/O where possible
        // But keeping file logic intact if node memory becomes an issue

        const {
            img: companyImg,
            domain: companyDomain,
            company: companyName,
            primaryColour: companyColor,
        } = company;

        const companyLogoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${companyImg}`;

        // Get layout metadata
        const layoutMetadata = await sharp(layout).metadata();
        const { width, height } = layoutMetadata;

        if (width !== 1080 || (height !== 1080 && height !== 1350)) {
            throw new Error(`Unsupported image dimensions: ${width}x${height}`);
        }

        const isTallLayout = height === 1350;

        const templatePositions = {
            1: { logoLeft: 720, nameLeft: 535, profilePicLeft: 175 },
            2: { logoLeft: 100, nameLeft: 630, profilePicLeft: 890 },
        };
        const { logoLeft, nameLeft, profilePicLeft } = templatePositions[selectedTemplate] || { logoLeft: 50, nameLeft: 380, profilePicLeft: 890 };

        const bgHeight = isTallLayout
            ? selectedTemplate === '2' ? 1190 : 1240
            : selectedTemplate === '2' ? 920 : 970;

        const topImageBuffer = await sharp(layout)
            .extract({ left: 0, top: 0, width, height: bgHeight })
            .jpeg()
            .toBuffer();

        const colorStripBuffer = await sharp({
            create: {
                width,
                height: height - bgHeight,
                channels: 3,
                background: companyColor || "#ffffff",
            },
        })
            .jpeg()
            .toBuffer();

        let combinedImageBuffer = await sharp({
            create: {
                width,
                height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 },
            },
        })
            .composite([
                { input: topImageBuffer, top: 0, left: 0 },
                { input: colorStripBuffer, top: bgHeight, left: 0 },
            ])
            .jpeg()
            .toBuffer();

        // Fetch company logo and resize
        const companyLogoResponse = await fetch(companyLogoUrl);
        const companyLogoArrayBuffer = await companyLogoResponse.arrayBuffer();
        const companyLogoBuffer = Buffer.from(companyLogoArrayBuffer);

        const logosize = isTallLayout ? 250 : 200;
        const resizedCompanyLogo = await sharp(companyLogoBuffer)
            .resize({ width: logosize, height: logosize, fit: "inside" })
            .toBuffer();

        const finalName = (user.userName || user.username || "").split(" ").slice(0, 2).join(" ");
        const fontSize = finalName.length > 15 ? (finalName.length > 23 ? 29 : 35) : 45;
        const textColor = selectedTemplate === '2' ? "#FFFFFF" : "#333";
        const phoneColor = selectedTemplate === '2' ? "#FFFFFF" : "#E61602";

        const svgText = `
    <svg width="${width}" height="160">
      <style>
        .titleName { font-size: ${fontSize}px; font-weight: bold; fill: ${textColor}; text-anchor: middle; dominant-baseline: middle; }
        .titleRole { font-size: 33px; fill: ${textColor}; text-anchor: middle; dominant-baseline: middle; }
        .titlePhone { font-size: 49px; font-weight: bold; fill: ${phoneColor}; text-anchor: middle; dominant-baseline: middle; }
        .website { font-size: 25px; fill: ${textColor}; text-anchor: middle; dominant-baseline: middle; }
      </style>
      <text x="${nameLeft}" y="23%" class="titleName">${toTitleCase(finalName)}</text>
      <text x="${nameLeft}" y="45%" class="titleRole">${toTitleCase(user.role || "")}</text>
      <text x="${nameLeft}" y="75%" class="titlePhone">${user.phone || ""}</text>
      <text x="${nameLeft}" y="93%" class="website">${companyDomain || ""}</text>
    </svg>`;

        // Process Avatar if supplied
        let roundedProfilePic = null;
        if (avatar) {
            roundedProfilePic = await sharp(avatar)
                .resize(155, 145)
                .composite([
                    {
                        input: Buffer.from(
                            `<svg width="155" height="145"><rect x="0" y="0" width="155" height="145" rx="30" ry="30" fill="white"/></svg>`
                        ),
                        blend: "dest-in",
                    },
                ])
                .png({ quality: 70 })
                .toBuffer();
        }

        const profilePicTop = height - 150;

        const composites = [
            { input: resizedCompanyLogo, left: logoLeft, top: height - 140 },
            { input: Buffer.from(svgText), left: 0, top: height - 160 },
        ];

        if (roundedProfilePic) {
            composites.push({ input: roundedProfilePic, left: profilePicLeft, top: profilePicTop });
        }

        let finalCompositeBuffer = await sharp(combinedImageBuffer)
            .composite(composites)
            .jpeg()
            .toBuffer();

        if (recipientName && recipientName.trim() !== "") {
            const greetingSvg = `<svg width="600" height="400"><text x="10%" y="10%" style="font: italic 36px sans-serif;" fill="#001">Dear ${recipientName.toUpperCase()}</text></svg>`;

            finalCompositeBuffer = await sharp(finalCompositeBuffer)
                .composite([{ input: Buffer.from(greetingSvg), left: 40, top: 100 }])
                .jpeg()
                .toBuffer();
        }

        // Upload directly to S3 from buffer
        const filename = `${time}-composite.jpeg`;
        const uploadResult = await uploadS3File(finalCompositeBuffer, `realgo/images/greetings/${filename}`);

        return uploadResult;
    } catch (error) {
        console.error("Error during image overlay:", error);
        return false;
    }
}

// Fallback stubs for other complex methods to be implemented
export async function flyerOverlay(layout, avatar, user, recipientName, company, selectedTemplate) {
    return imageOverlay(layout, avatar, user, recipientName, company, selectedTemplate);
}

export async function portraitOverlay(layout, avatar, user, company, selectedTemplate) {
    return imageOverlay(layout, avatar, user, null, company, selectedTemplate);
}

export async function badgeOverlay(layout, avatar, company) {
    return imageOverlay(layout, avatar, { userName: "Badge", role: "N/A", phone: "" }, null, company, '1');
}

export async function imageToPortraitOverlay(layout, avatar, user, text, company) {
    return imageOverlay(layout, avatar, user, null, company, '1');
}
