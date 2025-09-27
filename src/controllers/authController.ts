import { Request, Response } from "express";
import { authService } from "../services/authService.js";
import { userService } from "../services/userService.js";
import {
  createToken,
  decodeTokenPayload,
  verifyToken,
} from "../utils/bcryptUtils.js";
import { AppDataSource } from "../config/databaseConfig.js";
import { OtpType, User } from "../entities/User.js";
import type { UserDevice } from "../entities/UserDevice.js";
import { OTPService } from "../utils/otp.js";
import { EmailService } from "../utils/emailHelper.js";
import { AuthRequest } from "../types/auth.req.types.js";
import {
  getNormalizedCognitoGroups,
  readCognitoGroupsFromPayload,
} from "../utils/cognitoGroups.js"; 
import {
  deriveDeviceId,
  userDeviceService,
} from "../services/userDeviceService.js";
import { DeviceLimitExceededError } from "../errors/device-limit-exceeded.js";

const userRepository = AppDataSource.getRepository(User);

const extractClientIp = (req: Request): string | null => {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]?.trim() ?? null;
  }

  return req.socket?.remoteAddress ?? req.ip ?? null;
};

const signUp = async (req: Request, res: Response) => {
  const { email, password, fullName, role } = req.body;

  try {
    if (!email || !password || !fullName) {
      return res.status(400).json({
        error: "Email, password, and full name are required",
      });
    }

    const cognitoUserId = await authService.createUserInCognito(
      email,
      password,
      role === "SUPER_ADMIN" ? "Super-Admin":"User"
    );

    const userData: Partial<User> = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      cognitoId: cognitoUserId,
      role,
      isVerified: false,
      isActive: true,
      loginCount: 0,
    };

    const user = await userService.createUserData(userData);

    const otpData = OTPService.createOTPData(OtpType.EMAIL_VERIFICATION);
    user.otp = { ...otpData, type: OtpType.EMAIL_VERIFICATION };
    await userRepository.save(user);

    const emailSent = await EmailService.sendEmailVerification(
      user.email,
      otpData.code!,
      user.fullName ?? user.email
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
  const deviceIdFromBody = typeof req.body.deviceId === "string" ? req.body.deviceId : undefined;
  const deviceNameFromBody =
    typeof req.body.deviceName === "string" ? req.body.deviceName.trim() : undefined;

  try {
    const userInfo = await userService.getUserByEmail(email);

    if (userInfo?.isVerified === false) {
      res.status(403).json({ error: "Please verify your email." });
      return;
    }

    console.log("userInfo?.status", userInfo?.status)
    if (userInfo?.status === "SUSPENDED") {
      res.status(403).json({ error: "Your account has been suspended. Please contact support." });
      return;
    }

    const userAgent = req.get("user-agent") ?? null;
    const ipAddress = extractClientIp(req);
    const resolvedDeviceId = deriveDeviceId({
      providedDeviceId: deviceIdFromBody,
      userAgent,
      ipAddress,
    });

    if (userInfo?.id) {
      try {
        await userDeviceService.ensureDeviceCanLogin({
          userId: userInfo.id,
          deviceId: resolvedDeviceId,
        });
      } catch (deviceError) {
        if (deviceError instanceof DeviceLimitExceededError) {
          await userRepository.update(userInfo.id,{
            status:"SUSPENDED"
          })
          
          res
            .status(403)
            .json({ error: deviceError.message, code: "DEVICE_LIMIT_REACHED" });
          return;
        }

        throw deviceError;
      }
    }

    const tokens = await authService.loginUser(email, password);

    let deviceRecord: UserDevice | null = null;
    let activeDeviceCount: number | undefined;

    if (userInfo) {
      userInfo.lastLogin = new Date();
      userInfo.loginCount += 1;
      userInfo.lastLoginIp = ipAddress;
      userInfo.lastLoginUserAgent = userAgent;
      await userRepository.save(userInfo);

      deviceRecord = await userDeviceService.recordSuccessfulLogin({
        userId: userInfo.id,
        deviceId: resolvedDeviceId,
        deviceName: deviceNameFromBody,
        userAgent,
        ipAddress,
      });

      activeDeviceCount = await userDeviceService.getActiveDeviceCount(userInfo.id);
    }

    const decodedToken = tokens.AccessToken
      ? decodeTokenPayload(tokens.AccessToken)
      : undefined;
    const decodedPayload = decodedToken && typeof decodedToken === "object"
      ? (decodedToken as Record<string, unknown>)
      : undefined;
    const cognitoGroups = decodedPayload
      ? readCognitoGroupsFromPayload(decodedPayload)
      : [];
    const normalizedGroups = decodedPayload
      ? getNormalizedCognitoGroups(decodedPayload)
      : [];

    res.json({
      tokens,
      user: {
        id: userInfo?.id,
        email: userInfo?.email,
        fullName: userInfo?.fullName,
        role: userInfo?.role,
        isVerified: userInfo?.isVerified,
        cognitoGroups,
        normalizedGroups,
      },
      device: deviceRecord
        ? {
            id: deviceRecord.deviceId,
            name: deviceRecord.deviceName,
            lastSeen: deviceRecord.lastSeen,
          }
        : undefined,
      activeDeviceCount,
      username: decodedToken?.username,
      cognitoGroups,
      normalizedGroups,
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

    const emailSent = await EmailService.sendPasswordResetRequest(
      user.email,
      user.fullName ?? user.email,
      resetLink,
      resetToken,
      60
    );

    if (!emailSent.success) {
      return res.status(500).json({
        error: emailSent.message ?? "Failed to send verification email. Please try again.",
      });
    }

    res.status(200).json({
      message: "Password reset instructions have been sent if the email exists.",
    });
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
    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    const decodedToken = verifyToken(token);

    if (!decodedToken?.userId) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    await authService.resetPassword(decodedToken.userId, password);

    const userRecord = await userRepository.findOne({
      where: { email: decodedToken.email.toLowerCase() },
    });

    const resetSuccessEmail = await EmailService.sendPasswordResetSuccess(
      decodedToken.email,
      userRecord?.fullName ?? decodedToken.email
    );

    if (!resetSuccessEmail.success) {
      console.warn(
        "Password reset succeeded but confirmation email failed:",
        resetSuccessEmail.error
      );
    }

    res.json({ message: "Password reset successful" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password";
    res.status(400).json({ error: message });
  }
};

const logout = async (req: AuthRequest, res: Response) => {
  try {
    const authenticatedUser = req.user;

    if (!authenticatedUser?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const deviceIdFromBody =
      typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : undefined;
    const userAgent = req.get("user-agent") ?? null;
    const ipAddress = extractClientIp(req);
    const resolvedDeviceId = deriveDeviceId({
      providedDeviceId: deviceIdFromBody,
      userAgent,
      ipAddress,
    });

    const deviceRecord = await userDeviceService.recordLogout({
      userId: authenticatedUser.id,
      deviceId: resolvedDeviceId,
    });

    const activeDeviceCount = await userDeviceService.getActiveDeviceCount(
      authenticatedUser.id,
    );

    res.json({
      success: true,
      device: deviceRecord
        ? {
            id: deviceRecord.deviceId,
            lastSeen: deviceRecord.lastSeen,
          }
        : null,
      activeDeviceCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to logout";
    res.status(500).json({ error: message });
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

    const emailResult = await EmailService.sendEmailVerification(
      user.email,
      otpData.code!,
      user.fullName ?? user.email
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
  logout,
  getUserById,
  confirmEmail,
  resendVerificationOtp,
};
