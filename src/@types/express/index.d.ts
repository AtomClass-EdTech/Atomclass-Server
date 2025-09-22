interface CognitoUserInterface {
  id: string;
  email_verified: boolean;
  email: string;
  isSuperAdmin: boolean;
}

declare namespace Express {
  interface Request {
    user?: CognitoUserInterface;
    rawBody?: Buffer;
  }
}
