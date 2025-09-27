import { Redis } from "ioredis";
import type { RedisOptions } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_PORT = Number.parseInt(process.env.REDIS_PORT ?? "6379", 10);

const resolveCredentials = (url?: URL): Pick<RedisOptions, "username" | "password"> => {
  const passwordFromUrl = url?.password ? decodeURIComponent(url.password) : undefined;
  const usernameFromUrl = url?.username ? decodeURIComponent(url.username) : undefined;

  const password =
    passwordFromUrl ??
    process.env.REDIS_PASSWORD ??
    process.env.REDIS_AUTH_TOKEN ??
    undefined;

  const explicitUsername = process.env.REDIS_USERNAME;

  const username =
    usernameFromUrl ??
    (explicitUsername && explicitUsername.trim() !== ""
      ? explicitUsername
      : password && !usernameFromUrl
        ? "default"
        : undefined);

  return {
    username,
    password,
  };
};

const resolveTls = (protocol?: string): RedisOptions["tls"] => {
  if (protocol === "rediss:") {
    return {};
  }

  return process.env.REDIS_TLS === "true" ? {} : undefined;
};

const parseRedisUrl = (rawUrl: string): RedisOptions => {
  const trimmedUrl = rawUrl.trim();

  if (trimmedUrl.startsWith("redis://") || trimmedUrl.startsWith("rediss://")) {
    const url = new URL(trimmedUrl);
    const port = Number.parseInt(url.port, 10);
    const credentials = resolveCredentials(url);

    return {
      host: url.hostname,
      port: Number.isNaN(port) ? DEFAULT_PORT : port,
      enableReadyCheck: false,
      ...credentials,
      tls: resolveTls(url.protocol),
    } satisfies RedisOptions;
  }

  const [host, portFromUrl] = trimmedUrl.split(":");

  if (!host) {
    throw new Error("Redis connection failed: invalid REDIS_HOST_URL value");
  }

  const port = Number.parseInt(portFromUrl ?? "", 10);

  return {
    host,
    port: Number.isNaN(port) ? DEFAULT_PORT : port,
    enableReadyCheck: false,
    ...resolveCredentials(),
    tls: resolveTls(),
  } satisfies RedisOptions;
};

const resolveRedisConfig = (): RedisOptions => {
  const connectionUrl = process.env.REDIS_HOST_URL;

  if (!connectionUrl) {
    throw new Error("Redis connection failed: REDIS_HOST_URL is not configured");
  }

  return parseRedisUrl(connectionUrl);
};

export const redis = new Redis(resolveRedisConfig());
