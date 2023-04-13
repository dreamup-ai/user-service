"use strict";
Object.assign(process.env, {
    AWS_REGION: "us-east-1",
    AWS_ACCESS_KEY_ID: "test",
    AWS_SECRET_ACCESS_KEY: "test",
    DYNAMODB_ENDPOINT: "http://localhost:8000",
    SQS_ENDPOINT: "http://localhost:4566/",
    COGNITO_IDP_ENDPOINT: "http://localhost:4566/",
    COGNITO_USER_POOL_ID: "us-east-1_123456789",
    COGNITO_PUBLIC_KEY_PATH: "./test/fixtures/cognito_key.pub",
    COGNITO_PRIVATE_KEY_PATH: "./test/fixtures/cognito_key",
    USER_TABLE: "users",
    WEBHOOK_PUBLIC_KEY_PATH: "./test/fixtures/webhook_key.pub",
    WEBHOOK_PRIVATE_KEY_PATH: "./test/fixtures/webhook_key",
});
