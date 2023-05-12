# user-service
A service for managing users in dreamup

## Docs

This service self-hosts swagger docs at `/docs`

## System Requirements

- Docker (including Compose)
- Node 18 (recommend using NVM)

## Getting Set Up To Develop

### Install dependencies

```shell
nvm use
npm install
npm run build
```

### Run Locally

This project uses `dotenv` to read environment files. Multi-environment setups are supported via the environment variable `APP_ENV`. On start, the server will load `.env.${APP_ENV}`. The `start` script and the `pipeline-service.yml` file both assume `APP_ENV=local`, so you will need to create a file in the root of the directory called `.env.local`. For most purposes, copying `.env.test` should be sufficient. The `.gitignore` contains a rule to ignore `.env*.local` files.

#### Run the server directly

```shell
# Build the project
npm run build

# Make sure dynamo is up, the user-service is up, and the pipeline table is created
npm run init-local

# Start the server
npm start
```

#### Run with docker

```shell
npm run compose-up

# OR

./scripts/up

# Down everything with

npm run compose-down

# OR

./scripts/down
```

You can pass any arguments supported by `docker compose up` and `docker compose down` when using the `up` and `down` scripts, respectively.

## Configuration

**UNDER CONSTRUCTION**

Check `src/config.ts` in the mean time.