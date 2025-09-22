import express from "express";

import { authRouter } from "./authRoutes.js";
import { healthRouter } from "./healthRoutes.js";
import { loginRequired } from "../middleware/authMiddleware.js";
import { userRouter } from "./userRoutes.js";
import sgMail from "@sendgrid/mail";
import { fileRouter } from "./fileRoutes.js";


const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
} else {
  console.warn("SENDGRID_API_KEY is not set. Email functionality will be disabled.");
}

const Routers = express.Router();

//common routes
Routers.use("/auth", authRouter);
Routers.use("/health", healthRouter);
Routers.use("/file", fileRouter);
Routers.use("/users", [loginRequired], userRouter);



export default Routers;
