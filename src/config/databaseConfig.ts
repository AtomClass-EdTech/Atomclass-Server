import path from "path";
import { fileURLToPath } from "url";
import { DataSource } from "typeorm";
import { User } from "../entities/User.js";
import { EnvironmentTypes } from "../utils/index.js";
import { loadEnv } from "./loadEnv.js";
import { Organization } from "../entities/Organization.js";
import { Course } from "../entities/Course.js";
import { Lesson } from "../entities/Lesson.js";
import { Purchase } from "../entities/Purchase.js";

loadEnv();

const dbConfigurationKeys = [
  "username",
  "password",
  "database",
  "host",
  "port",
] as const;

export const dbConfig: Record<
  EnvironmentTypes,
  Record<(typeof dbConfigurationKeys)[number], any>
> = {
  development: {
    username: process.env.DEV_DB_USERNAME,
    password: process.env.DEV_DB_PASSWORD,
    database: process.env.DEV_DB_NAME_DEVELOPMENT,
    host: process.env.DEV_DB_HOST,
    port: 5432,
  },
  production: {
    username: process.env.DEV_DB_USERNAME,
    password: process.env.DEV_DB_PASSWORD,
    database: process.env.DEV_DB_NAME_PRODUCTION,
    host: process.env.DEV_DB_HOST,
    port: 5432,
  },
};

const currentDbConfig =
  dbConfig[(process.env.NODE_ENV! as EnvironmentTypes) || "production"];

const { username, password, host, port, database } = currentDbConfig;
const portNumber = typeof port === "string" ? parseInt(port, 10) : port;

if (!username || !password || !database || !host) {
  throw new Error("Database configuration is incomplete. Check your environment variables.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runningTs = __filename.endsWith(".ts");

const migrationsGlobs = runningTs
  ? ["src/migrations/**/*.ts"]
  : [path.join(__dirname, "../migrations/**/*.js")];

const subscribersGlobs = runningTs
  ? ["src/subscribers/**/*.{ts,js}"]
  : [path.join(__dirname, "../subscribers/**/*.js")];

export const AppDataSource = new DataSource({
  ssl: {
    rejectUnauthorized: false,
  },
  type: "postgres",
  username,
  password,
  host,
  port: Number.isNaN(portNumber) ? 5432 : portNumber,
  database,
  entities: [Organization, User, Course, Lesson, Purchase],
  subscribers: subscribersGlobs,
  synchronize: true,
  logging: false,
  migrations: migrationsGlobs,
  migrationsTableName: "migrations",
});
