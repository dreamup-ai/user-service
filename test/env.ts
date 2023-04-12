Object.assign(process.env, {
  AWS_REGION: "us-east-1",
  AWS_ACCESS_KEY_ID: "test",
  AWS_SECRET_ACCESS_KEY: "test",
  DYNAMODB_ENDPOINT: "http://localhost:8000",
  SQS_ENDPOINT: "http://localhost:4566/",
  COGNITO_IDP_ENDPOINT: "http://localhost:4566/",
  COGNITO_USER_POOL_ID: "us-east-1_123456789",
  PUBLIC_KEY_PATH: "./test/fixtures/cognito_key.pub",
  PRIVATE_KEY_PATH: "./test/fixtures/cognito_key",
  USER_TABLE: "users",
});
