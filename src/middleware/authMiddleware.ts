import { Request, Response, NextFunction, RequestHandler } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";

export const loginRequired: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authorizationHeader = req.headers.authorization || "";
  if (!authorizationHeader) {
    return res.status(401).send("Unauthorized");
  }

  const token = authorizationHeader.replace("Bearer ", "");

  const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
    tokenUse: "id",
    clientId: process.env.AWS_COGNITO_CLIENT_ID!,
  });

  try {
    const payload = await verifier.verify(token);
    const {
      "cognito:username": userId,
      email_verified,
      email,
      "cognito:groups": groups = [],
    } = payload;

    req.user = {
      id: userId,
      email_verified,
      email: email as string,
      isSuperAdmin: groups?.includes("super-admin"),
    };
    next();
  } catch {
    return res.status(401).send("Unauthorized");
  }
};

export const superAdminRequired: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await loginRequired(req, res, async () => {
    try {
      if (req.user?.isSuperAdmin) {
        next();
      }
      throw Error();
    } catch {
      return res.status(401).send("Unauthorized");
    }
  });
};
