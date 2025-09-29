import express, { Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import path from "path";
import { fileURLToPath } from "url";

import Routers from "./routes/index.js";
import { errorHandler } from "./helpers/errorHandler.js";
import { databaseConfig } from "./config/index.js";
import { loadEnv } from "./config/index.js";
import { redis } from "./utils/redis.js";

loadEnv();

let redisAuthErrorReported = false;

redis.on("error", (error) => {
  if (
    error instanceof Error &&
    error.message.includes("NOAUTH") &&
    !redisAuthErrorReported
  ) {
    redisAuthErrorReported = true;
    console.error(
      "Redis authentication failed. Ensure REDIS_HOST_URL includes credentials or set REDIS_PASSWORD/REDIS_USERNAME env vars.",
    );
    return;
  }

  console.error("Redis connection error:", error);
});

redis.on("ready", () => {
  console.log("Redis connection ready");

  void redis.ping().catch((error) => {
    if (
      error instanceof Error &&
      error.message.includes("NOAUTH") &&
      !redisAuthErrorReported
    ) {
      redisAuthErrorReported = true;
      console.error(
        "Redis authentication failed. Ensure REDIS_HOST_URL includes credentials or set REDIS_PASSWORD/REDIS_USERNAME env vars.",
      );
      return;
    }

    console.error("Redis ping failed:", error);
  });
});

const PORT = Number(process.env.PORT) || 8000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { AppDataSource } = databaseConfig;

export const buildCorsOptions = (): CorsOptions => {
  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
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

const corsOptions = buildCorsOptions();
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(
  express.json({
    verify: (req: Request, _res: Response, buffer: Buffer) => {
      req.rawBody = buffer;
    },
  }),
);

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
