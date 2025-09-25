import { RequestHandler, Request } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import jwt from "jsonwebtoken";

import { AppDataSource } from "../config/databaseConfig.js";
import { User } from "../entities/User.js";
import type { RoleName } from "../entities/Role.js";
import {
  getNormalizedCognitoGroups,
  readCognitoGroupsFromPayload,
} from "../utils/cognitoGroups.js";

type TokenPayload = {
  username?: string;
  sub?: string;
  email?: string;
  iss?: string;
  "cognito:groups"?: string[] | string;
  [key: string]: unknown;
};

export interface AuthenticatedRequestUser extends TokenPayload {
  id: string;
  cognitoId?: string | null;
  roles: RoleName[];
  email?: string;
  cognitoGroups: string[];
  normalizedGroups: string[];
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedRequestUser;
  }
}

function isJWT(token: string): boolean {
  return token.split(".").length === 3;
}

function extractBearerToken(authorizationHeader?: string): string {
  if (!authorizationHeader) {
    throw new Error("No authorization header provided");
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) {
    throw new Error("No token found in authorization header");
  }

  return match[1].trim();
}

export const getTokenFromHeader = async (
  token: string
): Promise<TokenPayload> => {
  if (!isJWT(token)) {
    throw new Error("Token is not a valid JWT");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decodedToken = jwt.decode(token, { complete: true }) as any;
  if (!decodedToken || !decodedToken.payload) {
    throw new Error("Invalid JWT structure");
  }

  const iss = decodedToken.payload.iss as string | undefined;

  if (iss && iss.startsWith("https://cognito-idp.")) {
    try {
      const verifier = CognitoJwtVerifier.create({
        userPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
        tokenUse: "access",
        clientId: process.env.AWS_COGNITO_CLIENT_ID!,
      });
      const tokenData = (await verifier.verify(token)) as TokenPayload;
      return tokenData;
    } catch {
      throw new Error("Invalid Cognito token");
    }
  } else {
    throw new Error(`Unsupported token issuer: ${iss ?? "unknown"}`);
  }
};

async function findUserForToken(tokenData: TokenPayload): Promise<User | null> {
  const userRepository = AppDataSource.getRepository(User);

  const lookupValues: Array<{ cognitoId?: string; email?: string }> = [];

  if (typeof tokenData.username === "string" && tokenData.username.trim()) {
    lookupValues.push({ cognitoId: tokenData.username });
  }
  if (
    typeof tokenData.sub === "string" &&
    tokenData.sub.trim() &&
    tokenData.sub !== tokenData.username
  ) {
    lookupValues.push({ cognitoId: tokenData.sub });
  }
  if (typeof tokenData.email === "string" && tokenData.email.trim()) {
    lookupValues.push({ email: tokenData.email.toLowerCase() });
  }

  for (const where of lookupValues) {
    const user = await userRepository.findOne({
      where,
      relations: ["roles"],
    });
    if (user) {
      return user;
    }
  }

  return null;
}

async function authenticateRequest(
  req: Request
): Promise<AuthenticatedRequestUser> {
  const token = extractBearerToken(req.headers.authorization);
  const tokenData = await getTokenFromHeader(token);
  const user = await findUserForToken(tokenData);

  if (!user) {
    throw new Error("User not found for provided token");
  }

  const roles = user.roles?.map((role) => role.name) ?? [];
  const cognitoGroups = readCognitoGroupsFromPayload(tokenData);
  const normalizedGroups = getNormalizedCognitoGroups(tokenData);

  return {
    ...tokenData,
    id: user.id,
    cognitoId: user.cognitoId,
    email: user.email,
    roles,
    cognitoGroups,
    normalizedGroups,
  };
}

export const loginRequired: RequestHandler = async (req, res, next) => {
  try {
    const authenticatedUser = await authenticateRequest(req);
    req.user = authenticatedUser;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Unauthorized",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const superAdminRequired: RequestHandler = async (req, res, next) => {
  try {
    const authenticatedUser = await authenticateRequest(req);

    const isSuperAdmin =
      authenticatedUser.roles.includes("SUPER_ADMIN") ||
      authenticatedUser.normalizedGroups.includes("SUPER_ADMIN");

    if (!isSuperAdmin) {
      return res
        .status(403)
        .json({ error: "Super admin privileges are required" });
    }

    req.user = authenticatedUser;
    next();
  } catch (error) {
    const status = error instanceof Error && error.message.includes("Super admin") ? 403 : 401;
    return res.status(status).json({
      error: status === 403 ? "Forbidden" : "Unauthorized",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
