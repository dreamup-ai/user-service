import { FromSchema } from "json-schema-to-ts";

export const initialDimensionsSchema = {
  type: "object",
  properties: {
    height: {
      type: "integer",
      default: 512,
      minimum: 64,
      maximum: 1024,
      multipleOf: 8,
    },
    width: {
      type: "integer",
      default: 512,
      minimum: 64,
      maximum: 1024,
      multipleOf: 8,
    },
  },
} as const;

export type InitialDimensions = FromSchema<typeof initialDimensionsSchema>;

export const userPreferencesSchema = {
  allOf: [
    initialDimensionsSchema,
    {
      type: "object",
      description:
        "An object describing application defaults as configured by the user",
      properties: {
        model: {
          type: "string",
          description: "Default model",
        },
        prompt: {
          type: "string",
          description: "Default prompt",
        },
        negative_prompt: {
          type: "string",
          description: "Default negative prompt",
        },
        collection_sort_order: {
          type: "string",
          enum: ["asc", "desc"],
        },
      },
    },
  ],
} as const;

export type UserPreferences = FromSchema<typeof userPreferencesSchema>;

export const usernameSchema = {
  type: "string",
  pattern: "^[a-zA-Z0-9_\\-.]+$",
  minLength: 3,
  maxLength: 30,
  description: "A public facing username for the user",
} as const;

export type Username = FromSchema<typeof usernameSchema>;

export const userUpdateSchema = {
  type: "object",
  properties: {
    username: usernameSchema,
    preferences: userPreferencesSchema,
  },
} as const;

export type UserUpdate = FromSchema<typeof userUpdateSchema>;

export const appFeaturesSchema = {
  type: "object",
  description: "Features that can be toggled per-user",
  properties: {
    large_start_image: {
      type: "boolean",
      description: "The user can use the largest available starting image size",
    },
  },
} as const;

export type AppFeatures = FromSchema<typeof appFeaturesSchema>;

export const systemUserUpdateSchema = {
  allOf: [
    userUpdateSchema,
    {
      type: "object",
      description: "The system-updatable fields of the user object",
      required: ["email"],
      properties: {
        features: appFeaturesSchema,
        email: {
          type: "string",
          format: "email",
          description: "The login email for the user. Not for public display",
        },
        terms: {
          type: "object",
          description: "The user's terms of service acceptance",
          properties: {
            accepted: {
              type: "boolean",
              description: "Whether the user has accepted the terms",
            },
            accepted_at: {
              type: "integer",
              description:
                "The unix timestamp in ms of when the user accepted the terms",
            },
            version: {
              type: "string",
              description: "The version of the terms the user accepted",
            },
          },
        },
      },
    },
  ],
} as const;

export type SystemUserUpdate = FromSchema<typeof systemUserUpdateSchema>;

export const publicUserSchema = {
  allOf: [
    systemUserUpdateSchema,
    {
      type: "object",
      description: "The User object",
      required: ["id", "created"],
      properties: {
        id: {
          type: "string",
          format: "uuid",
          description: "This corresponds to the user's id in the IDP",
        },
        created: {
          type: "integer",
          description: "The unix timestamp in ms of when the user was created",
        },
        updated: {
          type: "integer",
          description:
            "The unix timestamp in ms of when the user was last updated",
        },
      },
    },
  ],
} as const;

export type PublicUser = FromSchema<typeof publicUserSchema>;

export const privateUserFieldsSchema = {
  type: "object",
  required: ["_queue"],
  properties: {
    "_idp:cognito:id": {
      type: "string",
      description: "The user's 'sub' (unique id) in Cognito",
    },
    "_idp:google:id": {
      type: "string",
      description: "The user's unique id in Google",
    },
    "_idp:discord:id": {
      type: "string",
      description: "The user's unique id in Discord",
    },
    _queue: {
      type: "string",
      description: "The user's queue",
    },
  },
} as const;

export type PrivateUserFields = FromSchema<typeof privateUserFieldsSchema>;

export const rawUserSchema = {
  allOf: [publicUserSchema, privateUserFieldsSchema],
} as const;

export type RawUser = FromSchema<typeof rawUserSchema>;

export const deletedResponseSchema = {
  type: "object",
  properties: {
    deleted: {
      type: "boolean",
      default: true,
    },
    id: {
      type: "string",
      format: "uuid4",
    },
  },
} as const;

export type DeletedResponse = FromSchema<typeof deletedResponseSchema>;

export const errorResponseSchema = {
  type: "object",
  properties: {
    error: {
      type: "string",
    },
  },
} as const;

export type ErrorResponse = FromSchema<typeof errorResponseSchema>;

export const paginationTokenSchema = {
  type: "string",
  description: "A token to be used in the next request to get the next page",
  nullable: true,
} as const;

export type PaginationToken = FromSchema<typeof paginationTokenSchema>;

export const cognitoNewUserPayloadSchema = {
  type: "object",
  properties: {
    version: {
      type: "string",
    },
    region: {
      type: "string",
    },
    userPoolId: {
      type: "string",
    },
    userName: {
      type: "string",
    },
    callerContext: {
      type: "object",
      properties: {
        awsSdkVersion: {
          type: "string",
        },
        clientId: {
          type: "string",
        },
      },
      required: ["awsSdkVersion", "clientId"],
    },
    triggerSource: {
      type: "string",
    },
    request: {
      type: "object",
      properties: {
        userAttributes: {
          type: "object",
          properties: {
            sub: {
              type: "string",
            },
            email_verified: {
              type: "string",
            },
            "cognito:user_status": {
              type: "string",
            },
            "cognito:email_alias": {
              type: "string",
            },
            email: {
              type: "string",
            },
          },
          required: [
            "sub",
            "email_verified",
            "cognito:user_status",
            "cognito:email_alias",
            "email",
          ],
        },
      },
      required: ["userAttributes"],
    },
    response: {
      type: "object",
    },
  },
  required: [
    "version",
    "region",
    "userPoolId",
    "userName",
    "callerContext",
    "triggerSource",
    "request",
  ],
} as const;

export type CognitoNewUserPayload = FromSchema<
  typeof cognitoNewUserPayloadSchema
>;

export const SignatureHeaderSchema = {
  type: "object",
  properties: {},
  additionalProperties: {
    type: "string",
    pattern: "^x-w+-signature$",
  },
} as const;

export type SignatureHeader = FromSchema<typeof SignatureHeaderSchema>;

export const oauthQueryStringSchema = {
  type: "object",
  properties: {
    code: {
      type: "string",
    },
    state: {
      type: "string",
    },
  },
  additionalProperties: {
    type: "string",
  },
  required: ["code", "state"],
} as const;

export type OAuthQueryString = FromSchema<typeof oauthQueryStringSchema>;

// Generated by https://quicktype.io
export interface CognitoToken {
  at_hash: string;
  sub: string;
  email_verified: boolean;
  iss: string;
  "cognito:username": string;
  origin_jti: string;
  aud: string;
  token_use: string;
  auth_time: number;
  exp: number;
  iat: number;
  jti: string;
  email: string;
}

// Generated by https://quicktype.io
export interface GoogleToken {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  hd: string;
  email: string;
  email_verified: boolean;
  at_hash: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: number;
  exp: number;
}

export interface DiscordToken {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
  expires_at: Date;
}

// Generated by https://quicktype.io
export interface DiscordUser {
  id: string;
  username: string;
  global_name: string;
  display_name: string;
  avatar: string;
  discriminator: string;
  public_flags: string;
  flags: string;
  banner: string;
  banner_color: string;
  accent_color: string;
  locale: string;
  mfa_enabled: string;
  premium_type: string;
  avatar_decoration: string;
  email: string;
  verified: string;
}

export const idParamSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
    },
  },
} as const;

export type IdParam = FromSchema<typeof idParamSchema>;
