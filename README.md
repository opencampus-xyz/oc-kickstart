# OC Kickstart

This is a template application using OCID connect and OC Achievements.
This project uses NextJS, ExpressJS and PostgreSQL.

## Pre-requisites

Please make sure you have nodeJS, yarn and docker installed, and have at least one OCID as the master admin OCID.

If you do not have a developer account yet, please follow the instructions in https://devdocs.educhain.xyz/start-building/open-campus-achievements/integration-guide
to sign up for a developer account and get the API keys and Client ID, which will be used in the backend environment variables.

## Installation

### Backend

1. Go to the `backend` directory
2. Copy `.env.example` to `.env` and update the environment variables
3. Run `docker compose up -build` to spin up the backend with a postgreSQL database on the `DB_PORT` specified in `.env`

### Frontend

1. Go to the `frontend` directory
2. Copy `.env.example` to `.env` and update the environment variables
3. You may configure the app metadata in `config.js`
4. Run `yarn install` to install the dependencies
5. Run `yarn dev` to start the client at http://localhost:3001

## Environment Variables

### Backend

| Name                 | Description                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| DB_HOST              | Database Hostname                                                                                                                     |
| DB_USER              | Database Username                                                                                                                     |
| DB_PASSWORD          | Database Password                                                                                                                     |
| DB_DATABASE          | Default database                                                                                                                      |
| DB_PORT              | Database Port                                                                                                                         |
| MASTER_ADMIN_OCID    | The OCID of the master admin                                                                                                          |
| JWK_URL              | Sandbox: https://static.opencampus.xyz/jwks/jwks-sandbox.json<br>Production: https://static.opencampus.xyz/jwks/jwks-live.json        |
| AUTH_CLIENT_ID       | Your Auth Client ID for OCID Connect                                                                                                  |
| OCA_ISSUANCE_URL     | Sandbox: https://api.vc.staging.opencampus.xyz/issuer/vc<br>Production: https://api.vc.opencampus.xyz/issuer/vc                       |
| OCA_ISSUANCE_API_KEY | Your OCA issuance API Key                                                                                                             |
| CREDENTIALS_URL      | Sandbox: https://api.credentials.staging.opencampus.xyz/credentials<br>Production: https://api.credentials.opencampus.xyz/credentials |
| METADATA_URL         | Sandbox: https://metadata.vc.staging.opencampus.xyz/metadata<br>Production: https://metadata.vc.opencampus.xyz/metadata               |
| VC_ISSUANCE_INTERVAL | VC Issuer job interval in seconds                                                                                                     |

### Frontend

| Name                          | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| NEXT_PUBLIC_BACKEND_URL       | The backend service URL                        |
| NEXT_PUBLIC_SSO_COOKIE_DOMAIN | The Cookie Domain                              |
| NEXT_PUBLIC_SANDBOX_MODE      | Whether the OCID connect is using sandbox mode |
| NEXT_PUBLIC_AUTH_CLIENT_ID    | Your Auth Client ID for OCID Connect           |
| NEXT_PUBLIC_DB_MODE           | Which Database mode you are using (indexeddb/backend)|
| NEXT_PUBLIC_DEMO_MODE         | Whether you are in DEMO mode(db must be in indexed mode)|
| NEXT_PUBLIC_JWK_URL           | Not needed if not in Indedexed DB mode         |
| NEXT_PUBLIC_OCA_ISSUANCE_URL  | Not needed if not in Indedexed DB mode         |
| NEXT_PUBLIC_OCA_ISSUANCE_API_KEY| Not needed if not in Indedexed DB mode         |
| NEXT_PUBLIC_VC_ISSUANCE_INTERVAL| Not needed if not in Indedexed DB mode         |


## Remark

If your account is signed up through sandbox mode in this app, please log in https://id.sandbox.opencampus.xyz/ to verify the account is working before proceeding.

## References

- OCID connect: https://github.com/opencampus-xyz/ocid-connect-js/tree/main
- OC Achievements: https://devdocs.educhain.xyz/start-building/open-campus-achievements/introduction
