
export interface PaginationInterface {
  offset?: number;
  limit?: number;
}

export type EnvironmentTypes = "development" | "production";


export const resultStatus = ["won", "lost", "pending"] as const;

export type ResultStatusInterface = (typeof resultStatus)[number];

export const gender = ["male", "female", "prefer not to disclose"] as const;

export type GenderInterface = (typeof gender)[number];

export const productInstanceTypes = [
  "offline",
  "free-offline",
  "online",
  "free-online",
  "sica",
] as const;

export type ProductInstanceInterface = (typeof productInstanceTypes)[number];
