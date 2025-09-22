import sgMail from "@sendgrid/mail";
import AWS_CognitoIdentityServiceProvider, {
  AdminSetUserPasswordCommandOutput,
  CognitoIdentityProvider as CognitoIdentityServiceProvider,
} from "@aws-sdk/client-cognito-identity-provider";
import { createToken } from "../utils/bcryptUtils.js";
import { userService } from "./userService.js";
import { generatePrefixedUUID } from "../utils/index.js";

const awsRegion = process.env.AWS_REGION;

if (!awsRegion) {
  console.warn("AWS_REGION is not set. Cognito operations may fail until configured.");
}

const cognitoIdentityServiceProvider = new CognitoIdentityServiceProvider({
  region: awsRegion || "us-east-1",
});

let cognitoConfigCache: { userPoolId: string; clientId: string } | null = null;

const getCognitoConfig = () => {
  if (!cognitoConfigCache) {
    const userPoolId = process.env.AWS_COGNITO_USER_POOL_ID;
    const clientId = process.env.AWS_COGNITO_CLIENT_ID;

    if (!userPoolId || !clientId) {
      throw new Error(
        "AWS Cognito environment variables are missing. Please set AWS_COGNITO_USER_POOL_ID and AWS_COGNITO_CLIENT_ID.",
      );
    }

    cognitoConfigCache = { userPoolId, clientId };
  }

  return cognitoConfigCache;
};

const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
} else {
  console.warn("SENDGRID_API_KEY is not set. Email functionality will be disabled.");
}

export const authService = {
  createUser: async (email: string, password: string) => {
    const { userPoolId } = getCognitoConfig();
    const userId = generatePrefixedUUID("US");
    const params: AWS_CognitoIdentityServiceProvider.AdminCreateUserCommandInput =
      {
        UserPoolId: userPoolId,
        Username: userId,
        TemporaryPassword: password,
        MessageAction: "SUPPRESS",
        UserAttributes: [{ Name: "email", Value: email.toLowerCase() }],
      };

    await cognitoIdentityServiceProvider.adminCreateUser(params);

    await cognitoIdentityServiceProvider.adminSetUserPassword({
      UserPoolId: userPoolId,
      Username: userId,
      Password: password,
      Permanent: true,
    });

    await cognitoIdentityServiceProvider.adminUpdateUserAttributes({
      UserPoolId: userPoolId,
      Username: userId,
      UserAttributes: [
        {
          Name: "email_verified",
          Value: "false",
        },
      ],
    });

    return userId;
  },

  resetPassword: async (
    userId: string,
    password: string,
  ): Promise<AdminSetUserPasswordCommandOutput> => {
    try {
      const { userPoolId } = getCognitoConfig();
      // Set the password permanently in Cognito
      const resetpassword =
        await cognitoIdentityServiceProvider.adminSetUserPassword({
          UserPoolId: userPoolId,
          Username: userId,
          Password: password,
          Permanent: true,
        });
      await cognitoIdentityServiceProvider.adminUpdateUserAttributes({
        UserPoolId: userPoolId,
        Username: userId,
        UserAttributes: [
          {
            Name: "email_verified",
            Value: "true",
          },
        ],
      });

      return resetpassword;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to set password and verify email");
    }
  },

  sendResetPasswordEmail: async (email: string) => {
    const user = await userService.getUserByEmail(email);
    if (user) {
      const token = createToken(user.id, email, "24h");
      const msg = {
        to: email,
        from: "contact@emiratesraffle.eco",
        templateId: "d-fbbc67e9fba24ad7b8412616ded2b66f",
        dynamicTemplateData: {
          firstName: user.firstName,
          ctaUrl: `${process.env.APP_BASE_URL}/reset-password/?token=${token}`,
        },
      };
      await sgMail.send(msg);
    }
  },

  confirmEmail: async (userId: string) => {
    try {
      const { userPoolId } = getCognitoConfig();
      await cognitoIdentityServiceProvider.adminUpdateUserAttributes({
        UserPoolId: userPoolId,
        Username: userId,
        UserAttributes: [
          {
            Name: "email_verified",
            Value: "true",
          },
        ],
      });
    } catch (error) {
      console.error(error);
      throw new Error("Failed to set password and verify email");
    }
  },

  getTokens: async (
    authFlow: string,
    authParams: Record<string, string>,
  ): Promise<AWS_CognitoIdentityServiceProvider.AuthenticationResultType> => {
    const { userPoolId, clientId } = getCognitoConfig();
    const response = await cognitoIdentityServiceProvider.adminInitiateAuth({
      UserPoolId: userPoolId,
      ClientId: clientId,
      AuthFlow: authFlow,
      AuthParameters: authParams,
    });

    if (response.AuthenticationResult) {
      return response.AuthenticationResult;
    } else {
      console.error(response);
      throw new Error("Failed to get tokens");
    }
  },

  getCognitoUserbyUsername: async (username: string): Promise<any> => {
    const { userPoolId } = getCognitoConfig();
    const response = await cognitoIdentityServiceProvider.adminGetUser({
      UserPoolId: userPoolId,
      Username: username,
    });

    return response;
  },

  getCognitoUsersbyGroupName: async (group: string): Promise<any> => {
    const { userPoolId } = getCognitoConfig();
    const response = await cognitoIdentityServiceProvider.listUsersInGroup({
      UserPoolId: userPoolId,
      GroupName: group,
    });
    return response;
  },

  loginUser: async (
    username: string,
    password: string,
  ): Promise<AWS_CognitoIdentityServiceProvider.AuthenticationResultType> => {
    return await authService.getTokens("ADMIN_NO_SRP_AUTH", {
      USERNAME: username,
      PASSWORD: password,
    });
  },

  refreshTokens: async (
    refreshToken: string,
  ): Promise<AWS_CognitoIdentityServiceProvider.AuthenticationResultType> => {
    const tokens = await authService.getTokens("REFRESH_TOKEN", {
      //TODO: Might need to refresh the refresh token
      REFRESH_TOKEN: refreshToken,
    });
    tokens.RefreshToken = refreshToken;
    return tokens;
  },
};
