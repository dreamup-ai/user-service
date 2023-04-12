Object.assign(process.env, {
  AWS_REGION: "us-east-1",
  DYNAMODB_ENDPOINT: "http://localhost:8000",
  SQS_ENDPOINT: "http://localhost:4566/",
  COGNITO_USER_POOL_ID: "us-east-1_123456789",
  PUBLIC_KEY_PATH: "./test/fixtures/cognito_key.pub",
});
