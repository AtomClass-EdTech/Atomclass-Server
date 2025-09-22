import { DataSource } from "typeorm";
import { User } from "../entities/User.js";
import { EnvironmentTypes } from "../utils/index.js";
import { Config } from "../entities/Config.js";
import { loadEnv } from "./loadEnv.js";

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
    database: process.env.DEV_DB_NAME,
    host: process.env.DEV_DB_HOST, 
    port: process.env.DEV_DB_PORT,
  }, 
  production: {
    username: process.env.PROD_DB_USERNAME,
    password: process.env.PROD_DB_PASSWORD,
    database: process.env.PROD_DB_NAME,
    host: process.env.PROD_DB_HOST,
    port: process.env.PROD_DB_PORT,
  },
};

const currentDbConfig =
  dbConfig[(process.env.NODE_ENV! as EnvironmentTypes) || "development"];

const { username, password, host, port, database } = currentDbConfig;
const portNumber = typeof port === "string" ? parseInt(port, 10) : port;

if (!username || !password || !database || !host) {
  throw new Error("Database configuration is incomplete. Check your environment variables.");
}

export const AppDataSource = new DataSource({
  ssl:
    process.env.NODE_ENV === "development"
      ? false
      : {
          rejectUnauthorized: false,
        },
  type: "postgres",
  username,
  password,
  host,
  port: Number.isNaN(portNumber) ? 5432 : portNumber,
  database,
  entities: [User, Config],
  subscribers: ["src/subscribers/**/*.{ts,js}"],
  synchronize: true,
  logging: false,
  migrations: ["src/migrations/**/*.ts"],
  migrationsTableName: "migrations",
});
