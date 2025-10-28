# Product: Group Ops Platform (Working Name)

Single source of truth for group events, RSVPs, attendance, performance stats, payments, and reputation across IRL hobby groups.

This document defines **what** the system must do and **how** project artifacts should be organized for consistency across teams and AI tools.

---

## 🔢 Version History

| Version  | Summary                                                                                                     | Date           |
| -------- | ----------------------------------------------------------------------------------------------------------- | -------------- |
| v0.1     | Initial feature + architecture draft                                                                        | 2025-10-26     |
| v0.2     | Added infra, CloudFormation IaC, multi-env, CI/CD, Atlas Search integration                                 | 2025-10-27     |
| **v0.3** | Added standard repository and documentation structure; clarified separation of PRD vs Technical Design Docs | **2025-10-27** |

---

## 1. Product Overview

*(Same as v0.2 — full product description omitted for brevity in this summary; functional, technical, and phase requirements remain unchanged.)*

Please refer to v0.2 content for complete feature and infrastructure requirements.
All functional, technical, and non-functional specifications in v0.2 remain **in full effect**.

---

## 2. Documentation & Ownership Model

### 2.1 PRD (Product Requirements Document)

* Defines **what** the product must do, **why**, and any mandatory technical constraints.
* Maintained by: Product Owner / ChatGPT Atlas.
* Versioned as `/docs/prd/group-ops-platform-vX.Y.md`.
* Includes:

  * Goals, user roles, key flows, features.
  * Non-functional requirements (auth, infra, search, payments).
  * Deployment and environment strategy.
  * This repository structure section.

### 2.2 Technical Design Document (TDD)

* Defines **how** the PRD is implemented.
* Generated and maintained by Claude (or engineering team).
* Versioned as `/docs/design/system-design-vX.Y.md`.
* Includes:

  * System architecture overview (Lambda, API Gateway, GraphQL, MongoDB).
  * Data model diagrams.
  * GraphQL schema definitions.
  * Example queries/mutations/resolvers.
  * CloudFormation stack definitions.
  * CI/CD pipeline configuration.
  * Migration runner and Atlas Search index definitions.

### 2.3 Implementation Artifacts

* All generated code and configurations.
* Versioned alongside documentation, not in separate repos.
* Stored in structured folders to maintain portability and reproducibility.

---

## 3. Repository & Documentation Structure

### 3.1 High-Level Layout

```
root/
├── docs/
│   ├── prd/
│   │   ├── group-ops-platform-v0.1.md
│   │   ├── group-ops-platform-v0.2.md
│   │   ├── group-ops-platform-v0.3.md
│   │   └── changelog.md
│   ├── design/
│   │   ├── system-design-v0.1.md
│   │   ├── graphql-schema.graphql
│   │   └── architecture-diagram.png
│   └── README.md               ← quick link summary of latest docs
│
├── src/
│   ├── api/                    ← GraphQL resolvers, schema loaders, lambda handlers
│   ├── models/                 ← Mongo models, migrations, index definitions
│   ├── bots/                   ← WhatsApp / Telegram bot handlers
│   ├── web/                    ← Next.js app (pages, components, shadcn/ui)
│   └── shared/                 ← utils, types, constants
│
├── infra/
│   ├── cloudformation/         ← IaC templates for Lambda/API Gateway/Secrets
│   ├── github-actions/         ← CI/CD YAML workflows
│   ├── migrations/             ← TypeScript migration scripts (DB, indexes)
│   ├── atlas-indexes/          ← Atlas Search JSON index definitions
│   └── scripts/                ← migration runner CLI / helper tools
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .github/
│   └── workflows/              ← symbolic link or copy of /infra/github-actions
│
├── .env.example                ← example environment vars for local sandbox
├── package.json
├── README.md                   ← main project overview
└── LICENSE
```

### 3.2 Environment Branching Convention

| Branch    | Purpose                | Auto-Deployed To  | Approval Required |
| --------- | ---------------------- | ----------------- | ----------------- |
| `sandbox` | developer / playground | AWS sandbox stack | ❌                 |
| `qa`      | integration testing    | AWS qa stack      | ✅ manual approval |
| `prod`    | production             | AWS prod stack    | ✅ manual approval |

GitHub Actions in `/infra/github-actions` or `.github/workflows` will:

* Lint/test on PRs.
* Run DB/index migrations before deploy.
* Deploy CloudFormation stacks per environment branch.
* Block prod deploys if migrations or search index sync fail.

---

## 4. Artifact Hierarchy

| Artifact                 | Owned By                      | Description                            | Example Location                       |
| ------------------------ | ----------------------------- | -------------------------------------- | -------------------------------------- |
| **PRD (vX.Y)**           | Product Owner / ChatGPT Atlas | Defines *what* the system must achieve | `/docs/prd/group-ops-platform-v0.3.md` |
| **System Design (TDD)**  | Claude / Engineering          | Defines *how* to implement PRD         | `/docs/design/system-design-v0.1.md`   |
| **Code & IaC**           | Engineering / Claude          | Implemented services, schemas, infra   | `/src/`, `/infra/`                     |
| **CI/CD Pipelines**      | Engineering / Claude          | GitHub Actions, deployment rules       | `/infra/github-actions/`               |
| **DB Migrations**        | Engineering / Claude          | Schema/index management scripts        | `/infra/migrations/`                   |
| **Atlas Search Indexes** | Engineering / Claude          | JSON search definitions                | `/infra/atlas-indexes/`                |

---

## 5. Guidance for AI Collaboration

When working with AI tools:

1. **ChatGPT Atlas (this environment)**

   * Maintains and versions the PRD.
   * Produces updates (v0.4, etc.) when scope or standards change.

2. **Claude**

   * Consumes the latest PRD version.
   * Generates `system-design-vX.Y.md` plus initial code/infra artifacts.
   * Must reference this repository structure in its outputs.

3. **Workflow**

   * Claude outputs live under `/docs/design` and `/infra`.
   * Any new PRD version triggers regeneration of dependent artifacts.
   * No AI should modify existing PRD versions; all updates must create new ones.

---

## 6. Current Phase & Next Steps

* Latest PRD: **v0.3**
* Implementation partner: **Claude**
* Next required deliverables:

  * `docs/design/system-design-v0.1.md`
  * `src/api/schema.graphql` (Phase 1 subset)
  * `infra/cloudformation/sandbox-stack.yml`
  * `infra/github-actions/deploy-sandbox.yml`
  * `infra/migrations/init-schema.ts`
  * `infra/atlas-indexes/events.json`
  * `infra/scripts/migration-runner.ts`

After Claude produces these, results should be reviewed in ChatGPT Atlas for:

* Alignment with PRD v0.3.
* Readability and maintainability.
* Security best practices (OTP flow, Stripe, secrets handling).

---

## 7. Versioning and Future Work

* All changes to repository structure, tooling, or document ownership will appear in subsequent PRD versions.
* PRD updates continue to use incremental versioning (v0.4, v0.5, …).
* System Design docs and code artifacts use independent semantic versioning (e.g., `system-design-v1.0`, `backend-v1.2.0`).

End of PRD v0.3.
