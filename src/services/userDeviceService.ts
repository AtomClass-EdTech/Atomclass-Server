import crypto from "crypto";
import { AppDataSource } from "../config/databaseConfig.js";
import { UserDevice } from "../entities/UserDevice.js";
import { DeviceLimitExceededError } from "../errors/DeviceLimitExceededError.js";
import type { User } from "../entities/User.js";
import { Repository } from "typeorm";

const DEVICE_ID_MAX_LENGTH = 190;
const DEVICE_NAME_MAX_LENGTH = 255;
const USER_AGENT_MAX_LENGTH = 512;
const IP_MAX_LENGTH = 45;

const DEFAULT_MAX_ACTIVE_DEVICES = 5;

const resolveMaxDevices = (): number => {
  const raw = process.env.MAX_ACTIVE_DEVICES;
  if (!raw) {
    return DEFAULT_MAX_ACTIVE_DEVICES;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_MAX_ACTIVE_DEVICES;
  }

  return parsed;
};

const truncate = (value: string | null | undefined, limit: number): string | null => {
  if (!value) {
    return null;
  }

  return value.length > limit ? value.slice(0, limit) : value;
};

const deviceRepository = (): Repository<UserDevice> => AppDataSource.getRepository(UserDevice);

export const deriveDeviceId = ({
  providedDeviceId,
  userAgent,
  ipAddress,
}: {
  providedDeviceId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}): string => {
  const cleanedProvided = providedDeviceId?.trim();
  if (cleanedProvided) {
    return cleanedProvided.slice(0, DEVICE_ID_MAX_LENGTH);
  }

  const normalizedUserAgent = (userAgent ?? "unknown").trim();
  const normalizedIp = (ipAddress ?? "").trim();
  const fingerprintSource = `${normalizedUserAgent}|${normalizedIp}`;
  const digest = crypto
    .createHash("sha256")
    .update(fingerprintSource)
    .digest("hex");

  return digest.slice(0, DEVICE_ID_MAX_LENGTH);
};

export const userDeviceService = {
  ensureDeviceCanLogin: async ({
    userId,
    deviceId,
  }: {
    userId: string;
    deviceId: string;
  }): Promise<UserDevice | null> => {
    const repository = deviceRepository();

    const existingDevice = await repository.findOne({
      where: {
        user: { id: userId },
        deviceId,
      },
    });

    if (existingDevice) {
      return existingDevice;
    }

    const activeCount = await repository.count({
      where: {
        user: { id: userId },
        isActive: true,
      },
    });

    const maxDevices = resolveMaxDevices();

    if (activeCount >= maxDevices) {
      throw new DeviceLimitExceededError(maxDevices);
    }

    return null;
  },

  recordSuccessfulLogin: async ({
    userId,
    deviceId,
    deviceName,
    userAgent,
    ipAddress,
  }: {
    userId: string;
    deviceId: string;
    deviceName?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<UserDevice> => {
    const repository = deviceRepository();
    let device = await repository.findOne({
      where: {
        user: { id: userId },
        deviceId,
      },
    });

    const now = new Date();

    if (!device) {
      device = repository.create({
        user: { id: userId } as User,
        deviceId,
        deviceName: truncate(deviceName, DEVICE_NAME_MAX_LENGTH),
        userAgent: truncate(userAgent, USER_AGENT_MAX_LENGTH),
        ipAddress: truncate(ipAddress, IP_MAX_LENGTH),
        isActive: true,
        lastSeen: now,
      });
    } else {
      device.deviceName = truncate(deviceName ?? device.deviceName, DEVICE_NAME_MAX_LENGTH);
      device.userAgent = truncate(userAgent, USER_AGENT_MAX_LENGTH);
      device.ipAddress = truncate(ipAddress, IP_MAX_LENGTH);
      device.isActive = true;
      device.lastSeen = now;
    }

    return await repository.save(device);
  },

  recordLogout: async ({
    userId,
    deviceId,
  }: {
    userId: string;
    deviceId: string;
  }): Promise<UserDevice | null> => {
    const repository = deviceRepository();
    const device = await repository.findOne({
      where: {
        user: { id: userId },
        deviceId,
      },
    });

    if (!device) {
      return null;
    }

    device.isActive = false;
    device.lastSeen = new Date();

    return await repository.save(device);
  },

  getActiveDeviceCount: async (userId: string): Promise<number> => {
    const repository = deviceRepository();

    return repository.count({
      where: {
        user: { id: userId },
        isActive: true,
      },
    });
  },
};
