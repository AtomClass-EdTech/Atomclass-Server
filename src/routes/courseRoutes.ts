import { Router } from "express";
import { courseController } from "../controllers/courseController.js";
// import { validate } from "../middlewares/validate.js";
// import {
//   createCourseSchema,
//   updateCourseSchema,
//   addCourseContentSchema,
//   addReviewSchema,
//   addReviewReplySchema,
// } from "../validations/courseValidation.js";

const router = Router();

// Basic CRUD Operations
router.post("/courses", courseController.createCourse);
router.get("/courses", courseController.getAllCourses);
router.get("/courses/:id", courseController.getCourseById);
router.put("/courses/:id", courseController.updateCourse);
router.delete("/courses/:id", courseController.deleteCourse);
router.delete("/courses/:id/permanent", courseController.hardDeleteCourse);

// Course Content Operations
router.post("/courses/:id/content", courseController.addCourseContent);
router.put("/courses/:id/content/:contentId", courseController.updateCourseContent);
router.delete("/courses/:id/content/:contentId", courseController.deleteCourseContent);

// Review Operations
router.post("/courses/:id/reviews", courseController.addReview);
router.post("/courses/:id/reviews/:reviewId/replies", courseController.addReviewReply);

// Statistics
router.get("/courses/:id/stats", courseController.getCourseStats);

export { router as courseRouter };
