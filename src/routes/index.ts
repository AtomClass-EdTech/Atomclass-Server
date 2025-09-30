import express from "express";

import { authRouter } from "./authRoutes.js";
import { healthRouter } from "./healthRoutes.js";
import { loginRequired } from "../middleware/authMiddleware.js";
import { userRouter } from "./userRoutes.js";
import { fileRouter } from "./fileRoutes.js";
import { courseRouter } from "./courseRoutes.js";
import { cloudFlareRouter } from "./cloudFlareRoutes.js";
import { enrollmentRouter } from "./enrollmentRoute.js";



const Routers = express.Router();

// routes
Routers.use("/auth", authRouter);
Routers.use("/health", healthRouter);
Routers.use("/file", fileRouter);
Routers.use("/users", [loginRequired], userRouter);
Routers.use("/course", [loginRequired], courseRouter);
Routers.use("/cloudflare", [loginRequired], cloudFlareRouter);
Routers.use("/enrollment", [loginRequired], enrollmentRouter);



export default Routers;
