/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SESClient,
  SendTemplatedEmailCommand,
  CreateTemplateCommand,
  
  UpdateTemplateCommand,
  DeleteTemplateCommand,
  ListTemplatesCommand,
} from "@aws-sdk/client-ses";
import { EMAIL_TEMPLATES } from "../constants/emailTemplates.js";

const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const AWSUtils = {
  createTemplate: async (
    templateConfig: any
  ) => {
    try {
      const command = new CreateTemplateCommand({
        Template: templateConfig,
      });

      await ses.send(command);
      console.log(
        `Template '${templateConfig.TemplateName}' created successfully`
      );
      return true;
    } catch (error: any) {
      if (error.name === "AlreadyExistsException") {
        console.log(
          `Template '${templateConfig.TemplateName}' already exists`
        );
        return true;
      }
      console.error(
        `Error creating template '${templateConfig.TemplateName}':`,
        error.message
      );
      return false;
    }
  },

  updateTemplate: async (
    templateConfig: typeof EMAIL_TEMPLATES.EMAIL_VERIFICATION_OTP
  ) => {
    try {
      const command = new UpdateTemplateCommand({
        Template: templateConfig,
      });

      await ses.send(command);
      console.log(
        `Template '${templateConfig.TemplateName}' updated successfully`
      );
      return true;
    } catch (error: any) {
      console.error(
        `Error updating template '${templateConfig.TemplateName}':`,
        error.message
      );
      return false;
    }
  },

  initializeTemplates: async () => {
    console.log("Initializing email templates...");

    const templates = Object.values(EMAIL_TEMPLATES);
    const results = [];

    for (const template of templates) {
      const created = await AWSUtils.createTemplate(template);
      results.push({ name: template.TemplateName, success: created });
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `Templates initialized: ${successCount}/${results.length} successful`
    );

    return results;
  },

  listTemplates: async () => {
    try {
      const command = new ListTemplatesCommand({});
      const response = await ses.send(command);

      console.log(
        "Existing templates:",
        response.TemplatesMetadata?.map((t) => t.Name)
      );
      return response.TemplatesMetadata || [];
    } catch (error: any) {
      console.error("Error listing templates:", error.message);
      return [];
    }
  },

  deleteTemplate: async (templateName: string) => {
    try {
      const command = new DeleteTemplateCommand({
        TemplateName: templateName,
      });

      await ses.send(command);
      console.log(`Template '${templateName}' deleted successfully`);
      return true;
    } catch (error: any) {
      console.error(
        `Error deleting template '${templateName}':`,
        error.message
      );
      return false;
    }
  },

  sendEmail: async (
    from: string,
    to: string[],
    templateName: string,
    templateData: unknown
  ): Promise<string> => {
    if (!validateEmail(from)) {
      throw new Error(`Invalid 'from' email address: ${from}`);
    }

    const invalidEmails = to.filter((email) => !validateEmail(email));
    if (invalidEmails.length > 0) {
      throw new Error(
        `Invalid 'to' email address(es): ${invalidEmails.join(", ")}`
      );
    }

    try {
      const params = {
        Source: from,
        Destination: {
          ToAddresses: to,
        },
        Template: templateName,
        TemplateData: JSON.stringify(templateData),
      };

      const command = new SendTemplatedEmailCommand(params);
      const response = await ses.send(command);

      console.log(
        `Email sent successfully using template '${templateName}'. MessageId: ${response.MessageId}`
      );
      return response.MessageId!;
    } catch (error: any) {
      console.error("Error sending email:", error.message);

      if (error.message.includes("Email address not verified")) {
        throw new Error(
          "Email address not verified in AWS SES. Please verify your domain or email address in the AWS SES console."
        );
      }

      if (
        error.message.includes("Template") &&
        error.message.includes("does not exist")
      ) {
        throw new Error(
          `Email template '${templateName}' does not exist. Please create the template first using AWSUtils.createTemplate()`
        );
      }

      throw error;
    }
  },
};

export const setupEmailTemplates = async () => {
  console.log("🔧 Setting up email templates for TheSchoolOfOptions...");
  await AWSUtils.initializeTemplates();
  await AWSUtils.listTemplates();

  console.log("Email template setup complete!");
};