import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";

// Define a type for the decoded payload
interface DecodedTokenPayload extends JwtPayload {
  userId: string;
  email: string;
}

const secretKey = "_qAgWmD2uGcv+GuSNmJh7A12ENeE"; 

export const createToken = (
  userId: string,
  email: string,
  expiry: string | number,
) => {
  const payload = { userId, email };
  const options = { expiresIn: expiry };
  //@ts-ignore
  return jwt.sign(payload, secretKey, options);
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
    if (!secretKey) {
      throw new Error("SECRET KEY NOT FOUND IN ENV");
    }
    const decoded = jwt.verify(token, secretKey) as DecodedTokenPayload;
    return decoded;
  } catch (error: any) {
    console.error("Error verifying token:", error.message);
    return null;
  }
};

// Encrypt data
export const encrypt = (text: string) => {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    secretKey!,
    crypto.randomBytes(16),
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

// Decrypt data
export const decrypt = (encryptedText: string) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    secretKey!,
    crypto.randomBytes(16),
  );

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};