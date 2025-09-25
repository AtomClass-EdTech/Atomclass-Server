import express, { Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import path from "path";
import { fileURLToPath } from "url";

import Routers from "./routes/index.js";
import { errorHandler } from "./helpers/errorHandler.js";
import { databaseConfig } from "./config/index.js";
import { loadEnv } from "./config/loadEnv.js";

loadEnv();

const PORT = Number(process.env.PORT) || 8000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { AppDataSource } = databaseConfig;

export const buildCorsOptions = (): CorsOptions => {
  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8888",
    `http://localhost:${PORT}`,
  ];

  const csvOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : [];

  const legacyOrigins = (() => {
    try {
      return process.env.allowedOrigins
        ? JSON.parse(process.env.allowedOrigins)
        : [];
    } catch (error) {
      console.warn("Failed to parse allowedOrigins env var", error);
      return [];
    }
  })();

  const allowAll =
    process.env.ALLOW_ALL_ORIGINS === "true" || process.env.allowAllOrigins === "true";
  const originSet = new Set([...defaultOrigins, ...csvOrigins, ...legacyOrigins]);

  return {
    origin: allowAll
      ? true
      : (origin, callback) => {
          if (!origin || originSet.has(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
    credentials: true,
  };
};

const app = express();

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

app.use(cors(buildCorsOptions()));
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(
  express.json({
    verify: (req: Request, _res: Response, buffer: Buffer) => {
      req.rawBody = buffer;
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use('/api/v1', Routers);
app.use(errorHandler);

const startServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log("DB initiated successfully");

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const gracefulShutdown = (signal: NodeJS.Signals) => {
      console.log(`${signal} received, shutting down gracefully`);
      server.close(() => {
        console.log("HTTP server closed");
        void AppDataSource.destroy().finally(() => process.exit(0));
      });
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    console.error("Error during Data Source initialization", error);
    process.exit(1);
  }
};

void startServer();
