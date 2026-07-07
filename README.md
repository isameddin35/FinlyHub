# Finly Hub — AI-Powered Accounting Platform

Modern, enterprise-grade SaaS platform that helps accountants automate repetitive tasks while maintaining full human oversight.

## Features

- **AI Invoice Processing** — Upload PDF/receipts; OCR extracts text, LLM structures data, human reviews & approves
- **Accounting Copilot** — RAG chatbot that answers questions from your policy documents with source citations
- **Transaction Categorization** — AI-suggested categories for imported CSV/XLSX transactions with confidence scoring
- **Financial Reports** — Generate revenue/expense/profit reports with charts and AI executive summaries
- **Bank Reconciliation** — Match bank statements against accounting records with automatic discrepancy detection

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Recharts |
| Backend | Java 21, Spring Boot 3.4, Spring Security, JWT, Spring Data JPA |
| Database | PostgreSQL 16 + pgvector (768-dim, ivfflat index) |
| AI Chat | Groq (groq-sdk, llama-3.1-8b-instant) |
| AI Embeddings | Ollama (nomic-embed-text, 768-dim) |
| OCR | Tesseract via Tess4J 5.12 |
| Infrastructure | Docker, Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose v2
- Node.js 22+ (for local frontend dev)
- Java 21+ (for local backend dev)

### Development (Full Stack with Docker)

```bash
# 1. Clone and enter directory
cd finlyhub

# 2. Start everything
docker compose up --build
```

This starts:
- PostgreSQL on `localhost:5432`
- Backend API on `localhost:8080`
- Frontend on `localhost:5173`

### Development (Local)

**Backend:**
```bash
cd backend
# Ensure PostgreSQL is running on localhost:5432
# (or use: docker compose up postgres -d)

./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Demo Mode

The default configuration uses `AI_PROVIDER=mock` — no API key required. The application seeds demo data (users, invoices, transactions) on first launch.

**Demo accounts** (password: `password`):

| Email | Role |
|-------|------|
| admin@finlyhub.com | Owner |
| accountant@finlyhub.com | Accountant |
| viewer@finlyhub.com | Viewer |

### Production Mode (with Groq + Ollama)

```bash
# Set your Groq API key
export OPENAI_API_KEY=gsk-your-groq-api-key
export OPENAI_BASE_URL=https://api.groq.com/openai/v1
export OPENAI_MODEL=llama-3.1-8b-instant
export OPENAI_EMBEDDING_BASE_URL=http://ollama:11434/v1
export OPENAI_EMBEDDING_API_KEY=sk-ollama
export AI_PROVIDER=openai

# Ensure Ollama is running with nomic-embed-text
docker compose up --build
```

## Environment Variables

See `.env.example` for all configurable variables. Key ones:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | finlyhub | Database name |
| `JWT_SECRET` | (required) | Base64-encoded 256+ bit secret |
| `AI_PROVIDER` | mock | `mock` (no key) or `openai` (Groq chat + Ollama embeddings) |
| `OPENAI_API_KEY` | - | Groq API key (if provider is `openai`) |
| `OPENAI_BASE_URL` | https://api.groq.com/openai/v1 | Groq-compatible API base URL |
| `OPENAI_MODEL` | llama-3.1-8b-instant | Chat model |
| `OPENAI_EMBEDDING_BASE_URL` | http://ollama:11434/v1 | Ollama embeddings endpoint |
| `OPENAI_EMBEDDING_API_KEY` | sk-ollama | Dummy key for Ollama |
| `OPENAI_EMBEDDING_MODEL` | nomic-embed-text | Embedding model (768-dim output) |

## Project Structure

```
finlyhub/
├── backend/                    # Spring Boot API
│   ├── src/main/java/com/finlyhub/
│   │   ├── auth/              # Authentication & JWT
│   │   ├── user/              # User management
│   │   ├── invoice/           # OCR + LLM invoice processing
│   │   ├── document/          # Document upload & RAG pipeline
│   │   ├── chatbot/           # Accounting copilot conversations
│   │   ├── transaction/       # Import & categorization
│   │   ├── report/            # Financial report generation
│   │   ├── reconciliation/    # Bank reconciliation
│   │   ├── audit/             # Audit logging
│   │   ├── dashboard/         # Metrics & activity
│   │   ├── common/            # Shared services & models
│   │   └── config/            # Security, CORS, AI config
│   ├── src/main/resources/db/changelog/  # Liquibase migrations
│   └── pom.xml
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── api/               # API clients
│   │   ├── components/        # shadcn UI + layout
│   │   ├── features/          # Page components
│   │   ├── hooks/             # Auth + theme contexts
│   │   ├── types/             # TypeScript interfaces
│   │   └── lib/               # Utilities
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── deploy/
│   ├── deploy.sh              # EC2 deployment script (SSM → git pull + compose)
│   └── docker-compose.prod.yml
└── .env.example
```

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/refresh` | Refresh JWT |

### Invoices
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/invoices/upload` | Upload invoice (multipart) |
| GET | `/api/invoices` | List user's invoices |
| GET | `/api/invoices/{id}` | Get invoice details |
| PUT | `/api/invoices/{id}/approve` | Approve with corrections |
| GET | `/api/invoices/export` | Export approved invoices as Excel (.xlsx) |

### Accounting Copilot
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/conversations` | Create conversation |
| GET | `/api/chat/conversations` | List conversations |
| DELETE | `/api/chat/conversations/{id}` | Delete conversation |
| POST | `/api/chat/conversations/{id}/messages` | Send message (SSE-streaming response) |
| GET | `/api/chat/conversations/{id}/messages` | Get messages |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/documents/upload` | Upload document (multipart) |
| GET | `/api/documents` | List user's documents |
| DELETE | `/api/documents/{id}` | Delete document |
| GET | `/api/documents/{id}/download` | Download / preview document file |

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transactions/import` | Import CSV/XLSX |
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions/{id}/categorize` | AI categorize |
| PUT | `/api/transactions/{id}/approve` | Approve category |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/reports/generate` | Generate report |
| GET | `/api/reports` | List reports |
| GET | `/api/reports/{id}/export` | Export (PDF/Excel) |

### Reconciliation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/reconciliation/match` | Upload & match |
| GET | `/api/reconciliation` | List reconciliations |
| PUT | `/api/reconciliation/{id}/approve` | Approve |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/metrics` | Metrics & activity |

## Deployment

### Docker Compose (recommended)

```bash
docker compose up --build -d
```

### Production Considerations

1. **Secrets**: Use Docker secrets or a secrets manager; never commit `.env`
2. **JWT Secret**: Generate a secure key: `openssl rand -base64 32`
3. **PostgreSQL**: Use a managed service or persistent volume
4. **AI Provider**: Set `AI_PROVIDER=openai` and provide a valid `OPENAI_API_KEY`
5. **TLS**: Use a reverse proxy (nginx, Caddy) with Let's Encrypt
6. **Backups**: Configure automated PostgreSQL backups
7. **Monitoring**: Enable Spring Boot Actuator endpoints
8. **Scaling**: The backend is stateless; scale horizontally behind a load balancer
9. **Resource limits**: Set Docker CPU/memory limits in production

## License

Proprietary — All rights reserved.
