import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { authService } from "../services/authService.js";

const router = Router();

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/refreshTokens", async (req, res, next) => {
  try {
    const tokens = await authService.refreshTokens(req.body.refreshToken);
    res.json({ payload: tokens });
  } catch (err) {
    console.error(err);
    next(err);
  }
});
router.post("/resetPassword", authController.resetPassword);
router.post("/forgotPassword", authController.forgotPassword);
router.get("/confirmEmail", authController.confirmEmail);

export { router as authRouter };
