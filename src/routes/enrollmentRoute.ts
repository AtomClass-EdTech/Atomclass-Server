// routes/enrollment.routes.ts
import { Router } from "express";
import { EnrollmentController } from "../controllers/enrollmentController.js";

const router = Router();

router.get("/", EnrollmentController.getAll);
router.get("/:id", EnrollmentController.getById);
router.post("/", EnrollmentController.create);
router.put("/:id", EnrollmentController.update);
router.delete("/:id", EnrollmentController.delete);

export { router as enrollmentRouter };
