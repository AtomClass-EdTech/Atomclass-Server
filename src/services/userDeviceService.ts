import crypto from "crypto";
import { AppDataSource } from "../config/databaseConfig.js";
import { DeviceLimitExceededError } from "../errors/device-limit-exceeded.js";
import { User, UserDevice } from "../entities/User.js";
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

const userRepository = (): Repository<User> => AppDataSource.getRepository(User);

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
    const repository = userRepository();

    const user = await repository.findOne({
      where: { id: userId },
      select: ["id", "devices"],
    });

    if (!user) {
      return null;
    }

    const devices = user.devices || [];
    const existingDevice = devices.find((d) => d.deviceId === deviceId);

    if (existingDevice) {
      return existingDevice;
    }

    const activeCount = devices.filter((d) => d.isActive).length;
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
    const repository = userRepository();
    const user = await repository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const devices = user.devices || [];
    const now = new Date();
    
    const existingIndex = devices.findIndex((d) => d.deviceId === deviceId);

    let device: UserDevice;

    if (existingIndex === -1) {
      // Create new device
      device = {
        deviceId,
        deviceName: truncate(deviceName, DEVICE_NAME_MAX_LENGTH) || undefined,
        userAgent: truncate(userAgent, USER_AGENT_MAX_LENGTH) || undefined,
        ipAddress: truncate(ipAddress, IP_MAX_LENGTH) || undefined,
        isActive: true,
        lastSeen: now,
      };
      devices.push(device);
    } else {
      // Update existing device
      device = devices[existingIndex];
      device.deviceName = truncate(deviceName ?? device.deviceName, DEVICE_NAME_MAX_LENGTH) || undefined;
      device.userAgent = truncate(userAgent, USER_AGENT_MAX_LENGTH) || undefined;
      device.ipAddress = truncate(ipAddress, IP_MAX_LENGTH) || undefined;
      device.isActive = true;
      device.lastSeen = now;
      devices[existingIndex] = device;
    }

    user.devices = devices;
    await repository.save(user);

    return device;
  },

  recordLogout: async ({
    userId,
    deviceId,
  }: {
    userId: string;
    deviceId: string;
  }): Promise<UserDevice | null> => {
    const repository = userRepository();
    const user = await repository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const devices = user.devices || [];
    const deviceIndex = devices.findIndex((d) => d.deviceId === deviceId);

    if (deviceIndex === -1) {
      return null;
    }

    const device = devices[deviceIndex];
    device.isActive = false;
    device.lastSeen = new Date();
    devices[deviceIndex] = device;

    user.devices = devices;
    await repository.save(user);

    return device;
  },

  getActiveDeviceCount: async (userId: string): Promise<number> => {
    const repository = userRepository();
    const user = await repository.findOne({
      where: { id: userId },
      select: ["id", "devices"],
    });

    if (!user) {
      return 0;
    }

    const devices = user.devices || [];
    return devices.filter((d) => d.isActive).length;
  },

  listUserDevices: async (userId: string): Promise<UserDevice[]> => {
    const repository = userRepository();
    const user = await repository.findOne({
      where: { id: userId },
      select: ["id", "devices"],
    });

    if (!user) {
      return [];
    }

    return user.devices || [];
  },

  removeDevice: async ({
    userId,
    deviceId,
  }: {
    userId: string;
    deviceId: string;
  }): Promise<boolean> => {
    const repository = userRepository();
    const user = await repository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    const devices = user.devices || [];
    const filteredDevices = devices.filter((d) => d.deviceId !== deviceId);

    if (filteredDevices.length === devices.length) {
      return false; // Device not found
    }

    user.devices = filteredDevices;
    await repository.save(user);

    return true;
  },

  deactivateAllDevices: async (userId: string): Promise<number> => {
    const repository = userRepository();
    const user = await repository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return 0;
    }

    const devices = user.devices || [];
    const now = new Date();
    let deactivatedCount = 0;

    user.devices = devices.map((device) => {
      if (device.isActive) {
        deactivatedCount++;
        return {
          ...device,
          isActive: false,
          lastSeen: now,
        };
      }
      return device;
    });

    if (deactivatedCount > 0) {
      await repository.save(user);
    }

    return deactivatedCount;
  },
};