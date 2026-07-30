# FinlyHub — Production Readiness Task Tracker

**Status**: MVP demo → Production hardening  
**Last Updated**: 2026-07-24  
**Target**: Investor demo → Production-ready SaaS

---

## Legend
- ✅ Done
- 🔄 In Progress
- ⏳ Pending
- 🔴 Blocked
- P0/P1/P2 = Priority

---

## Phase 0: Immediate Fixes (This Sprint)

### P0 — Critical Infrastructure

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| INFRA-001 | Add healthcheck to backend Dockerfile | | 🔄 | Deploy-time health check in `deploy.sh` (curl loop); Dockerfile HEALTHCHECK still PENDING |
| INFRA-002 | Add healthcheck to frontend Dockerfile | | 🔄 | Deploy-time health check in `deploy.sh` (wget loop); Dockerfile HEALTHCHECK still PENDING |
| INFRA-003 | Add resource limits (CPU/RAM) to all services in docker-compose.yml | | ⏳ | backend: 2CPU/2GB, ollama: 4GB, frontend: 0.5CPU/512MB |
| INFRA-004 | Add `restart: unless-stopped` to all services | | ⏳ | Auto-recover from crashes |
| INFRA-005 | Enable Spring Boot Actuator + Prometheus endpoint | | ⏳ | `management.endpoints.web.exposure.include=health,prometheus` |
| INFRA-006 | Fix `VITE_API_URL` — runtime config via nginx `window.__ENV__` | | ⏳ | Remove build-time dependency |

### P0 — Code Reliability

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| CODE-001 | Add `@Transactional(readOnly = true)` to all read-only service methods | | ⏳ | Prevent LazyInitializationException |
| CODE-002 | Replace `RuntimeException` with typed exceptions + `ProblemDetail` (RFC 7807) | | ⏳ | GlobalExceptionHandler already exists |
| CODE-003 | Add `@Valid` on all request DTOs + enable method validation | | ⏳ | `MethodValidationPostProcessor` bean |
| CODE-004 | Fix N+1 queries in mappers (use `EntityGraph` / join fetch) | | ⏳ | Check `InvoiceMapper`, `DocumentMapper`, `ChatbotService` |
| CODE-005 | Increase Hikari pool to 20-30; add PgBouncer for scale | | ⏳ | `maximum-pool-size: 20` in application.yml |

---

## Phase 1: Observability (Sprint 2)

### P1 — Metrics & Logging

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| OBS-001 | Add Micrometer + Prometheus dependency | | ⏳ | `micrometer-registry-prometheus` |
| OBS-002 | Configure structured JSON logging (Logback) | | ⏳ | `logback-spring.xml` with JSON layout |
| OBS-003 | Ship logs to CloudWatch / Loki | | ⏳ | Promtail in docker-compose or CloudWatch agent |
| OBS-004 | Create Grafana dashboards (latency, errors, queue depth, JVM) | | ⏳ | Import JVM + custom business dashboards |
| OBS-005 | Add alerting rules (5xx > 1%, p99 latency > 2s, queue > 100) | | ⏳ | PrometheusRule or CloudWatch alarms |
| OBS-006 | Add distributed tracing (Micrometer Tracing + Zipkin/Jaeger) | | ⏳ | `micrometer-tracing-bridge-brave` |

---

## Phase 2: Externalize State (Sprint 3)

### P1 — Database & Storage

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| STATE-001 | Migrate PostgreSQL → RDS (pgvector extension) | | ⏳ | RDS PG 16+ supports pgvector; update `SPRING_DATASOURCE_URL` |
| STATE-002 | Move uploads volume → S3 (or MinIO for local) | | ⏳ | `InvoiceProcessingService`, `DocumentService` use `S3Client` |
| STATE-003 | Configure S3 lifecycle (transition to IA/Glacier) | | ⏳ | Cost optimization |
| STATE-004 | Enable RDS automated backups + point-in-time recovery | | ⏳ | 7-30 day retention |
| STATE-005 | Add read replica for analytics/report queries | | ⏳ | Route `ReportGeneratorService` to replica |

### P1 — Secrets & Config

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| STATE-006 | Migrate SSM Parameter Store → Secrets Manager | | ⏳ | Enable automatic rotation (30-90 days) |
| STATE-007 | Add rotation Lambda for JWT_SECRET, DB_PASSWORD, OPENAI_API_KEY | | ⏳ | Zero-downtime rotation |
| STATE-008 | Externalize feature flags (LaunchDarkly / AWS AppConfig) | | ⏳ | `ai.provider`, `demo.mode` toggles |

---

## Phase 3: Container Orchestration (Sprint 4)

### P1 — ECS Migration

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| ECS-001 | Create ECR repositories (backend, frontend) | | ⏳ | Image scanning on push |
| ECS-002 | Update CI: build → push to ECR (tag: git-sha + latest) | | ⏳ | `.github/workflows/ci.yml` |
| ECS-003 | Define ECS task definitions (CPU/memory, env, secrets) | | ⏳ | JSON or Terraform |
| ECS-004 | Create ECS services (backend: 2+ tasks, frontend: 2+ tasks) | | ⏳ | Fargate, platform version LATEST |
| ECS-005 | Configure ALB (HTTPS, WAF, path routing `/api*` → backend, `/*` → frontend) | | ⏳ | ACM cert for custom domain |
| ECS-006 | Implement blue/green or rolling deployment (CodeDeploy or ECS native) | | ⏳ | Zero-downtime deploys |
| ECS-007 | Remove postgres/ollama from docker-compose; use RDS + ECS GPU task | | ⏳ | Ollama on `g5.xlarge` or Bedrock |
| ECS-008 | Add CloudWatch log groups + retention (30 days) | | ⏳ | Structured JSON logs |

### P1 — Frontend Hosting

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| ECS-009 | Option A: Keep nginx on ECS (simpler) | | ⏳ | Current path |
| ECS-010 | Option B: CloudFront + S3 (cheaper at scale, global CDN) | | ⏳ | Build → sync to S3 → invalidate CF |

---

## Phase 4: AI Scaling & Async Processing (Sprint 5)

### P1 — Embeddings

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| AI-001 | GPU-enabled Ollama on ECS (`g5.xlarge`, `ollama/ollama:rocm`) | | ⏳ | 10x faster embeddings |
| AI-002 | Or: Migrate to Bedrock (Titan Embeddings) / Vertex AI | | ⏳ | Zero-ops, but vendor lock-in |
| AI-003 | Batch embedding requests (accumulate 10-50 docs) | | ⏳ | Reduce API calls |

### P1 — Async Queue

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| AI-004 | Add Redis (ElastiCache) for caching + queue | | ⏳ | `spring-boot-starter-data-redis` |
| AI-005 | Embedding worker pool (SQS + Lambda or ECS workers) | | ⏳ | Decouple document ingestion from embedding |
| AI-006 | Invoice processing queue (persistent, retry + DLQ) | | ⏳ | Replace `@Async` with Redis Streams / SQS |
| AI-007 | Add dead-letter queue + retry policy (exp backoff, max 3) | | ⏳ | Visibility into failed jobs |

---

## Phase 5: Database Optimization (Ongoing)

### P2 — Performance

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| DB-001 | Add composite indexes for query patterns | | ⏳ | `EXPLAIN ANALYZE` on slow queries |
| DB-002 | Create HNSW index on `document_chunks.embedding` | | ⏳ | `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)` |
| DB-003 | Partition `audit_log` by month | | ⏳ | `pg_partman` or native partitioning |
| DB-004 | Add connection pooler (PgBouncer) | | ⏳ | 100s app conns → 10 DB conns |
| DB-005 | Enable `track_io_timing` + `pg_stat_statements` | | ⏳ | Query performance insights |

---

## Phase 6: Testing & Quality (Parallel)

### P1 — Test Coverage

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| TEST-001 | Unit tests (Mockito) — target 70% coverage | | ⏳ | Services, mappers, utils |
| TEST-002 | Integration tests (Testcontainers) — DB, AI, auth | | ⏳ | `@SpringBootTest` + Testcontainers |
| TEST-003 | Contract tests (Pact) — API compatibility | | ⏳ | Frontend-backend contract |
| TEST-004 | Frontend unit tests (Vitest + RTL) | | ⏳ | Components, hooks, utils |
| TEST-005 | E2E tests (Playwright) — critical flows | | ⏳ | Login, invoice upload, chat, reports |
| TEST-006 | Load test (k6/Gatling) — 1000 concurrent users | | ⏳ | Identify bottlenecks |

### P2 — Code Quality

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| QUAL-001 | Add SpotBugs / SonarQube to CI | | ⏳ | Static analysis |
| QUAL-002 | Add dependency vulnerability scan (OWASP/Trivy) | | ⏳ | `trivy image` in CI |
| QUAL-003 | Enforce conventional commits + semantic release | | ⏳ | `commitlint`, `semantic-release` |
| QUAL-004 | Add ADR (Architecture Decision Records) | | ⏳ | Document key decisions |

---

## Phase 7: Security Hardening (Ongoing)

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| SEC-001 | Add rate limiting (Redis-backed) | | ⏳ | `Bucket4j` or Spring Cloud Gateway |
| SEC-002 | Enable CORS strict origins (not `*`) | | ⏳ | `CorsConfig.java` |
| SEC-003 | Add CSP headers (nginx) | | ⏳ | `Content-Security-Policy` |
| SEC-004 | Rotate JWT_SECRET (Secrets Manager) | | ⏳ | Short expiry (24h) + refresh tokens |
| SEC-005 | Add audit logging for sensitive actions | | ⏳ | Already have `AuditService` — verify coverage |
| SEC-006 | Penetration test (OWASP Top 10) | | ⏳ | Annual or pre-launch |

---

## Quick Wins (Can Do Today)

| ID | Task | Effort | Impact |
|----|------|--------|--------|
| QW-001 | Add healthchecks to docker-compose | 15 min | High | 🟢 Done — deploy-time health checks in `deploy.sh` |
| QW-002 | Add resource limits to docker-compose | 10 min | High |
| QW-003 | Add restart policies | 5 min | High |
| QW-004 | Enable Actuator + Prometheus | 30 min | High |
| QW-005 | Increase Hikari pool to 20 | 5 min | Medium |
| QW-006 | Fix `VITE_API_URL` runtime config | 1 hr | Medium |
| QW-007 | Add structured JSON logging | 1 hr | Medium |
| QW-008 | Enable `pg_stat_statements` | 5 min | Medium |

---

## Definition of Done (Production Ready)

- [ ] All P0 tasks ✅
- [ ] All P1 tasks ✅
- [ ] Load test passes: 1000 concurrent users, p99 < 2s, error rate < 0.1%
- [ ] Zero-downtime deploy verified (sequential `--no-deps` + health check loops in `deploy.sh`)
- [ ] Rollback tested (< 2 min) (`deploy/rollback.sh` exists)
- [ ] Secrets rotation tested
- [ ] DR drill: RDS failover + restore < 15 min
- [ ] Security scan clean (Critical/High = 0)
- [ ] Runbook documented for each service
- [ ] On-call rotation established

---

## Notes & Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-24 | ECS over EKS | Simpler ops, native AWS, team familiarity |
| 2026-07-24 | Bedrock over GPU Ollama | Zero-ops embeddings; accept vendor lock-in |
| 2026-07-24 | CloudFront+S3 for frontend | Cheaper at scale, global CDN, no nginx ops |
| 2026-07-24 | SQS for async queues | Managed, infinite scale, DLQ built-in |

---

## Related Files

- `docker-compose.yml` — Local dev stack
- `backend/Dockerfile` — Backend image
- `frontend/Dockerfile` + `nginx.conf` — Frontend image
- `backend/src/main/resources/application.yml` — Spring config
- `.github/workflows/ci.yml` / `deploy.yml` — CI/CD
- `deploy/deploy.sh` — EC2 deploy script
- `deploy/rollback.sh` — EC2 rollback script
- `deploy/terraform/` — Infrastructure as Code (AWS)
- `POSTGRES_MIGRATION_PLAN.md` — (to create) RDS migration steps
- `ECS_TERRAFORM/` — (to create) Infrastructure as Code