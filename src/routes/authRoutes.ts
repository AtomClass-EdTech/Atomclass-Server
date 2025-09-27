import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { authService } from "../services/authService.js";
import { loginRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", authController.login);
router.post("/signup", authController.signUp);
router.post("/confirm-email", authController.confirmEmail);
router.post("/resend-otp", authController.resendVerificationOtp);
router.post("/refresh-tokens", async (req, res, next) => {
  try {
    const { refreshToken, userIdentifier } = req.body;
    if (!refreshToken || !userIdentifier) {
      return res
        .status(400)
        .json({ error: "userIdentifier and refreshToken are required" });
    }
    const tokens = await authService.refreshTokens(
      userIdentifier,
      refreshToken,
    );
    return res.json({ payload: tokens });
  } catch (err) {
    console.error(err);
    next(err);
  }
});
router.post("/reset-password", authController.resetPassword);
router.post("/forgot-password", authController.forgotPassword);
router.post("/logout", loginRequired, authController.logout);

export { router as authRouter };
