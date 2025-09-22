import { Router } from "express";
import { fileController } from "../controllers/fileController.js";

const router = Router();

router.post("/upload", fileController.fileUpload);

export { router as fileRouter };
