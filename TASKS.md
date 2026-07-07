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
- [x] **Switch from Ollama chat to Groq** — Dual `OpenAiService`: Groq for chat (llama-3.1-8b-instant), Ollama for embeddings (nomic-embed-text only)
- [x] **Fix Groq URL mismatch** — OkHttp interceptor rewrites `/v1/` → `/openai/v1/` to fix absolute-path resolution
- [x] **Fix embedding connection inside Docker** — Changed `OPENAI_EMBEDDING_BASE_URL` from `localhost:11434` to `http://ollama:11434`
- [x] **Fix currency format error** — Updated extraction prompt for ISO 4217 codes; `formatCurrency` in utils maps symbols and wraps in try/catch
- [x] **Chat duplication fix** (backend) — Moved `messageRepository.save(userMessage)` after `ChatRequest.build()`
- [x] **Chat duplication fix** (frontend) — Replaced `optimisticMessages` with `pendingUserMessage` string state
- [x] **Message alignment fix** — All `msg.role` comparisons use `.toLowerCase()`
- [x] **Embedding fallback** — `generateEmbedding()` returns `List.of()` on failure
- [x] **Vector operator** — Changed `<->` (L2) to `<=>` (cosine) with similarity score in `SourceDocument.relevanceScore`
- [x] **Ollama slimmed** — Removed `ollama pull qwen2:1.5b` from entrypoint; healthcheck checks `nomic-embed-text`
- [x] **User isolation for RAG** — `searchRelevantDocuments()` JOINs `document_chunks` with `documents` on `document_id`
- [x] **Fixed document upload INSERT** — Replaced `chunkRepository.saveAll()` with native SQL `INSERT ... cast(? as vector)`
- [x] **Added approved invoices Excel export** — `GET /api/invoices/export` returns XLSX workbook via `XSSFWorkbook`
- [x] **Fixed CI/CD — added --build flag** — `deploy.sh` changed to `docker compose up -d --build`
- [x] **Made invoice fields editable before approval** — Replaced `ConfidenceField` with editable form inputs in dialog

## Phase 4: UI Improvements

- [x] **Markdown rendering in chat** — Added `react-markdown` + `remark-gfm` for formatted bot responses
- [x] **Document inline preview + download** — New `GET /api/documents/{id}/download` endpoint; preview dialog with iframe; download button per row
- [x] **Logout in sidebar** — `LogOut` icon + "Log out" text below collapse toggle
- [x] **Confirmation dialogs for destructive actions** — Added `AlertDialog` component; applied to conversation + document delete
- [x] **Password visibility toggle** — Eye/EyeOff button in password fields on Login and Register pages
- [x] **Dynamic page title in header** — Header title updates based on current route

## Known Issues

- (none currently tracked)

## Future Enhancements

- [ ] **Production deployment guide** — SSL, domain, CORS for non-localhost
- [ ] **Test suite** — Backend (JUnit 5 + Testcontainers), Frontend (Vitest + Playwright)
- [ ] **Multi-tenancy** — Company-scoped data isolation
- [ ] **SSO / OAuth2** — Google/Microsoft login
- [ ] **Email notifications** — SendGrid / SMTP integration
- [ ] **WebSocket notifications** — Real-time UI updates for processing status
- [ ] **Budget tracking** — Compare actuals vs budget per category
- [ ] **Audit trail UI** — Browseable activity timeline in Settings
