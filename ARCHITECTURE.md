# Finly Hub — Architecture

## System Context

```
┌──────────┐       ┌──────────┐       ┌──────────────┐       ┌──────────────────┐
│ Browser  │──────▶│  nginx   │──────▶│ Spring Boot   │──────▶│ PostgreSQL 16    │
│ (React)  │       │ (5173)   │       │ Backend :8080 │       │ + pgvector       │
└──────────┘       └──────────┘       └──────────────┘       └──────────────────┘
     ▲                   │                                        │
     │                   │ /api/health                            │ vector(1536)
     │                   └──┬── /api/* ──── backend:8080          │ IVFFLAT index
     │                      │                                     │
     │                ┌─────┴──────┐                              │
     │                │            │                              │
     │          Static files   SPA fallback                   init.sql
     │          (dist/)        (index.html)                  CREATE EXTENSION vector
     │
     └──────────────────────────────────────────┐
                                                 ▼
                                          uploads/ volume
                                     (invoice PDFs, document files)
```

## Backend Module Dependency Graph

```
   ┌──────────────────────────────────────────────────────────────┐
   │                       config                                 │
   │  (Security, CORS, JWT, Web, OpenAi, Health)                 │
   └──┬───────────────┬────────────────┬──────────────┬──────────┘
      │               │                │              │
      ▼               ▼                ▼              ▼
  ┌────────┐   ┌──────────┐   ┌──────────────┐   ┌──────────┐
  │  auth  │   │   user   │   │    common     │   │  audit   │
  │login/  │   │ profile  │   │ AiService     │   │ action   │
  │register│   │ roles    │   │ exceptions    │   │ tracking │
  │refresh │   │          │   │ ApiResponse   │   │          │
  └────────┘   └──────────┘   └──┬───────────┘   └──────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
    ┌──────────────┐   ┌───────────────┐   ┌──────────────────┐
    │   invoice    │   │  transaction  │   │   document       │
    │ OCR → AI ext │   │  CSV/XLSX imp │   │ parse→chunk→embed│
    │ → approval   │   │  AI categorize│   │ → index          │
    └──────┬───────┘   └──────┬────────┘   └────────┬─────────┘
           │                 │                      │
           │        ┌────────┴────────┐             │
           │        │                 │             │
           ▼        ▼                 ▼             ▼
    ┌───────────────────────────────────────────────────────┐
    │                   chatbot                              │
    │  conversation CRUD + pgvector <-> search → AiService  │
    └───────────────────────────────────────────────────────┘

    ┌──────────────┐   ┌──────────────────┐
    │  dashboard   │   │    report         │
    │ aggregated   │   │ aggregation       │
    │ KPIs         │   │ AI insights       │
    └──────┬───────┘   │ PDF/Excel export  │
           │           └──────────────────┘
           │
           ▼
    ┌──────────────────┐
    │  reconciliation  │
    │ dual-file import │
    │ 3-tier matching  │
    │ discrepancy calc │
    └──────────────────┘
```

### Key Dependency Principles

1. **`common` is the spine** — `AiService` interface, exceptions, `ApiResponse`, `SecurityUtils` shared across all modules.
2. **`user` is the identity hub** — `User` entity referenced by every owned entity (invoices, transactions, etc.).
3. **`config` wires everything** — Security, CORS, JWT filter, AI provider bean creation.
4. **`dashboard` and `report` are aggregators** — They read from multiple other modules' repositories.
5. **`chatbot` cross-cuts `document`** — `ChatbotService` runs native SQL against `document_chunks` for vector similarity search.

---

## Database Entity Relationships

```
roles ──< user_roles >── users ──┬── documents ──< document_chunks
                                  │                    (vector(1536))
                                  │
                                  ├── invoice_documents ──< invoices
                                  │     (V010 split from   │
                                  │      general docs)     │
                                  │                        └── invoice_extractions
                                  │
                                  ├── transactions ──> transaction_categories
                                  │       (suggested_category_id)
                                  │
                                  ├── conversations ──< messages
                                  │
                                  ├── reconciliations ──< reconciliation_entries
                                  │         │                 (self-ref: matched_entry_id)
                                  │         └── approved_by ─> users
                                  │
                                  ├── reports
                                  │
                                  ├── notifications
                                  │
                                  └── audit_logs (no FK, loose reference)
```

### 17 Tables Summary

| # | Table | Purpose | Key Columns |
|---|-------|---------|-------------|
| 1 | `roles` | Static role definitions | name (UNIQUE) |
| 2 | `users` | User accounts | email (UNIQUE), password_hash |
| 3 | `user_roles` | Many-to-many join | user_id, role_id |
| 4 | `documents` | General-purpose document store | user_id, document_type, status, raw_text |
| 5 | `document_chunks` | RAG text chunks with embeddings | document_id, chunk_index, embedding (vector(1536)) |
| 6 | `invoice_documents` | Invoice-specific file metadata | user_id, filename, file_path |
| 7 | `invoices` | Extracted invoice data | user_id, document_id, vendor, amounts, status |
| 8 | `invoice_extractions` | OCR + AI extraction history | invoice_id, stage, extracted_data (JSONB) |
| 9 | `conversations` | Chat conversation headers | user_id, title, is_active |
| 10 | `messages` | Individual chat messages | conversation_id, role, content, sources (JSONB) |
| 11 | `transaction_categories` | Static category reference | name (UNIQUE), icon, color |
| 12 | `transactions` | Financial transaction records | user_id, category_id, amount, categorization_status |
| 13 | `reports` | Generated financial reports | user_id, type, subtype, ai_insights, chart_config (JSONB) |
| 14 | `reconciliations` | Reconciliation batch headers | user_id, status, period, counts |
| 15 | `reconciliation_entries` | Individual match entries | reconciliation_id, source, amount, match_status |
| 16 | `audit_logs` | Action audit trail | user_id, action, entity_type, old/new_values (JSONB) |
| 17 | `notifications` | User notifications | user_id, type, title, read |

---

## Key Data Flows

### Invoice Processing
```
Upload PDF/Image
    │
    ▼
Save file → Create InvoiceDocument
    │
    ▼
OCR (PDFBox text extract → Tess4J if image)
    │
    ▼
Save OCR stage (invoice_extractions)
    │
    ▼
AI Extraction (AiService.extractInvoiceData)
    │
    ▼
Save LLM stage (invoice_extractions)
    │
    ▼
Create Invoice (PENDING)
    │
    ▼
User reviews + approves with corrections → APPROVED
```

### Document Indexing & RAG Chat
```
Upload PDF/DOCX/TXT
    │
    ▼
Parse text (PDFBox/POI)
    │
    ▼
Chunk (512 tokens, 64-token overlap)
    │
    ▼
For each chunk: AiService.generateEmbedding → [0.15, -0.02, ...] (1536 dims)
    │
    ▼
Store chunk + embedding in document_chunks
    │
    ▼
[Later] User asks chatbot question
    │
    ▼
Embed question → pgvector `<->` (cosine distance) → top-3 chunks
    │
    ▼
Build context prompt → AiService.chat() → Response with source citations
```

### Transaction Import & Categorization
```
Upload CSV/XLSX
    │
    ▼
Parse rows → Create Transaction entities (PENDING, batch UUID)
    │
    ▼
For each: AiService.categorizeTransaction → suggested category + confidence
    │
    ▼
User reviews → Approve (accept suggestion) or Reject (select manually)
```

### Reconciliation
```
Upload bank CSV + accounting CSV
    │
    ▼
Parse both files → Save as ReconciliationEntries (BANK / ACCOUNTING source)
    │
    ▼
Tiered matching algorithm:
  PRIMARY:   exact amount + date ≤ 3 days apart      → score 0.95
  SECONDARY: exact amount + date ≤ 7 days apart      → score 0.80
  TERTIARY:  amount within 5% + similar description   → score 0.60
    │
    ▼
Link matched entries (matched_entry_id self-ref FK), flag unmatched/needs-review
    │
    ▼
User approves → Reconciliation COMPLETED → APPROVED
```

---

## AI Layer

```
         ┌─────────────────────────────┐
         │       AiService (interface) │
         │                             │
         │  +extractInvoiceData(text)  │
         │  +chat(ChatRequest)         │
         │  +generateEmbedding(text)   │
         │  +categorizeTransaction(tx) │
         └──────────┬──────────────────┘
                    │
          implements│
           ┌───────┴────────┐
           │                │
           ▼                ▼
   ┌──────────────┐  ┌──────────────┐
   │ MockAiService │  │OpenAiAiService│
   │ (default)     │  │ (ai.provider  │
   │ deterministic │  │  = openai)   │
   │ random data   │  │ real GPT-4o  │
   │ no API key    │  │ needs key    │
   └──────────────┘  └──────────────┘
         │                    │
   ┌─────┴─────┐        ┌────┴────┐
   │For demo / │        │Production│
   │dev/test   │        │deployment│
   └───────────┘        └─────────┘
```

**Selection logic** (`OpenAiConfig.java`): `@ConditionalOnProperty(name = "ai.provider", havingValue = "openai")` creates `OpenAiAiService`; default (or `mock`) creates `MockAiService`.

---

## Authentication Flow

```
┌──────────┐                    ┌───────────────┐                ┌──────────┐
│  Client  │                    │  Backend       │                │  DB      │
└────┬─────┘                    └───────┬───────┘                └────┬─────┘
     │  POST /auth/register             │                             │
     │  {email, password, name}         │                             │
     │─────────────────────────────────▶│                             │
     │                                  │  bcrypt(password)           │
     │                                  │  INSERT user                │
     │                                  │────────────────────────────▶│
     │                                  │  SELECT role (VIEWER)       │
     │                                  │◀────────────────────────────│
     │                                  │                             │
     │  {accessToken, refreshToken,     │                             │
     │   user}                          │                             │
     │◀─────────────────────────────────│                             │
     │                                  │                             │
     │  POST /auth/login                │                             │
     │  {email, password}               │                             │
     │─────────────────────────────────▶│                             │
     │                                  │  AuthenticationManager      │
     │                                  │  → BadCredentialsException? │
     │                                  │  JwtTokenProvider.create()  │
     │                                  │                             │
     │  {accessToken, refreshToken}     │                             │
     │◀─────────────────────────────────│                             │
     │                                  │                             │
     │  GET /api/invoices               │                             │
     │  Authorization: Bearer <token>   │                             │
     │─────────────────────────────────▶│                             │
     │                                  │  JwtAuthenticationFilter    │
     │                                  │  → validate JWT             │
     │                                  │  → load User from DB        │
     │                                  │  → set SecurityContext       │
     │                                  │  InvoiceController          │
     │                                  │  → SecurityUtils.userId     │
     │                                  │  → WHERE user_id = ?        │
     │                                  │────────────────────────────▶│
     │  {success: true, data: [...]}    │                             │
     │◀─────────────────────────────────│                             │
```

**Token refresh:** On 401, frontend interceptor calls `POST /auth/refresh` with the stored `refreshToken`. On success, new tokens replace the old ones. On failure, user is redirected to `/login`.

---

## Deployment Architecture

```
Docker Compose (3 services)
═══════════════════════════

Network: finlyhub_default (bridge)
────────────────────────────────────

postgres                         backend                          frontend
─────────                        ───────                          ────────
Image: pgvector/pgvector:pg16    Build: ./backend/Dockerfile      Build: ./frontend/Dockerfile
Port:  5432                      Port:  8080                      Port:  5173
Vol:   pgdata:/var/lib/pgdata    Vol:  uploads:/app/uploads       (stateless)
       ./postgres/init.sql       Env:  SPRING_PROFILES_ACTIVE     Env:  (none at runtime)
       (init script)                    SPRING_DATASOURCE_URL            VITE_API_URL baked at build
                                        JWT_SECRET
                                        AI_PROVIDER (mock|openai)
       Health: pg_isready         Depends: postgres (healthy)      Depends: backend (basic)
```

### Build Process

```
Frontend:                     Backend:
  node:22-alpine                maven:3.9-eclipse-temurin-21
    npm ci                        mvn dependency:resolve
    npm run build                 mvn package -DskipTests
  nginx:alpine                  eclipse-temurin:21-jre-alpine
    COPY dist/ → nginx/html       apk add tesseract-ocr
    COPY nginx.conf                COPY app.jar
                                  java -jar app.jar
```

### Production Considerations

- **CORS**: Currently allows `localhost:5173` and `localhost:3000` only. Add production domain.
- **JWT Secret**: Required in `.env`. Use a long random base64 string in production.
- **AI Provider**: Switch to `openai` and set `OPENAI_API_KEY` for real AI features.
- **Uploads**: `uploads/` Docker volume persists files. Add backup strategy.
- **SSL**: Place behind a reverse proxy (Traefik, Caddy, nginx) with Let's Encrypt.
- **Monitoring**: Spring Boot Actuator exposes `/api/health`; add Prometheus/Grafana.
- **Backup**: `pg_dump` for the `pgdata` volume.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **pgvector over separate vector DB** | Reduces infra complexity; PostgreSQL with one extension vs running Qdrant/Pinecone |
| **Tess4J (offline OCR)** | Free, works without internet; can swap to cloud OCR later |
| **PDFBox 3.x** | Apache license, mature, handles both extraction and generation |
| **Synchronous chat (no SSE)** | Simpler to build and demo; SSE planned for production |
| **Manual mappers over MapStruct** | Avoids annotation processor complexity; explicit field mapping is clearer |
| **Liquibase YAML over Hibernate DDL** | Explicit, version-controlled, auditable migrations |
| **Demo profile for seed data** | Clean separation: schema always, seed only for demo/investor preview |
| **`ApiResponse<T>` envelope** | Consistent frontend error handling; every response has the same shape |
| **`SecurityUtils` static helper** | Avoids injecting `SecurityContextHolder` boilerplate in every service |
