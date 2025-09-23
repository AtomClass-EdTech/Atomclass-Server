import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

import Routers from "./routes/index.js";
import { errorHandler } from "./helpers/errorHandler.js";
import { databaseConfig } from "./config/index.js";
import { loadEnv } from "./config/loadEnv.js";

// Add better error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

loadEnv();

const PORT = process.env.PORT || 8000;
//@ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { AppDataSource } = databaseConfig;

export const corsOriginValidator = (origin: any, callback: any) => {
  // Allow specific origins
  const allowedOrigins = [
    "http://localhost:8888",
    "http://localhost:3000",
    `http://localhost:${PORT}`,
    ...JSON.parse(process.env.allowedOrigins || "[]"),
  ];

  // Check if the requested origin is in the allowed origins list
  if (
    !origin ||
    allowedOrigins.includes(origin) ||
    process.env?.allowAllOrigins
  ) {
    console.log("Should all cors");
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

const app = express();

// Set up all middleware BEFORE starting the server
app.use(cors({ origin: "*" }));
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// Make public images available to application
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));

// Parse application/json
app.use(
  express.json({
    verify: (req: Request, _res: Response, buffer: Buffer) => {
      req.rawBody = buffer;
    },
  }),
);

// Connect the routes
app.use(Routers);

// Error handler should be last
app.use(errorHandler);

// Add a health check route
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize DB and start server
AppDataSource.initialize()
  .then(() => {
    console.log("DB Initiated successfully");
    
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check available at http://localhost:8888/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  })
  .catch((err) => {
    console.error("Error during Data Source initialization", err);
    process.exit(1);
  });