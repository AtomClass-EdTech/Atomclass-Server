import { Request, Response } from "express";
import { authService } from "../services/authService.js";
import { userService } from "../services/userService.js";
import {
  createToken,
  decodeTokenPayload,
  verifyToken,
} from "../utils/bcryptUtils.js";
import { AppDataSource } from "../config/databaseConfig.js";
import { OtpType, User, UserRole } from "../entities/User.js";
import { OTPService } from "../utils/otp.js";
import { EmailService } from "../utils/emailHelper.js";
import { AuthRequest } from "../types/auth.req.types.js";

const userRepository = AppDataSource.getRepository(User);

const signUp = async (req: Request, res: Response) => {
  const { email, password, fullName } = req.body;

  try {
    if (!email || !password || !fullName) {
      return res.status(400).json({
        error: "Email, password, and full name are required",
      });
    }

    const cognitoUserId = await authService.createUserInCognito(
      email,
      password
    );

    const userData: Partial<User> = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      cognitoId: cognitoUserId,
      role: UserRole.USER,
      isVerified: false,
      isActive: true,
      loginCount: 0,
    };

    const user = await userService.createUserData(userData);

    const otpData = OTPService.createOTPData(OtpType.EMAIL_VERIFICATION);
    user.otp = { ...otpData, type: OtpType.EMAIL_VERIFICATION };
    await userRepository.save(user);

    const emailSent = await EmailService.sendOTP(
      user.email,
      otpData.code!,
      user.fullName ?? user.email,
      "email_verification"
    );

    if (!emailSent.success) {
      return res.status(500).json({
        error: emailSent.message ?? "Failed to send verification email. Please try again.",
      });
    }

    const responseUser = {};

    res.status(200).json({
      message:
        "OTP sent to your email. Please verify to complete registration.",
      user: responseUser,
      otpSent: true,
    });
  } catch (err: unknown) {
    console.error("Signup error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    res.status(500).json({ error: message });
  }
};

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const userInfo = await userService.getUserByEmail(email);
    if (userInfo?.isVerified === false) {
      res.status(403).json({ error: "Please verify your email." });
      return;
    }
    const tokens = await authService.loginUser(email, password);

    if (userInfo) {
      userInfo.lastLogin = new Date();
      userInfo.loginCount += 1;
      await userRepository.save(userInfo);
    }

    const decodedToken = tokens.AccessToken ? decodeTokenPayload(tokens.AccessToken) : undefined;
    res.json({
      tokens,
      user: {
        id: userInfo?.id,
        email: userInfo?.email,
        fullName: userInfo?.fullName,
        role: userInfo?.role,
        isVerified: userInfo?.isVerified,
      },
      username: decodedToken?.username,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
    } else {
      res.status(400).json({ error: "An unexpected error occurred" });
    }
  }
};

const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user = await userService.getUserByEmail(email);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.cognitoId) {
      res
        .status(400)
        .json({ message: "Password reset not applicable for this account." });
      return;
    }

    const resetToken = createToken(user.cognitoId, user.email, "1h");

    const resetLink = `${process.env.PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;

    const emailSent = await EmailService.sendOTP(
      user.email,
      resetLink,
      user.fullName ?? user.email,
      "password_reset"
    );

    if (!emailSent.success) {
      return res.status(500).json({
        error: emailSent.message ?? "Failed to send verification email. Please try again.",
      });
    }

    // res
    //   .status(200)
    //   .json({ message: "Password reset process initiated successfully." });

    res.status(200).json({ resetLink: resetLink });
  } catch (error) {
    console.error("Error during forgot password request:", error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unexpected error occurred" });
    }
  }
};

const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;
  try {
    if (verifyToken(token)) {
      const decodedToken = decodeTokenPayload(token);
      const userId = decodedToken!.userId;

      await authService.resetPassword(userId, password);
      res.json({ message: "Password reset successful" });
    } else {
      res.status(500).json({ message: "Error verifying token" });
      throw new Error("Error verifying token");
    }
  } catch (err) {
    res.status(400).json({ error: err });
  }
};

const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cognitoIdentifier = user.cognitoId ?? user.username;

    if (!cognitoIdentifier) {
      return res.status(400).json({ error: "Unable to determine user identity" });
    }

    const userInfo = await userRepository.findOne({
      where: { cognitoId: cognitoIdentifier },
    });
    if (!userInfo) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create a copy without the OTP field
    const { otp, ...userWithoutOtp } = userInfo;
    res.json({ user: userWithoutOtp });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const confirmEmail = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    await authService.confirmEmail(email, otp);
    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify email";
    const status = error instanceof Error ? 400 : 500;
    return res.status(status).json({ error: message });
  }
};

const resendVerificationOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const lastSentAt = user.otp?.lastSentAt ?? null;
    if (!OTPService.canResendOTP(lastSentAt)) {
      return res
        .status(429)
        .json({ error: "Please wait before requesting another OTP" });
    }

    const otpData = OTPService.createOTPData(OtpType.EMAIL_VERIFICATION);
    user.otp = { ...otpData, type: OtpType.EMAIL_VERIFICATION };
    await userRepository.save(user);

    const emailResult = await EmailService.sendOTP(
      user.email,
      otpData.code!,
      user.fullName ?? user.email,
      "email_verification"
    );

    if (!emailResult.success) {
      return res
        .status(500)
        .json({
          error:
            emailResult.message ?? "Failed to send verification email. Please try again.",
        });
    }

    return res.status(200).json({
      message: "OTP resent successfully",
      otpSent: true,
    });
  } catch (error) {
    console.error("Failed to resend verification OTP:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return res.status(500).json({ error: message });
  }
};

export const authController = {
  signUp,
  login,
  forgotPassword,
  resetPassword,
  getUserById,
  confirmEmail,
  resendVerificationOtp,
};
