import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";

// Define a type for the decoded payload
interface DecodedTokenPayload extends JwtPayload {
  userId: string;
  email: string;
}

let cachedJwtSecret: string | null = null;

const resolveJwtSecret = (): string => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const secret =
    process.env.JWT_SECRET ||
    process.env.AUTH_JWT_SECRET ||
    process.env.AUTH_TOKEN_SECRET;

  if (!secret) {
    throw new Error(
      "JWT secret is not configured. Please set JWT_SECRET (or AUTH_JWT_SECRET/AUTH_TOKEN_SECRET).",
    );
  }
  cachedJwtSecret = secret;
  return cachedJwtSecret;
};

const getEncryptionKey = (): Buffer => {
  return crypto.createHash("sha256").update(resolveJwtSecret()).digest();
};

export const createToken = (
  userId: string,
  email: string,
  expiry: string | number,
) => {
  const payload = { userId, email };
  const options = { expiresIn: expiry };
  return jwt.sign(payload, resolveJwtSecret(), options);
};

export const decodeTokenPayload = (
  token: string,
): DecodedTokenPayload | null => {
  try {
    const decodedPayload = jwt.decode(token) as DecodedTokenPayload;
    return decodedPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error decoding token payload:", message);
    return null;
  }
};

export const verifyToken = (token: string): DecodedTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, resolveJwtSecret()) as DecodedTokenPayload;
    return decoded;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error verifying token:", message);
    return null;
  }
};

export const encrypt = (text: string) => {
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encryptedBuffer = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encryptedBuffer]).toString("base64");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error encrypting value:", message);
    throw new Error("Failed to encrypt value");
  }
};

export const decrypt = (encryptedText: string) => {
  try {
    const buffer = Buffer.from(encryptedText, "base64");

    if (buffer.length <= 28) {
      throw new Error("Invalid encrypted payload");
    }

    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const ciphertext = buffer.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const decryptedBuffer = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decryptedBuffer.toString("utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error decrypting value:", message);
    throw new Error("Failed to decrypt value");
  }
};
