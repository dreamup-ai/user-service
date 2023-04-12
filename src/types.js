"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newUserHeaderSchema = exports.cognitoNewUserPayloadSchema = exports.paginationTokenSchema = exports.errorResponseSchema = exports.deletedResponseSchema = exports.userSchema = exports.systemUserUpdateSchema = exports.appFeaturesSchema = exports.userUpdateSchema = exports.usernameSchema = exports.userPreferencesSchema = exports.initialDimensionsSchema = void 0;
exports.initialDimensionsSchema = {
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
};
exports.userPreferencesSchema = {
    allOf: [
        exports.initialDimensionsSchema,
        {
            type: "object",
            description: "An object describing application defaults as configured by the user",
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
};
exports.usernameSchema = {
    type: "string",
    pattern: "^[a-zA-Z0-9_\\-.]+$",
    minLength: 3,
    maxLength: 30,
    description: "A public facing username for the user",
};
exports.userUpdateSchema = {
    type: "object",
    properties: {
        username: exports.usernameSchema,
        preferences: exports.userPreferencesSchema,
    },
};
exports.appFeaturesSchema = {
    type: "object",
    description: "Features that can be toggled per-user",
    properties: {
        large_start_image: {
            type: "boolean",
            description: "The user can use the largest available starting image size",
        },
    },
};
exports.systemUserUpdateSchema = {
    allOf: [
        exports.userUpdateSchema,
        {
            type: "object",
            description: "The system-updatable fields of the user object",
            required: ["email"],
            properties: {
                features: exports.appFeaturesSchema,
                email: {
                    type: "string",
                    format: "email",
                    description: "The login email for the user. Not for public display",
                },
            },
        },
    ],
};
exports.userSchema = {
    allOf: [
        exports.systemUserUpdateSchema,
        {
            type: "object",
            description: "The User object",
            required: ["id"],
            properties: {
                id: {
                    type: "string",
                    format: "uuid",
                    description: "This corresponds to the user's id in the IDP",
                },
            },
        },
    ],
};
exports.deletedResponseSchema = {
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
};
exports.errorResponseSchema = {
    type: "object",
    properties: {
        error: {
            type: "string",
        },
    },
};
exports.paginationTokenSchema = {
    type: "string",
    description: "A token to be used in the next request to get the next page",
    nullable: true,
};
exports.cognitoNewUserPayloadSchema = {
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
        "response",
    ],
};
exports.newUserHeaderSchema = {
    type: "object",
    properties: {
        "x-idp-signature": {
            type: "string",
            description: "The signature of the payload",
        },
    },
};
