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
router.post("/new", courseController.createCourse);
router.get("/getall", courseController.getAllCourses);
router.get("/get-single/:id", courseController.getCourseById);
router.put("/update/:id", courseController.updateCourse);
router.delete("/delete/:id", courseController.deleteCourse);
router.delete("/delete-permanent/:id", courseController.hardDeleteCourse);

// Course Content Operations
router.post("/:id/content", courseController.addCourseContent);
router.put("/:id/content/:contentId", courseController.updateCourseContent);
router.delete("/:id/content/:contentId", courseController.deleteCourseContent);

// Review Operations
router.post("/courses/:id/reviews", courseController.addReview);
router.post("/courses/:id/reviews/:reviewId/replies", courseController.addReviewReply);

// Statistics
router.get("/:id/stats", courseController.getCourseStats);

export { router as courseRouter };
