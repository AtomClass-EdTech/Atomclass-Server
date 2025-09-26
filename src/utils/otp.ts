import crypto from "crypto";
import { OtpType, OTPMetadata } from "../entities/User.js";

export class OTPService {
  static generateOTP(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  }

  static createOTPData(
    type: OtpType, // Use the enum instead of string literals
    expiryMinutes: number = 10
  ): OTPMetadata {
    const now = new Date();

    return {
      code: this.generateOTP(),
      expiresAt: new Date(now.getTime() + expiryMinutes * 60 * 1000),
      attempts: 0,
      lastSentAt: now,
      verified: false,
      type,
    };
  }

  static validateOTP(
    storedOTP: OTPMetadata | null | undefined,
    providedOTP: string
  ): { valid: boolean; message: string } {
    if (!storedOTP) {
      return {
        valid: false,
        message: "No OTP found. Please request a new one.",
      };
    }

    if (storedOTP.verified) {
      return { valid: false, message: "OTP has already been used." };
    }

    if ((storedOTP.attempts ?? 0) >= 5) {
      return {
        valid: false,
        message: "Maximum OTP attempts exceeded. Please request a new one.",
      };
    }

    const expiresAt = this.toDate(storedOTP.expiresAt);
    if (!expiresAt || new Date() > expiresAt) {
      return {
        valid: false,
        message: "OTP has expired. Please request a new one.",
      };
    }

    if (storedOTP.code !== providedOTP) {
      return { valid: false, message: "Invalid OTP. Please try again." };
    }

    return { valid: true, message: "OTP verified successfully." };
  }

  static canResendOTP(
    lastSentAt?: Date | string | null,
    cooldownMinutes: number = 1
  ): boolean {
    const lastSent = this.toDate(lastSentAt);
    if (!lastSent) return true;

    const now = new Date();
    const timeDiff = now.getTime() - lastSent.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    return minutesDiff >= cooldownMinutes;
  }

  static isOtpExpired(otp: OTPMetadata | null | undefined): boolean {
    if (!otp || !otp.expiresAt) {
      return true;
    }

    const expiresAt = this.toDate(otp.expiresAt);
    if (!expiresAt) {
      return true;
    }

    return new Date() > expiresAt;
  }

  private static toDate(value?: Date | string | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
