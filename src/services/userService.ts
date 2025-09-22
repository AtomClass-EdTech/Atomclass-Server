import { FindManyOptions, FindOneOptions } from "typeorm";
import { AppDataSource } from "../config/databaseConfig.js";
import { User } from "../entities/User.js";

export const userService = {
  createUserData: async (
    email: string,
    firstName: string,
    lastName: string,
    phoneNumber: string,
    userId?: string,
  ): Promise<User> => {
    const user = new User();
    const emailExist = await userService.getUserByEmail(email.toLowerCase());

    if (emailExist?.id) {
      throw Error("Email Id exist already!");
    }

    if (userId) {
      user.id = userId;
    }
    user.email = email.toLowerCase();
    user.firstName = firstName;
    user.lastName = lastName;
    user.phoneNumber = phoneNumber;
    const userRepository = AppDataSource.getRepository(User);
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
