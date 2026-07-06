# Finly Hub — Agent Guide

## Project Overview

Finly Hub is an AI-powered accounting productivity platform. It processes invoices via OCR + AI extraction, imports and categorizes transactions, reconciles bank statements against accounting records, generates financial reports with AI insights, and provides a RAG chatbot over uploaded documents.

**Target:** Investor demo with realistic mock data.

**Status:** MVP — all features implemented, ~27 bugs fixed, runs via `docker compose up`.

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | Java (Eclipse Temurin) | 21 |
| Framework | Spring Boot | 3.4.1 |
| Auth | Spring Security + JWT (jjwt) | 0.12.6 |
| Database | PostgreSQL + pgvector | 16 |
| Migrations | Liquibase (YAML) | — |
| PDF | Apache PDFBox | 3.0.3 |
| OCR | Tess4J (Tesseract) | 5.12.0 |
| Office | Apache POI | 5.3.0 |
| AI (Mock) | MockAiService (built-in) | — |
| AI (OpenAI) | com.theokanning.openai-gpt3-java | 0.18.2 |
| Frontend | React + TypeScript | 19 / 5.7 |
| Bundler | Vite | 6 |
| Styling | Tailwind CSS + shadcn/ui + Radix UI | 3.4 |
| Server State | TanStack Query | 5.62 |
| Charts | Recharts | 2.15 |
| Deployment | Docker Compose | — |

---

## Project Structure

```
finlyhub/
├── docker-compose.yml           # 3 services: postgres, backend, frontend
├── .env                         # Shared env vars (DB, JWT, AI provider)
├── postgres/init.sql            # CREATE EXTENSION vector
├── uploads/                     # User-uploaded files (mounted volume)
│
├── backend/
│   ├── Dockerfile               # Multi-stage (Maven → Alpine JRE + Tesseract)
│   ├── pom.xml                  # Spring Boot 3.4.1 parent
│   └── src/main/java/com/finlyhub/
│       ├── FinlyHubApplication.java
│       ├── config/              # Security, CORS, JWT, Web, OpenAi, Health
│       ├── common/              # AiService interface + impls, exceptions, DTOs, utils
│       ├── auth/                # Register, login, refresh, JWT
│       ├── user/                # Profile CRUD, roles
│       ├── invoice/             # Upload → OCR → AI extraction → approval
│       ├── document/            # Upload → parse → chunk → embed → index
│       ├── chatbot/             # Conversations, messages, RAG vector search
│       ├── transaction/         # CSV/XLSX import, AI categorization
│       ├── reconciliation/      # Bank vs accounting matching
│       ├── report/              # Aggregation, AI insights, PDF/Excel export
│       ├── dashboard/           # Aggregated KPI metrics
│       └── audit/               # Action/entity audit trail
│
├── frontend/
│   ├── Dockerfile               # Multi-stage (node:22 → nginx:alpine)
│   ├── nginx.conf               # SPA fallback, /api proxy to backend:8080
│   └── src/
│       ├── api/                 # 8 typed modules (auth, invoices, chatbot, etc.)
│       ├── types/               # TypeScript interfaces matching backend DTOs
│       ├── hooks/               # useAuth, useTheme (React Context)
│       ├── components/
│       │   ├── layout/          # AppLayout, Sidebar, Header
│       │   └── ui/              # 15 shadcn/ui primitives
│       └── features/            # 9 page components (one per feature)
```

---

## Coding Conventions

### General
- **No comments in code.** If something needs explanation, the code should be self-documenting.
- Use **short, meaningful names**. Prefer clarity over brevity.
- No emojis in code or UI unless explicitly requested.

### Backend (Java)
- **Lombok**: `@RequiredArgsConstructor` for DI, `@Getter`/`@Setter` on entities, `@Data` on DTOs.
- **No MapStruct annotation processing.** All mappers are hand-written `@Component` classes with explicit field mappings (e.g., `InvoiceMapper.java`, `DocumentMapper.java`).
- **Entities**: `@PrePersist`/`@PreUpdate` lifecycle hooks for timestamp management. `@ManyToOne(fetch = FetchType.LAZY)` for all relationships.
- **DTOs**: Use `@Builder` for response DTOs, `@Data` for request DTOs.
- **Controllers**: Return `ResponseEntity<ApiResponse<T>>` using `ApiResponse.success()` / `ApiResponse.error()`.
- **Services**: Inject via constructor (`@RequiredArgsConstructor`). Add `@Transactional(readOnly = true)` on read methods that access lazy associations.
- **`@Lob` is banned.** Use `@Column(columnDefinition = "TEXT")` instead — `@Lob` forces CLOB/OID in PostgreSQL and causes `Bad value for type long` errors.
- **Package structure**: `entity/`, `repository/`, `service/`, `controller/`, `dto/`, `mapper/` within each feature package.

### Frontend (TypeScript/React)
- **Named exports only.** No `export default` (except `App`).
- **Imports**: Use `@/` path alias (`import { Button } from '@/components/ui/button'`).
- **API calls**: Type via `AxiosResponse<ApiResponse<T>>`. Use the dedicated module files in `src/api/`.
- **Server state**: Use TanStack Query (`useQuery` / `useMutation`). No Redux or Zustand.
- **Auth state**: Via `useAuth()` hook (React Context + localStorage).
- **Theme state**: Via `useTheme()` hook (React Context + localStorage + `.dark` class on `<html>`).
- **Forms**: `react-hook-form` + `zod` validation schemas.
- **File uploads**: `react-dropzone` + `FormData` + `multipart/form-data`.
- **Styling**: Tailwind utility classes + `cn()` from `lib/utils.ts` for class merging. Use shadcn/ui primitives from `components/ui/`.

### Database (Liquibase YAML)
- **All schema changes in YAML.** Never use Hibernate `ddl-auto`.
- **Naming**: `V<NNN>__<descriptive_name>.yaml` for changelogs.
- **PKs**: `BIGSERIAL` with `primaryKey: true`.
- **Timestamps**: `TIMESTAMP WITH TIME ZONE` with `defaultValueComputed: NOW()`.
- **Monetary amounts**: `DECIMAL(15, 2)`.
- **Metadata / flexible data**: `JSONB`.
- **IDs**: `BIGINT` for all FK columns.
- **Seed data** uses `context: demo` to gate demo data. Always use `valueComputed` for FK references instead of hardcoded IDs.

---

## API Patterns

- **Base URL**: `/api/*` (proxied by nginx in production, Vite dev server in development).
- **Envelope**: Every response wraps in `ApiResponse<T>` (`{success, message, data, timestamp}`).
- **Auth**: JWT `accessToken` in `Authorization: Bearer <token>` header. `refreshToken` in request body for `/auth/refresh`.
- **Current user**: Use `SecurityUtils.getCurrentUserId()` or `SecurityUtils.getCurrentUser()` in service/controller code.
- **Pagination**: Spring Data `Pageable` for list endpoints (e.g., invoices). Returns paginated structure in `data.content`.
- **Errors**: `GlobalExceptionHandler` maps exceptions to HTTP codes (400/401/403/404/409/422/500).

---

## CI/CD Pipeline

- **GitHub Actions** — `.github/workflows/deploy.yml` triggers on push to `main`
- **Deploy**: SSH into EC2 via `appleboy/ssh-action`, runs `git pull && docker compose up -d --build`
- **Secrets** stored in GitHub repo: `EC2_HOST`, `EC2_USERNAME`, `EC2_SSH_KEY`
- **Secrets for production** (JWT, DB password) stored in AWS SSM Parameter Store, fetched by `deploy/deploy.sh`

## Testing

- **No tests exist yet.** The project was built for a demo, not production.
- **Verification**: Run `docker compose up -d` and test endpoints via curl or the frontend.
- **Demo users**: `admin@finlyhub.com`, `accountant@finlyhub.com`, `viewer@finlyhub.com` — all with password `password`.

---

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| `@Lob` on TEXT column | `Bad value for type long ... [content text]` | Remove `@Lob`, keep `@Column(columnDefinition = "TEXT")` |
| Missing `@Transactional(readOnly = true)` | `LazyInitializationException - no session` | Add annotation to read methods that map lazy associations |
| `VITE_API_URL` in docker-compose has no effect | Wrong API URL in production | Vite bakes env vars at build time; use nginx proxy fallback in code |
| Hardcoded IDs in seed data | FK violations or wrong references | Use `valueComputed` with subqueries instead |
| `Caused by: PSQLException: Bad value for type long` | Usually `@Lob` or column type mismatch | Check entity `@Column` definitions against actual DB types |
| `No Spring profile active` | Seed data doesn't load | Set `SPRING_PROFILES_ACTIVE=demo` in docker-compose or Dockerfile |
| `Entity name collision` | `DuplicateRegistrationException` at startup | Use `@Entity(name = "UniqueName")` to disambiguate |
