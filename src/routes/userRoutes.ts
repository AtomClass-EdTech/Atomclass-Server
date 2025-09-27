import { Router } from "express";
import { userController } from "../controllers/userController.js";
import { loginRequired, superAdminRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/all-users", [superAdminRequired], userController.getAllUsers);

router.post("/", [loginRequired], userController.updateUser);

router.get("/:userId", userController.getUserById);

export { router as userRouter };