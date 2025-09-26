import { Request, Response } from "express";
import multer from "multer";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
let cachedS3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials are not fully configured for file uploads.");
  }

  cachedS3Client = new S3Client({
    apiVersion: "2006-03-01",
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedS3Client;
};

const uploadS3 = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB file size limit
  },
}).array("file");

const waitForUpload = (req: Request, res: Response): Promise<void> => {
  return new Promise((resolve, reject) => {
    uploadS3(req, res, (err: unknown) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export const fileController = {
  fileUpload: async (req: Request, res: Response) => {
    try {
      await waitForUpload(req, res);

      const bucketName = process.env.AWS_S3_BUCKET_NAME?.trim();
      if (!bucketName) {
        res.status(500).json({
          success: false,
          message: "AWS_S3_BUCKET_NAME is not configured.",
        });
        return;
      }

      const files = Array.isArray(req.files) ? req.files : [];

      if (files.length === 0) {
        res.status(400).json({ success: false, message: "No files provided" });
        return;
      }

      const s3Client = getS3Client();
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const timestamp = Date.now();
          const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
          const fileName = `${timestamp}-${sanitizedName}`;
          const params = {
            Bucket: bucketName,
            Key: fileName,
            Body: file.buffer,
            ...(file.mimetype ? { ContentType: file.mimetype } : {}),
          };

          const command = new PutObjectCommand(params);
          await s3Client.send(command);
          return encodeURIComponent(fileName);
        }),
      );

      res.json({ payload: { filesName: uploadedFiles } });
    } catch (error) {
      console.error("File upload failed:", error);
      if (error instanceof multer.MulterError) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(500).json({ success: false, message: "Failed to upload file" });
    }
  },
};
