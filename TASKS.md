# Finly Hub — Tasks & Roadmap

## Legend

| Status | Meaning |
|--------|---------|
| [x] | Completed |
| [-] | In progress |
| [ ] | Not started |

---

## Phase 1: Core Infrastructure

- [x] **Docker Compose setup** — PostgreSQL (pgvector), backend (Spring Boot), frontend (nginx)
- [x] **PostgreSQL init** — `vector` extension enabled on first boot
- [x] **Backend Maven project** — Spring Boot 3.4.1, Java 21, all deps pinned
- [x] **Backend Dockerfile** — Multi-stage (Maven build → Alpine JRE + Tesseract)
- [x] **Frontend Vite project** — React 19, TypeScript 5.7, Tailwind 3.4, shadcn/ui
- [x] **Frontend Dockerfile + nginx** — Multi-stage build, SPA fallback, `/api` proxy
- [x] **Liquibase changelogs** — 11 YAML files (V001–V011), 42 changesets, 17 tables
- [x] **JWT authentication** — Login/register/refresh with access + refresh tokens
- [x] **Spring Security** — Stateless sessions, CORS, role-based guards
- [x] **Global exception handler** — `@RestControllerAdvice` with typed HTTP codes
- [x] **API envelope** — `ApiResponse<T>` wrapper (success, message, data, timestamp)
- [x] **`.dockerignore` files** — Backend + frontend

## Phase 2: Feature Implementation

- [x] **Auth module** — Register, login, refresh, custom `UserDetailsService`
- [x] **User module** — Profile CRUD, role management, `SecurityUtils`
- [x] **Invoice processing** — Upload → OCR (PDFBox + Tess4J) → AI extraction → approval
- [x] **Document management** — Upload → parse (PDF/DOCX/TXT) → chunk → embed (pgvector) → index
- [x] **Chatbot / RAG** — Conversations, messages, pgvector `<->` search, AI responses with sources
- [x] **Transaction import** — CSV/XLSX parsing, batch UUID, AI categorization, user approval
- [x] **Transaction reconciliation** — Dual-file (bank + accounting), 3-tier matching, discrepancy calc
- [x] **Financial reports** — Type/subtype aggregation, AI insights, PDFBox/POI export
- [x] **Dashboard metrics** — Aggregated KPIs from invoices, transactions, reconciliations
- [x] **Audit logging** — Action/entity tracking with JSONB diff snapshots
- [x] **Notifications** — 3 seeded notifications for demo
- [x] **Frontend pages** — Login, Register, Dashboard, Invoices, Copilot, Transactions, Reports, Reconciliation, Documents, Settings
- [x] **Frontend API layer** — 8 typed API modules with Axios interceptors
- [x] **Frontend routing** — Authenticated layout, public auth pages, catch-all redirect
- [x] **Seed demo data** — 3 users (admin/accountant/viewer), 5 invoices, 9 transactions, 2 documents + 6 chunks, 3 conversations + 8 messages, 1 reconciliation + 11 entries, 4 audit logs, 3 notifications

## Phase 3: Bugfixes & Stabilization

- [x] **Fix OpenAI version** — `2.7.0` → `0.18.2` (compatibility)
- [x] **Fix Tess4J version** — `1.8.1` → `5.12.0` (compatibility)
- [x] **Fix PDFBox 3.x API** — `PDDocument.load()` → `Loader.loadPDF()`
- [x] **Fix Docker build** — `dependency:go-offline` → `dependency:resolve`
- [x] **Fix bean name collision** — `InvoiceDocumentRepository` entity name
- [x] **Fix Hibernate entity name** — `@Entity(name = "InvoiceDocument")`
- [x] **Fix conversation `isActive`** — Entity property vs DB column mismatch
- [x] **Fix 401 interceptor** — Skip `/auth/` endpoints in refresh logic
- [x] **Fix missing columns** — V009 adds `department`, `transaction_type`, `suggested_category_id_value`
- [x] **Create `invoice_documents` table** — V010 decouples invoice attachments from `documents`
- [x] **Fix FK `invoices.document_id`** — Points to `invoice_documents(id)` instead of `documents(id)`
- [x] **Fix `approvedBy` type** — `String` → `Long` (entity), `FullName` → `Id` (service)
- [x] **Fix `embedding` format** — Wrapped in `[...]` brackets for pgvector
- [x] **Fix `filename` column** — Added to `document_chunks` table, set during chunk creation
- [x] **Set `SPRING_PROFILES_ACTIVE=demo`** — Seed data now loads in Docker Compose
- [x] **Fix document upload contract** — `type` param optional (defaults to `OTHER`)
- [x] **Fix upload property name** — `upload.dir` → `app.upload.dir` (consistency)
- [x] **Mount uploads volume** — Files survive container restarts
- [x] **Fix `@Lob` on TEXT columns** — Causes CLOB/OID `Bad value for type long` errors
- [x] **Fix `@Transactional` on read services** — `LazyInitializationException` on category proxies
- [x] **Fix demo user passwords** — V011 sets known bcrypt hash (`password`)
- [x] **Add missing seed data** — Messages, document chunks, reconciliation entries, audit logs, accountant data
- [x] **Fix dashboard `documentsIndexed` hardcoded to 0** — Now queries document repository by user and status
- [x] **Fix dashboard revenue/expense trends hardcoded** — Now aggregates real transactions by month from DB
- [x] **Fix dashboard `recentActivity` hardcoded** — Now pulls from real invoices, transactions, reconciliations
- [x] **Fix reconciliation status String vs enum comparison** — `"APPROVED".equals(r.getStatus())` always false with enum
- [x] **Fix auto-categorization never triggered after import** — Injected `TransactionCategorizationService` into `TransactionImportService`, calls `categorizeBatch()` after `saveAll()`
- [x] **Fix combobox transparency** — Added missing `--popover` CSS variables and Tailwind color mapping

## Known Issues

- [-] **`searchSimilarChunks()` is a stub** — Returns `List.of()`, never called
- [-] **`/uploads/**` exposed without auth** — `WebConfig` serves files as static resources
- [-] **No SSE streaming for chatbot** — Synchronous request/response, up to 15s wait
- [-] **No `.env` for frontend build-time VITE_API_URL** — Currently falls back to `/api` via nginx proxy

## Future Enhancements

- [ ] **SSE chatbot streaming** — Token-by-token AI responses via `SseEmitter`
- [ ] **Production deployment guide** — SSL, domain, CORS for non-localhost
- [ ] **Test suite** — Backend (JUnit 5 + Testcontainers), Frontend (Vitest + Playwright)
- [ ] **CI/CD pipeline** — GitHub Actions (build, test, deploy)
- [ ] **Real dashboard trends** — Query actual transaction data by month
- [ ] **Multi-tenancy** — Company-scoped data isolation
- [ ] **File download endpoint** — Authenticated `GET /api/documents/{id}/download`
- [ ] **SSO / OAuth2** — Google/Microsoft login
- [ ] **Email notifications** — SendGrid / SMTP integration
- [ ] **WebSocket notifications** — Real-time UI updates for processing status
- [ ] **Budget tracking** — Compare actuals vs budget per category
- [ ] **Audit trail UI** — Browseable activity timeline in Settings
