import { FindManyOptions, FindOneOptions } from "typeorm";
import { AppDataSource } from "../config/databaseConfig.js";
import { User, UserRole } from "../entities/User.js";

export const userService = {
  createUserData: async (userPayload: Partial<User>): Promise<User> => {
    const userRepository = AppDataSource.getRepository(User);

    if (!userPayload.email) {
      throw new Error("Email is required to create a user");
    }

    const normalizedEmail = userPayload.email.toLowerCase().trim();
    const existingUser = await userService.getUserByEmail(normalizedEmail);

    if (existingUser?.id) {
      throw new Error("Email is already registered. Please log in.");
    }

    const user = new User();

    Object.assign(user, {
      ...userPayload,
      email: normalizedEmail,
      fullName: userPayload.fullName?.trim() ?? userPayload.fullName ?? null,
      role: userPayload.role ?? UserRole.USER,
      isActive: userPayload.isActive ?? true,
      isVerified: userPayload.isVerified ?? false,
      loginCount: userPayload.loginCount ?? 0,
    });

    const savedUser = await userRepository.save(user);
    return savedUser;
  },

  upsertUser: async (userData: Partial<User>): Promise<User> => {
    const { id: userId } = userData;
    const userRepository = AppDataSource.getRepository(User);

    let user = userId
      ? await userRepository.findOne({
          where: { id: userId },
        })
      : null;

    if (!user) {
      user = new User();
    }

    Object.assign(user, userData);

    return await userRepository.save(user);
  },

  updateUser: async (userData: Partial<User>): Promise<User> => {
    const { id: userId } = userData;
    const userRepository = AppDataSource.getRepository(User);

    let user = await userRepository.findOneOrFail({
      where: { id: userId },
    });

    Object.assign(user, userData);

    return await userRepository.save(user);
  },

  getUserById: async ({
    userId,
    relations,
    options,
  }: {
    userId: string;
    relations?: Array<string>;
    options?: FindOneOptions<User>;
  }): Promise<User> => {
    const userRepository = AppDataSource.getRepository(User);
    return await userRepository.findOneOrFail({
      where: { id: userId },
      ...(options ? { options } : {}),
      ...(relations ? { relations } : {}),
    });
  },

  getUsers: async (
    options?: FindManyOptions<User> | undefined,
  ): Promise<{ users: User[]; count: number }> => {
    const userRepository = AppDataSource.getRepository(User);
    const [users, count] = await userRepository.findAndCount(options);
    return { users, count };
  },

  getUser: async (options: FindOneOptions<User>): Promise<User | null> => {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne(options);
    return user;
  },

  getUserIdByEmail: async (email: string): Promise<string | null> => {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { email: email.toLowerCase() },
      select: ["id"],
    });

    if (user) {
      return user.id;
    } else {
      return null;
    }
  },

  getUserByEmail: async (
    email: string,
    relations?: Array<string>,
  ): Promise<User | null> => {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { email: email.toLowerCase() },
      ...(relations ? { relations } : {}),
    });

    return user;
  }
};
