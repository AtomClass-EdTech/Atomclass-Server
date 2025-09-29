import express from "express";

import { authRouter } from "./authRoutes.js";
import { healthRouter } from "./healthRoutes.js";
import { loginRequired } from "../middleware/authMiddleware.js";
import { userRouter } from "./userRoutes.js";
import { fileRouter } from "./fileRoutes.js";



const Routers = express.Router();

// routes
Routers.use("/auth", authRouter);
Routers.use("/health", healthRouter);
Routers.use("/file", fileRouter);
Routers.use("/users", [loginRequired], userRouter);



export default Routers;
