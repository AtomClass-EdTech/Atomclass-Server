import { NextFunction, Request, Response } from "express";
import { authService } from "../services/authService.js";
import jwt from "jsonwebtoken";
import { userService } from "../services/userService.js";
import {
  verifyToken,
  decodeTokenPayload,
  createToken,
} from "../utils/bcryptUtils.js";
import sgMail from "@sendgrid/mail";

const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
} else {
  console.warn("SENDGRID_API_KEY is not set. Email functionality will be disabled.");
}

export const authController = {
  //This is only for creating organization and admin
  signup: async (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName, phoneNumber, email, password } = req.body;
    try {


      const userId = await authService.createUser(
        email.toLowerCase(),
        password,
      );

      const user = await userService.createUserData(
        email.toLowerCase(),
        firstName,
        lastName,
        phoneNumber,
        userId,
      );


      const token = createToken(userId, email, "1w");

      const msg = {
        to: email, 
        from: "contact@emiratesraffle.eco",
        templateId: "d-a690ff4a33b14275a527a190ae998a3d",
        dynamicTemplateData: {
          firstName,
          confirmEmailUrl: `${process.env.API_BASE_URL}/auth/confirmEmail?token=${token}`,
        },
      };
      await sgMail.send(msg);

      res.json({
        payload: {
          user,
        },
      });
    } catch (error: any) {
      if (error.code === "UsernameExistsException") {
        res.status(409).json({ error: "User already exists" });
        next(error);
      } else if (error.code === "InvalidParameterException") {
        console.error(error);
        res.status(400).json({ error: "Invalid parameters" });
        next(error);
      } else {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
        next(error);
      }
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      const tokens = await authService.loginUser(username, password);
      const decodedToken = jwt.decode(tokens?.IdToken as string, {
        complete: true,
      });
      if (!decodedToken || typeof decodedToken.payload !== "object") {
        return;
      }

      res.json({ payload: { tokens } });
    } catch (error) {
      next(error);
    }
  },

  confirmEmail: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.query as any;

      if (verifyToken(token)) {
        const decodedToken = decodeTokenPayload(token);
        const userId = decodedToken!.userId;

        await authService.confirmEmail(userId);
        res.redirect(301, process.env.APP_BASE_URL + "/login");
      } else {
        res.json({ message: "Error verifying token" });
        res.status(500);
        throw new Error("Error verifying token");
      }
    } catch (error) {
      next(error);
    }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      if (verifyToken(token)) {
        const decodedToken = decodeTokenPayload(token);
        const userId = decodedToken!.userId;

        await authService.resetPassword(userId, password);

        res.json({ message: "Password Configured" });
        res.status(200);
      } else {
        res.json({ message: "Error verifying token" });
        res.status(500);
        throw new Error("Error verifying token");
      }
    } catch (error) {
      next(error);
    }
  },

  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const userId = await userService.getUserIdByEmail(email.toLowerCase());
      if (userId) {
        await authService.sendResetPasswordEmail(email.toLowerCase());
        res.status(200).json({ message: "Email sent successfully." });
      } else {
        res.status(500).json({ error: "User not found" });
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
      next(error);
    }
  },
};
