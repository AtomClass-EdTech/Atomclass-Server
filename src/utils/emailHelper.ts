import { EMAIL_TEMPLATES } from "../constants/emailTemplates.js";
import { AWSUtils } from "./aws.js";

const DEFAULT_FROM_EMAIL = process.env.SES_FROM_EMAIL || "hello@atomclass.com";

type TemplateKey = keyof typeof EMAIL_TEMPLATES;

type EmailResult = {
  success: boolean;
  message: string;
  error?: unknown;
};

const templateNameFor = (key: TemplateKey): string =>
  EMAIL_TEMPLATES[key].TemplateName;

const ensureArray = (value: string | string[]): string[] =>
  Array.isArray(value) ? value : [value];

export class EmailService {
  private static async sendTemplate(
    templateKey: TemplateKey,
    to: string | string[],
    templateData: Record<string, unknown>,
    from: string = DEFAULT_FROM_EMAIL
  ): Promise<EmailResult> {
    try {
      await AWSUtils.sendEmail(
        from,
        ensureArray(to),
        templateNameFor(templateKey),
        templateData
      );
      return {
        success: true,
        message: `Email sent using template '${templateKey}'`,
      };
    } catch (error) {
      console.error(
        `Failed to send email using template '${templateKey}':`,
        error
      );
      return {
        success: false,
        message: `Failed to send email using template '${templateKey}'`,
        error,
      };
    }
  }

  static async sendEmailVerification(
    email: string,
    otp: string,
    name: string,
    expiryMinutes: number = 10
  ): Promise<EmailResult> {
    return EmailService.sendTemplate("EMAIL_VERIFICATION_OTP", email, {
      name,
      otp,
      expiryMinutes: expiryMinutes.toString(),
    });
  }

  static async sendPasswordResetRequest(
    email: string,
    name: string,
    resetLink: string,
    token: string,
    expiryMinutes: number = 60
  ): Promise<EmailResult> {
    return EmailService.sendTemplate("PASSWORD_RESET_REQUEST_TOKEN", email, {
      name,
      resetLink,
      token,
      expiryMinutes: expiryMinutes.toString(),
    });
  }

  static async sendPasswordResetSuccess(
    email: string,
    name: string
  ): Promise<EmailResult> {
    return EmailService.sendTemplate("PASSWORD_RESET_SUCCESS", email, { name });
  }
}
