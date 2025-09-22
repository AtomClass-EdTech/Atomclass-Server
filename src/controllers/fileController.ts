import { Request, Response } from "express";
import multer from "multer";
import * as AWS from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface FileUploadResponse {
  filePath: string;
  successMessage: string;
}

export interface UploadRequest extends Request {
  file: Express.Multer.File;
}

// Upload middleware for S3
const awsRegion = process.env.AWS_REGION;

if (!awsRegion) {
  console.warn("AWS_REGION is not set. File uploads may fail until configured.");
}

const client = new AWS.S3({
  apiVersion: "2006-03-01",
  region: awsRegion || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

const uploadS3 = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB file size limit
  },
}).array("file");

export const fileController = {
  fileUpload: async (req: any, res: Response) => {
    try {
      uploadS3(req, res, async (err: any) => {
        if (err) {
          return res
            .status(500)
            .json({ success: false, message: "Failed to upload" });
        }

        const filesName: string[] = [];
        const bucketName = process.env.AWS_S3_BUCKET_NAME;

        if (!bucketName) {
          return res.status(500).json({
            success: false,
            message: "AWS_S3_BUCKET_NAME is not configured.",
          });
        }
        // File uploaded to S3, get the file path from the response and send it back
        for (const file of req.files) {
          const fileData = file;
          const fileName = `${new Date().getTime()}-${fileData.originalname}`;
          const encodeFileName = encodeURIComponent(fileName);
          const params = {
            Bucket: bucketName,
            Key: fileName,
            Body: fileData.buffer,
          };
          const command = new PutObjectCommand(params);
          await client.send(command);
          filesName.push(encodeFileName);
        }

        res.json({ payload: { filesName } });
      });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to upload File" });
    }
  },
};
