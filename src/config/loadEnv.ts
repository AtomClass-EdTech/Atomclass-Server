import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const DEFAULT_ENV_FILE = ".env";

const loadBaseEnv = () => {
  dotenv.config({ path: DEFAULT_ENV_FILE });
};

const loadEnvironmentSpecificEnv = () => {
  const envName = process.env.NODE_ENV || "development";
  const envFileName = `.env.${envName}`;
  const envFilePath = path.resolve(process.cwd(), envFileName);

  if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath, override: true });
  }
};

export const loadEnv = () => {
  loadBaseEnv();
  loadEnvironmentSpecificEnv();
};
