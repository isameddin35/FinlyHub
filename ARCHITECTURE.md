# Finly Hub — Architecture

## System Context

```
┌──────────┐       ┌──────────┐       ┌──────────────┐       ┌──────────────────┐
│ Browser  │──────▶│  nginx   │──────▶│ Spring Boot   │──────▶│ PostgreSQL 16    │
│ (React)  │       │ (5173)   │       │ Backend :8080 │       │ + pgvector       │
└──────────┘       └──────────┘       └──────────────┘       └──────────────────┘
     ▲                   │                                        │
     │                   │ /api/health                            │ vector(384)
     │                   └──┬── /api/* ──── backend:8080          │ HNSW index
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
    │  conversation CRUD + hybrid RAG (RRF + MMR + filters)  │
    │  → AiService                                          │
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
                                  │                    (vector(384))
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
| 5 | `document_chunks` | RAG text chunks with embeddings | document_id, chunk_index, embedding (vector(384)), embedding_status (OK/FAILED) |
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
Chunk via tokenizer (512 tokens, 64-token overlap)
    │
    ▼
Batch embeddings (max 32/call, ONNX bge-small-en-v1.5, 384 dims)
    │
    ▼
Store chunk + embedding in document_chunks
(failures → embedding_status=FAILED, embedding=NULL)
    │
    ▼
[Later] User asks chatbot question
    │
    ▼
Embed question with BGE query prefix →
hybrid keyword + vector retrieval (RRF fusion, min-similarity 0.4)
    │
    ▼
MMR rerank (lambda 0.7) → top-5 chunks (optional metadata filters)
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
           ┌───────────────────────────────────────┐
           │         AiService (interface)         │
           │                                       │
           │  +extractInvoiceData(text)            │
           │  +chat(ChatRequest)                   │
           │  +generateEmbedding(text)             │
           │  +categorizeTransaction(tx)           │
           └──────────┬────────────────────────────┘
                      │
            implements│
             ┌───────┴────────┐
             │                │
             ▼                ▼
     ┌──────────────┐  ┌──────────────────────┐
     │ MockAiService │  │   OpenAiAiService    │
     │(ai.provider=  │  │  (ai.provider=openai)│
     │  mock)        │  │                      │
     │ deterministic │  │  ┌──────────────────┐│
     │ random data   │  │  │   OpenAiService  ││
     │ no API key    │  │  │  (Chat via Groq) ││
     └──────────────┘  │  └──────────────────┘│
                       │                      │
                       │  Embeddings: ONNX    │
                       │  Runtime + DJL       │
                       │  (bge-small-en-v1.5) │
                       │  384-dim, in-JVM     │
                       └──────────────────────┘
```

**Selection logic** (`OpenAiConfig.java`): `@ConditionalOnProperty(name = "ai.provider", havingValue = "openai")` creates `OpenAiAiService` with chat via Groq. Embeddings run in-JVM via ONNX Runtime + DJL Tokenizers (bge-small-en-v1.5, 384-dim) — no external embedding service needed. When `ai.provider=mock` (or unset), `MockAiService` is created.

**Groq path fix**: `OpenAiApi` uses `@POST("/v1/chat/completions")` — leading slash causes absolute path resolution in OkHttp, dropping `/openai/` from the base URL. An interceptor rewrites `/v1/{path}` → `/openai/v1/{path}` for the Groq client only.

**Embedding reliability**: Embeddings are generated in batches (max 32 per call — `OnnxBgeEmbeddingService.embedBatchInternal` caps the ONNX batch to bound native memory). On failure, the chunk is marked `embedding_status=FAILED` with a NULL embedding instead of being silently skipped — chat falls back to keyword-only retrieval for those chunks. `DemoEmbeddingReindexer` (demo profile) can re-embed all chunks at startup, also batched at 32; off by default (`AI_REINDEX_ON_STARTUP=false`).

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

**Token refresh:** On 401, frontend interceptor calls `POST /auth/refresh` with the stored `refreshToken`. On success, new tokens replace the old ones. On failure, user is redirected to `/role-select`.

**Demo login flow:** Landing at `/role-select` presents 3 demo user buttons (admin, accountant, viewer) with a "Login as Demo" option. After successful demo login, the user is navigated to `/dashboard`.

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

Embeddings run in-JVM via ONNX Runtime (bge-small-en-v1.5) — no external embedding service.

**Deploy workflow:** Build images → start postgres (if not running) → restart backend with `--no-deps` → health check loop (30 attempts × 5s) → restart frontend with `--no-deps` → health check loop. Postgres stays up throughout. Rollback via `deploy/rollback.sh`.
```

### Build Process

```
Frontend:                     Backend:
  node:22-alpine                maven:3.9-eclipse-temurin-21
    npm ci                        mvn dependency:resolve
    npm run build                 mvn package -DskipTests
  nginx:alpine                  eclipse-temurin:21-jre-jammy
    COPY dist/ → nginx/html       apt-get install -y tesseract-ocr tesseract-ocr-eng
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
| **Groq for chat + ONNX for embeddings** | Groq's llama-3.1-8b-instant responds in <1s for free; ONNX Runtime + DJL (bge-small-en-v1.5) runs embeddings in-JVM with no external service |
| **Single OpenAiService for chat only** | Embeddings run in-process via ONNX Runtime; no separate embedding service, API key, or network calls needed |
| **OkHttp interceptor for Groq path fix** | Minimal code change — one interceptor rewrites `/v1/` → `/openai/v1/` to fix OkHttp absolute-path resolution |
| **`cast(? as vector)` over `?::vector`** | `?::vector` causes PostgreSQL to infer parameter as vector type; JDBC can't serialize String as vector. `cast(? as vector)` keeps parameter as unknown/text |
| **Embedding failure leaves NULL vector** | Failed chunks are marked `embedding_status=FAILED` with a NULL embedding — avoids meaningless noise vectors and keeps chat working via keyword-only retrieval |
| **HNSW over IVFFLAT** | V020 replaces the ivfflat index with HNSW `(m=16, ef_construction=64)` — no list-count tuning, scales more gracefully |
| **Token-based chunking** | DJL tokenizer splits on 512-token windows (64 overlap) instead of raw character counts — chunks stay within the embedding model's context |
| **Hybrid retrieval + MMR rerank** | Keyword (BM25-style) + vector results fused via RRF with `min-similarity` 0.4; MMR (`mmr-lambda` 0.7) trades relevance for diversity, returning top-5 chunks |
| **Metadata filters in retrieval** | `document_type` + date-range filters on the `documents` JOIN — retrieval stays scoped to the user's requested scope |
| **Batched embeddings (cap 32)** | ONNX native memory grows with batch size; capping at 32 (and batching the demo reindexer the same way) prevents cgroup OOM kills in 2GiB containers |
| **Embedding status tracking** | `embedding_status` (OK/FAILED) with NULL vectors for failures — no zero-vector poison in the index |
| **Golden retrieval eval set** | `retrieval_eval_set.json` + `RagEvalIntegrationTest` (gated by `RUN_RAG_EVAL=true`) measures retrieval quality offline before chat prompts change |
| **Reindex off by default** | `AI_REINDEX_ON_STARTUP=false` — demo reindexing is opt-in to avoid a 1445-chunk ONNX batch at boot |
| **User isolation in RAG** | Filter `document_chunks` by `d.user_id` via JOIN to `documents` — prevents cross-user document leaks |
| **Tess4J (offline OCR)** | Free, works without internet; can swap to cloud OCR later |
| **PDFBox 3.x** | Apache license, mature, handles both extraction and generation |
| **SSE streaming for chat** | Real-time token-by-token response; better UX than synchronous polling |
| **Manual mappers over MapStruct** | Avoids annotation processor complexity; explicit field mapping is clearer |
| **Liquibase YAML over Hibernate DDL** | Explicit, version-controlled, auditable migrations |
| **Demo profile for seed data** | Clean separation: schema always, seed only for demo/investor preview |
| **`ApiResponse<T>` envelope** | Consistent frontend error handling; every response has the same shape |
| **`/role-select` landing page** | Guests land on role selection instead of raw login; one-click demo login as admin/accountant/viewer; logout returns to `/role-select` |
| **Native SQL over JPA for bulk inserts** | `entityManager.createNativeQuery()` with `cast(? as vector)` / `cast(? as jsonb)` avoids `@Lob` pitfalls and type serialization errors in PostgreSQL |
| **`SecurityUtils` static helper** | Avoids injecting `SecurityContextHolder` boilerplate in every service |
