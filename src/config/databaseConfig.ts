import path from "path";
import { fileURLToPath } from "url";
import { DataSource } from "typeorm";
import { User } from "../entities/User.js";
import { EnvironmentTypes } from "../utils/index.js";
import { loadEnv } from "./loadEnv.js";
import { Organization } from "../entities/Organization.js";
import { Role } from "../entities/Role.js";
import { Course } from "../entities/Course.js";
import { Section } from "../entities/Section.js";
import { Lesson } from "../entities/Lesson.js";
import { VideoAsset } from "../entities/VideoAsset.js";
import { Order } from "../entities/Order.js";
import { Payment } from "../entities/Payment.js";
import { Enrollment } from "../entities/Enrollment.js";

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
    username: "postgres",
    password: "TotalProfit1!",
    database: "atomclass",
    host: "kundankishoredb.cpm0s28o0c5k.ap-south-1.rds.amazonaws.com",
    port: 5432,
  },
  production: {
    username: "postgres",
    password: "TotalProfit1!",
    database: "atomclass",
    host: "kundankishoredb.cpm0s28o0c5k.ap-south-1.rds.amazonaws.com",
    port: 5432,
  },
};

const currentDbConfig =
  dbConfig[(process.env.NODE_ENV! as EnvironmentTypes) || "development"];

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
  entities: [Organization, Role, User, Course, Section, Lesson, VideoAsset, Order, Payment, Enrollment],
  subscribers: subscribersGlobs,
  synchronize: true,
  logging: false,
  migrations: migrationsGlobs,
  migrationsTableName: "migrations",
});
