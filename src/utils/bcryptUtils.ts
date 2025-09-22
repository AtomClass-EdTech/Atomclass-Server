import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";

// Define a type for the decoded payload
interface DecodedTokenPayload extends JwtPayload {
  userId: string;
  email: string;
}

const secretKey = process.env.DOMAIN_SECRET_KEY; // TODO: ideally rotate via secrets manager

const validateSecretKey = () => {
  if (!secretKey) {
    throw new Error("DOMAIN_SECRET_KEY not found in environment");
  }

  if (Buffer.byteLength(secretKey, "utf8") !== 32) {
    throw new Error("DOMAIN_SECRET_KEY must be 32 bytes long for AES-256-CBC");
  }

  return Buffer.from(secretKey, "utf8");
};

export const createToken = (
  userId: string,
  email: string,
  expiry: string | number,
) => {
  validateSecretKey();
  const payload = { userId, email };
  const options = { expiresIn: expiry };
  return jwt.sign(payload, secretKey!, options);
};
export const decodeTokenPayload = (
  token: string,
): DecodedTokenPayload | null => {
  try {
    const decodedPayload = jwt.decode(token) as DecodedTokenPayload;
    return decodedPayload;
  } catch (error: any) {
    console.error("Error decoding token payload:", error.message);
    return null;
  }
};

export const verifyToken = (token: string) => {
  try {
    validateSecretKey();
    const decoded = jwt.verify(token, secretKey!) as DecodedTokenPayload;
    return decoded;
  } catch (error: any) {
    console.error("Error verifying token:", error.message);
    return null;
  }
};

// Encrypt data
export const encrypt = (text: string) => {
  const key = validateSecretKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

// Decrypt data
export const decrypt = (encryptedText: string) => {
  const key = validateSecretKey();
  const [ivHex, data] = encryptedText.split(":");

  if (!ivHex || !data) {
    throw new Error("Encrypted text is malformed. Expected iv:ciphertext format.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
