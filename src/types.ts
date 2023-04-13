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

export const userSchema = {
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
        "idp:cognito": {
          type: "object",
          description: "The user's IDP data",
          properties: {
            userPoolId: {
              type: "string",
            },
            userId: {
              type: "string",
            },
          },
        },
      },
    },
  ],
} as const;

export type User = FromSchema<typeof userSchema>;

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

export const newUserHeaderSchema = {
  type: "object",
  properties: {
    "x-idp-signature": {
      type: "string",
      description: "The signature of the payload",
    },
  },
} as const;

export type NewUserHeader = FromSchema<typeof newUserHeaderSchema>;
