import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

import Routers from "./routes/index.js";
import { errorHandler } from "./helpers/errorHandler.js";
import { databaseConfig } from "./config/index.js";
import { loadEnv } from "./config/loadEnv.js";

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

//Initializing DB
AppDataSource.initialize()
  .then(() => {
    app.listen(PORT, async () => {
      console.log("DB Initiated successfully");
      console.log(`Server running on port ${PORT}`);

      //make public images avaialble to application
      app.use(express.static(__dirname + "/public"));

      app.use(express.urlencoded({ extended: true }));
      // parse application/json
      app.use(
        express.json({
          verify: (req: Request, _res: Response, buffer: Buffer) => {
            req.rawBody = buffer;
          },
        }),
      );

      // Connecting the routes!
      app.use(Routers);

      app.use(errorHandler);
     
    });
  })
  .catch((err) => {
    console.error("Error during Data Source initialization", err);
  });
