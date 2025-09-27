import { NextFunction, Request, Response } from "express";
import { userService } from "../services/userService.js";
import { User } from "../entities/User.js";
import { redisJson } from "../utils/redis.js";

const redisNamespace = [
  process.env.REDIS_NAMESPACE ?? "atomclass",
  process.env.NODE_ENV ?? "development",
  "users",
].join(":");

const USER_LIST_CACHE_KEY = `${redisNamespace}:list`;
const userCacheKey = (userId: string) => `${redisNamespace}:detail:${userId}`;

const readCache = async <T>(key: string): Promise<T | null> => {
  try {
    return await redisJson.get<T>(key);
  } catch (error) {
    console.warn(`Failed to read Redis cache for key ${key}`, error);
    return null;
  }
};

const writeCache = async <T>(key: string, value: T): Promise<void> => {
  try {
    await redisJson.set(key, value);
  } catch (error) {
    console.warn(`Failed to write Redis cache for key ${key}`, error);
  }
};

const deleteCache = async (...keys: string[]): Promise<void> => {
  try {
    await redisJson.del(...keys);
  } catch (error) {
    console.warn(`Failed to delete Redis cache for keys ${keys.join(", ")}`, error);
  }
};

export const userController = {
  getAllUsers: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const cached = await readCache<{ users: User[]; count: number }>(USER_LIST_CACHE_KEY);

      if (cached) {
        res.json({ payload: cached });
        return;
      }

      const { users, count } = await userService.getUsers();
      const payload = { users, count };
      void writeCache(USER_LIST_CACHE_KEY, payload);

      res.json({ payload });
    } catch (error) {
      next(error);
    }
  },

  updateUser: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUserId = req.user?.id;

      if (!authenticatedUserId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const updates: Partial<User> = { id: authenticatedUserId };

      if (typeof req.body.fullName === "string") {
        updates.fullName = req.body.fullName.trim();
      }

      if (typeof req.body.phoneNumber === "string") {
        updates.phoneNumber = req.body.phoneNumber.trim();
      }

      if (Object.keys(updates).length === 1) {
        res.status(400).json({ error: "No updatable fields provided" });
        return;
      }

      const user = await userService.updateUser(updates);
      const payload = { user };

      void Promise.allSettled([
        writeCache(userCacheKey(user.id), user),
        deleteCache(USER_LIST_CACHE_KEY),
      ]);

      res.json({ payload });
    } catch (error) {
      next(error);
    }
  },

  getUserById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const cacheKey = userCacheKey(userId);

      const cachedUser = await readCache<User>(cacheKey);

      if (cachedUser) {
        res.json({ payload: { user: cachedUser } });
        return;
      }

      const user = await userService.getUserById({
        userId,
      });

      void writeCache(cacheKey, user);

      res.json({ payload: { user } });
    } catch (error) {
      next(error);
    }
  },
};
