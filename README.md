# Atomclass Server

An Express + TypeScript backend powering the Atomclass platform. The service integrates with PostgreSQL via TypeORM, AWS Cognito for authentication

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment variables** (see [Environment](#environment))
3. **Run the development server**
   ```bash
   npm run dev
   ```
4. Optional: run migrations once the database is reachable
   ```bash
   npm run migrate-up
   ```

## Environment

Create a `.env` (and optionally `.env.development`, `.env.production`) with the following keys. Secrets should never be committed.

```dotenv
NODE_ENV=development
PORT=3000
PUBLIC_APP_URL=http://localhost:3000

DEV_DB_USERNAME=
DEV_DB_PASSWORD=
DEV_DB_NAME=
DEV_DB_HOST=
DEV_DB_PORT=5432
DB_SSL=false

AWS_REGION=
AWS_COGNITO_CLIENT_ID=
AWS_COGNITO_CLIENT_SECRET=
AWS_COGNITO_USER_POOL_ID=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=

TYPEORM_SYNCHRONIZE=false
TYPEORM_LOGGING=false
```

For production deployments set the corresponding `DB_*` variables (without the `DEV_` prefix) and mark `DB_SSL=true`.

## Scripts

- `npm run dev` – start the server with `ts-node` and reload support
- `npm run build` – compile TypeScript to the `dist` directory
- `npm run start` – serve the compiled output
- `npm run typecheck` – run `tsc` without emitting files
- `npm run lint` / `npm run lint:fix` – static analysis with ESLint
- `npm test` – type check and lint the project
- `npm run format:write` / `npm run format:check` – Prettier formatting utilities
- `npm run migrate-up` / `npm run migrate-down` – TypeORM migrations

## Conventions

- TypeScript is configured with strict settings; keep new modules strongly typed.
- Use the shared helpers in `src/utils` for OTP, Cognito token parsing, etc. to avoid duplicating logic.
- Prefer dependency injection via constructors or service functions to simplify testing.
- New routes should mount under `src/routes` and include explicit authentication/authorization checks.

## Security Notes

- All credentials (database, AWS, Cognito) must be supplied via environment variables.
- Keep `TYPEORM_SYNCHRONIZE=false` in production; rely on migrations for schema changes.
- File uploads validate configuration at runtime and should be fronted by API-level validation of allowed MIME types.
- Never expose password reset links or tokens in API responses.

## Troubleshooting

- Ensure the database is reachable from your environment when initializing the `AppDataSource`.
- When modifying entity definitions, generate and run migrations to keep production in sync.
- Failed file uploads often indicate missing AWS credentials or bucket misconfiguration—check the environment variables first.
