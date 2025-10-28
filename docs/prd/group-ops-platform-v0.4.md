# Product: Group Ops Platform (Working Name)

Infra-ready platform for managing group events, RSVPs, attendance, penalties, stats, wallets, and payment flows across recurring social groups.

This version focuses on operationalizing the sandbox environment so we can deploy, smoke test, and start iterating.

---

## 🔢 Version History

| Version  | Summary                                                                                                      | Date           |
| -------- | ------------------------------------------------------------------------------------------------------------ | -------------- |
| v0.1     | Core features + roles                                                                                        | 2025-10-26     |
| v0.2     | Added infra, IaC w/ CloudFormation, multi-env, CI/CD, Atlas Search, migration model                          | 2025-10-27     |
| v0.3     | Added repo structure, ownership model, branching model (sandbox/qa/prod), AI workflow between PRD & design   | 2025-10-27     |
| **v0.4** | Sandbox deployment hardening: healthcheck query, build packaging fixes, S3 bucket naming, Secrets, CI parity | **2025-10-28** |

---

## 1. Goal of v0.4

Make the `sandbox` branch deployable end-to-end and verifiable automatically.

We are NOT adding new business features in v0.4.
We are closing the gaps that would block:

* CloudFormation standing up sandbox infra,
* Lambdas receiving working code,
* Mongo + Atlas Search being initialized,
* CI/CD finishing green,
* A basic smoke test succeeding.

After v0.4:

* Pushing to `sandbox` should create/update infra,
* Run DB migrations,
* Deploy runtime code,
* And confirm API health.

This is required before we introduce money (Stripe) and chat bots in future PRDs.

---

## 2. Required Changes in v0.4

### 2.1 GraphQL health query (MUST ADD)

Problem right now:

* The CI/CD pipeline (`smoke-tests` job in `/infra/github-actions/deploy-sandbox.yml`) tries to curl the deployed GraphQL endpoint to confirm it's alive.
* It sends a generic query but the schema we saw doesn’t clearly expose a guaranteed public, unauthenticated probe.

Requirement:

* Add a guaranteed public query to the GraphQL schema:

  ```graphql
  type HealthStatus {
    status: String!
    env: String!
    timestamp: DateTime!
  }

  extend type Query {
    health: HealthStatus!
  }
  ```

Rules:

* `health` must:

  * not require auth,
  * return `{ status: "ok", env: "sandbox" | "qa" | "prod", timestamp: now }`,
  * be implemented in the GraphQL Lambda.

CI Impact:

* Update the smoke test in the GitHub Action to call this exact query:

  ```bash
  curl -s -X POST "$API_URL/graphql" \
    -H 'Content-Type: application/json' \
    -d '{"query":"{ health { status env timestamp } }"}'
  ```
* Deployment to sandbox is considered successful if this returns HTTP 200 and `status` = "ok".

Why this matters:

* Infra teams and future contributors can validate the stack without needing to create a user, OTP, or org.

### 2.2 Build & packaging alignment for Lambdas (MUST FIX)

Problem right now:

* The workflow builds TypeScript, then zips from `src/api` and `src/auth`, and excludes `*.ts`, etc.
* Our repo currently does not include built JS at `src/...`, and `src/auth` may not even exist yet.
* Lambda `Code` will end up being invalid or empty at first deploy.

Requirements:

1. The project MUST define `npm run build` to transpile all Lambda sources (GraphQL handler, Auth/OTP handler, etc.) into `dist/` (or similar).

2. After build, packaging MUST zip from the compiled JS output, not from raw TS.

   * Example expected structure after build:

     * `dist/api/**` → GraphQL Lambda runtime code
     * `dist/auth/**` → Auth Lambda runtime code
   * The GitHub Action should zip `dist/api/**` into `dist/lambdas/graphql.zip` and `dist/auth/**` into `dist/lambdas/auth.zip`.

3. If `src/auth` does not exist yet, Claude MUST generate it now:

   * It should expose at least:

     * an OTP request handler,
     * and a stub OTP verify handler,
     * matching PRD expectations that auth is phone-number OTP only.

4. The Lambda handlers referenced in CloudFormation (`GraphQLFunction`, `AuthFunction`) MUST map to the actual exported handler from those built files (e.g. `index.handler`).

CI Impact:

* Update `/infra/github-actions/deploy-sandbox.yml` "Build Application" job so it zips from `dist/...` not `src/...`.
* Ensure the uploaded S3 keys (`graphql.zip`, `auth.zip`) match the names you later pass to `aws lambda update-function-code`.

### 2.3 CloudFormation + pipeline contract consistency (MUST VERIFY/LOCK)

Observation:

* `/infra/cloudformation/sandbox-stack.yml` defines Outputs like `ApiEndpoint`, and the workflow in `deploy-sandbox.yml` tries to read that exact OutputKey. ✅ Good.
* Stack also creates Lambdas named `${StackName}-graphql` and `${StackName}-auth`. The workflow uses those names to call `aws lambda update-function-code`. ✅ Good.
* The stack in this repo creates:

  * VPC + subnets
  * Lambda execution role
  * API Gateway HTTP API
  * Redis (ElastiCache)
  * LogGroups
  * Routes `/graphql` and (implied) `/auth/otp`
  * Outputs: `ApiEndpoint`, `GraphQLFunctionArn`, `AuthFunctionArn`, etc.

Requirements:

1. The generated CloudFormation must continue to expose:

   ```yaml
   Outputs:
     ApiEndpoint:
       Description: API Gateway endpoint URL
       Value: https://.../${Environment}
   ```

   This is contract. Do not rename `ApiEndpoint` or the workflow breaks.

2. Any route expected by smoke tests must exist:

   * The smoke tests currently hit `/graphql` (good) and `/auth/otp` (check required).
   * Claude MUST confirm that `/auth/otp` is actually wired:

     * API Gateway → Lambda integration for AuthFunction
     * RouteKey: `POST /auth/otp`
     * Lambda permission resource
   * If this is missing, either:

     * add it in CloudFormation, OR
     * remove `/auth/otp` from smoke tests (and rely only on `health` GraphQL query).
       v0.4 requirement: we must not ship a smoke test that always fails.

3. That S3 bucket in the workflow (`group-ops-lambda-deployments-${ENVIRONMENT}`) is currently created ad-hoc in CI.
   This is risky because:

   * S3 names are global-unique.
   * It’s not fully IaC.

   Requirement for v0.4:

   * Add a unique suffix to that bucket name in the workflow, e.g. `${{ env.ENVIRONMENT }}-${{ github.repository_owner }}`.
   * In v0.5 we will move S3 bucket creation into CloudFormation and output it, but for now v0.4 only requires making the bucket name collision-resistant.

### 2.4 Secrets & runtime config expectations (MUST CLARIFY)

Observation:

* The workflow pulls MongoDB URI from AWS Secrets Manager (`group-ops/mongodb`) using `aws secretsmanager get-secret-value` and then injects `MONGODB_URI` env to migrations.
* That’s excellent, but: the Lambdas in CloudFormation need that same info to run at runtime.

Requirements:

1. CloudFormation template MUST set Lambda environment variables for:

   * `MONGODB_URI`
   * `ENVIRONMENT`
   * (later: `STRIPE_KEY`, `OTP_PROVIDER_KEY`, etc., but not needed in v0.4)
2. For v0.4, it's acceptable if `MONGODB_URI` is passed in as a CloudFormation Parameter or hardcoded placeholder. Long term (v0.5) we will fetch from Secrets Manager at deploy time and inject, but that's not required yet.
3. The migration runner and Lambdas must assume the same DB name / same collections to avoid "works in runner, fails in runtime."

Deployment checklist:

* Claude must update `sandbox-stack.yml` so `GraphQLFunction` and `AuthFunction` include `Environment` / `MONGODB_URI` in `Environment.Variables`.
* `ENVIRONMENT` should come from the `Environment` Parameter in the stack.

### 2.5 Migration runner contract (MUST HARDEN)

Observation:

* Repo includes:

  * `/infra/migrations/init-schema.ts` (creates collections, indexes, validation rules, etc.)
  * `/infra/scripts/migration-runner.ts` (CLI for running migrations + search index sync)
  * `/infra/atlas-indexes/events.json` (Atlas Search index definition for `events`)

* The GitHub Action calls:

  * `npm run migrate:dry-run`
  * `npm run migrate:up`
  * `npm run sync:search-indexes`

Requirements:

1. Claude MUST generate/update `package.json` with these scripts so CI can run:

   ```json
   "scripts": {
     "migrate:dry-run": "ts-node infra/scripts/migration-runner.ts --dry-run",
     "migrate:up": "ts-node infra/scripts/migration-runner.ts up",
     "sync:search-indexes": "ts-node infra/scripts/migration-runner.ts sync-search",
     "lint": "eslint .",
     "type-check": "tsc --noEmit",
     "test:unit": "jest --runInBand",
     "build": "tsc -p tsconfig.json"
   }
   ```

   (If some of these commands differ in Claude's CLI parser, Claude must align both sides. The pipeline and the code must match.)

2. The migration runner MUST:

   * create a `_migrations` (or similar) collection,
   * write a record per applied migration with:

     * id
     * description
     * appliedAt
     * status
   * skip already-applied migrations on subsequent deploys (idempotent).

3. The Atlas Search sync step MUST:

   * read `/infra/atlas-indexes/events.json`
   * upsert or update the Atlas Search index on the `events` collection in the sandbox cluster.

This is now contract for sandbox deploys.

### 2.6 .gitignore / repo hygiene (MUST ENFORCE)

Observation:

* Repo already includes `.gitignore` that ignores:

  * node_modules
  * dist
  * .claude/
  * .env*
  * infra/cloudformation/tmp
    etc.
    ✅ Good.

New requirement:

* We must not commit `.claude` or any local AI scratch directories.
* We must not commit real secrets (`.env`, connection strings, Stripe keys, etc.).

PRD v0.4 requirement:

* Add a root `CONTRIBUTING.md` (Claude should generate) that states:

  * Do not commit `.claude/`, `.env*`, or real creds.
  * All infra/code changes must be made in PRs to `sandbox` and reviewed.
  * All infrastructure and DB/index/index-search changes must be represented in code before merge (no console-only edits allowed).

---

## 3. New Artifacts Required from Claude for v0.4

Claude must now generate or modify the following files to align with the new requirements:

1. `/docs/design/system-design-v0.2.md`

   * Update the architecture doc to include:

     * the health check query and how it's exposed
     * environment variables required by Lambdas
     * where Secrets Manager fits for sandbox

2. `src/api/schema.graphql`

   * Add `type HealthStatus` and `Query.health` exactly as defined in §2.1.
   * Ensure `Query` and `Mutation` root types still match Phase 1 entities
     (Users, Organizations, Events, RSVP, Attendance, Wallet/Transactions).

3. `src/api/graphql-handler.ts` (or equivalent entrypoint for GraphQL Lambda)

   * Implement resolver for `health`.
   * Return `status: "ok"`, `env` from `process.env.ENVIRONMENT`, `timestamp: new Date()`.

   If this file doesn’t exist yet, Claude must create it and ensure CloudFormation’s `GraphQLFunction` points to this handler after build.

4. `src/auth/otp-handler.ts`

   * Claude must add this folder/file if missing.
   * Handler must accept a request that includes `phoneNumber` (string).
   * For now it can stub: validate shape, respond 200 with `{ success: true }`.
   * CloudFormation `AuthFunction` must point to this handler after build.
   * The smoke test in CI must call the correct shape.
     (Rename field from `phoneOrEmail` → `phoneNumber` to match PRD “phone only”.)

5. `/infra/github-actions/deploy-sandbox.yml`

   * Update build step to zip compiled JS in `dist/api` and `dist/auth` instead of zipping raw TS in `src/`.

   * Update smoke test:

     * For GraphQL: hit `health`.
     * For Auth: either (a) actually hit `/auth/otp` with `phoneNumber`, and ensure that route is wired through API Gateway, OR (b) remove the auth smoke test for now if not wired, and rely only on GraphQL `health` to pass.

   * Update S3 bucket naming to include a uniqueness suffix like:
     `group-ops-lambda-${{ env.ENVIRONMENT }}-${{ github.repository_owner }}`

6. `/infra/cloudformation/sandbox-stack.yml`

   * Ensure:

     * `Outputs.ApiEndpoint` stays named exactly `ApiEndpoint`.
     * Both Lambdas have `Environment.Variables` including `ENVIRONMENT` and a placeholder `MONGODB_URI`.
     * API Gateway has:

       * `POST /graphql` → GraphQLFunction
       * Optional: `POST /auth/otp` → AuthFunction (if we keep the auth smoke test)
     * GraphQLFunction and AuthFunction `Code` sections can continue to use inline `ZipFile` placeholders for now, BUT Claude must document in comments that runtime code will then be overridden by the `aws lambda update-function-code` step in CI. (This matches our workflow right now.)

7. `/CONTRIBUTING.md`

   * Add contributor rules:

     * Don’t commit secrets or `.claude/`.
     * All schema/index changes must land as migration scripts under `infra/migrations/`.
     * All infra changes must go through CloudFormation templates in `infra/cloudformation/`.
     * The only branches that trigger deployment are `sandbox`, `qa`, `prod`.

---

## 4. Phase Summary

### Phase 1 (unchanged from v0.3)

User-facing MVP:

* Orgs / membership / roles
* OTP auth (phone)
* Event creation & RSVP
* Attendance & penalties (manual trigger)
* Wallet stub + ledger model
* Basic stats
* WhatsApp bot not deployed yet (that’s future)
  Infra:
* Atlas Search for events
* CloudFormation IaC
* GitHub Actions pipeline
* Mongo migrations + index versioning

### Phase 1.1 (this PRD v0.4)

* Add health check query
* Align build artifacts and Lambda packaging so sandbox deploy actually works
* Ensure CloudFormation + CI + runtime code agree on naming, outputs, routes
* Add environment variables to Lambdas
* Add OTP auth Lambda stub + route
* Add CONTRIBUTING.md + no secrets, no console-only changes rule
* Make S3 bucket naming collision-resistant
* Stabilize migration runner contract and `package.json` scripts

This is all about making the sandbox deploy green and testable with one push to the `sandbox` branch.

---

## 5. After v0.4 (future v0.5 preview)

Once we can deploy and hit `health`, v0.5 will introduce:

* Wallet top-up flow with Stripe (test mode).
* First WhatsApp/Telegram bot contract (RSVP IN/OUT).
* Attendance marking flows via API.
* Conflict/calendar surfacing.
* Surface-level reputation stats.

But none of that starts until sandbox infra is actually alive and callable.

End of PRD v0.4.
