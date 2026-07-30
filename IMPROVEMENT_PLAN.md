# FinlyHub Improvement Plan

## Priority Legend

| Color | Level | Meaning |
|-------|-------|---------|
| 🔴 Critical | Must fix before production | Crash, security, or blocking |
| 🟠 High | Should fix soon | Performance, correctness, or UX |
| 🟡 Medium | Worth fixing | Code quality, maintainability |
| 🟢 Low | Nice-to-have | Polish, docs, minor cleanup |

---

## 🔴 Critical

### 1. [✅ Done] Remove `@ts-nocheck` from 6 frontend files

6 files disable TypeScript entirely, covering ~65% of UI logic.

**Files:** `FinlyHubSpending.tsx`, `FinlyHubReports.tsx`, `FinlyHubMatchRecords.tsx`, `FinlyHubLanding.tsx`, `FinlyHubLogin.tsx`, `FinlyHubSignup.tsx`

**Effort:** ~2h

---

### 2. [✅ Done] Fix `LazyInitializationException` risk

`InvoiceController.java:62` accesses `invoice.getUser()` (lazy) outside `@Transactional`. Same pattern in `TransactionMapper.java:15` and `DocumentMapper.java:15`.

**Effort:** ~1h

---

### 3. [✅ Done] Fix overly permissive CORS

`SecurityConfig.java:64` uses `*` origin pattern with `allowCredentials=true`, which is a security risk.

**Effort:** ~30min

---

### 4. [✅ Done] Restore CI/CD workflow files

`.github/workflows/` directory is empty — no ci.yml, no deploy.yml committed. No automated CI/CD runs.

**Effort:** ~30min

---

## 🟠 High

### 5. [✅ Done] Add missing DTO validation

`InvoiceApprovalRequest` (13 fields), `TransactionCategorizeRequest`, `CreateConversationRequest` have zero `@NotBlank`/`@NotNull`/`@Size` annotations. Invalid data reaches the database.

**Effort:** ~1h

---

### 6. [✅ Done] Fix `@Transactional` on `@Async` methods

`InvoiceProcessingService` and `DocumentProcessingService` have class-level `@Transactional` but their `@Async` methods bypass it. Each `save()` runs in its own auto-commit transaction.

**Effort:** ~1h

---

### 7. [✅ Done] Migrate `chatbot.ts` to use `apiClient` (axios)

`src/api/chatbot.ts` uses raw `fetch` instead of the shared axios client, duplicating auth header logic, missing token refresh interceptor, and hardcoding the base URL.

**Effort:** ~2h

---

### 8. [✅ Done] Wire 3 mock-only pages to real APIs

`Spending`, `Reports`, `MatchRecords` components use hardcoded mock data instead of calling the backend. API modules (`transactions.ts`, `reports.ts`, `reconciliation.ts`) and types already exist.

**Effort:** ~4h

---

### 9. [✅ Done] Fix N+1 queries in `DashboardService`

Loads all invoices/transactions/reconciliations into memory to count/filter them. Should use `countBy*` repository methods and `findByUserIdAndStatus()` queries instead.

**Effort:** ~1h

---

### 10. [✅ Done] Fix dark mode compatibility

All feature components use hardcoded light colors in `<style>` blocks. Tailwind theme CSS variables are defined but never referenced. Dark mode toggle has no effect on content.

**Effort:** ~3h

---

## 🟡 Medium

### 11. [✅ Done] Replace generic `RuntimeException` with specific types

Files like `InvoiceProcessingService`, `ReconciliationService` throw `RuntimeException` instead of specific types (`FileTooLargeException`, `ParsingException`). All caught by catch-all handler returning 500 instead of correct status codes.

**Effort:** ~2h

---

### 12. [✅ Done] Make report generation async

`ReportGeneratorService.generateReport()` aggregates transactions AND calls AI service synchronously — blocks HTTP thread for 10+ seconds.

**Effort:** ~1h

---

### 13. [✅ Done] Extract shared CSV/XLSX parsing utility

`TransactionImportService` and `ReconciliationService` have identical `getCellValue`, `parseDate`, `parseAmount` logic duplicated.

**Effort:** ~1h

---

### 14. [✅ Done] Remove unused shadcn/ui components

16 files in `components/ui/` (alert-dialog, avatar, badge, button, card, dialog, dropdown-menu, input, label, progress, scroll-area, select, separator, skeleton, switch, tabs) are never imported anywhere.

**Effort:** ~30min

---

### 15. [✅ Done] Prune unused npm dependencies

`react-hook-form`, `zod`, `react-dropzone`, `react-day-picker`, `recharts`, `@hookform/resolvers`, `@radix-ui/react-popover`, `@radix-ui/react-tooltip`, `@radix-ui/react-toast` in `package.json` but never imported in source.

**Effort:** ~30min

---

### 16. [✅ Done] Add React Error Boundaries

If any feature component throws during render, the entire app crashes with no graceful fallback.

**Effort:** ~1h

---

### 17. [✅ Done] Add rate limiting

No rate limiting on any endpoint (login, API). Brute-force / DoS risk.

**Effort:** ~1h

---

### 18. [✅ Done] Fix silent error swallowing

- `ReconciliationService.java:213` — catches `JsonProcessingException` but never logs it
- `DocumentService.deleteDocument()` — ignores `IOException` when deleting files

**Effort:** ~1h

---

### 19. [✅ Done] Avoid double JWT parsing

`JwtAuthenticationFilter` calls `validateToken()` then `getUserIdFromToken()` — both call `parseToken()` internally. Parse once and cache the result.

**Effort:** ~30min

---

### 20. [✅ Done] Fix `useEffect` dependency in `FinlyHubAssistant`

Scroll effect fires on every render because `displayMessages` is a `useMemo` that creates a new array reference each render.

**Effort:** ~30min

---

## 🟢 Low

### 21. Replace `as any` in test files

27 occurrences of `as any` in mock data across 9 test files. Defeats type safety.

**Effort:** ~2h

---

### 22. Add feature component tests

9 feature components (Overview, Bills, Assistant, Spending, Reports, MatchRecords, Documents, Settings, Landing) have zero tests. Only API/hook tests exist.

**Effort:** ~4h

---

### 23. [✅ Done] Update README.md

Still references Ollama, nomic-embed-text, 768-dim vectors — all outdated since ONNX migration.

**Effort:** ~30min

---

### 24. [✅ Done] Fix `deploy/deploy.sh`

Still writes Ollama env vars (`OPENAI_EMBEDDING_MODEL=nomic-embed-text`, `OPENAI_EMBEDDING_BASE_URL=http://ollama:11434/v1`) and tries to clean up qwen2 container.

Later upgraded to sequential `--no-deps` rebuilds with health check loops and a separate `deploy/rollback.sh`.

**Effort:** ~30min

---

### 25. [✅ Done] Update ARCHITECTURE.md and PRODUCTION_READINESS.md

Both still reference 768-dim vectors, Ollama, and the old embedding pipeline.

**Effort:** ~1h

---

### 26. [✅ Done] Fix `HealthController` to use `ApiResponse`

Returns `Map<String, String>` instead of `ResponseEntity<ApiResponse<T>>`, breaking the API envelope contract.

**Effort:** ~30min

---

### 27. Add keyboard/aria accessibility to upload dropzones

Upload areas in Bills and MatchRecords have no `role="button"`, `tabIndex`, or keyboard handlers. Not keyboard-accessible.

**Effort:** ~1h

---

### 28. Migrate inline `<style>` CSS to Tailwind

~800+ lines of CSS in template literals across all feature components. Prevents Tailwind's dead-code elimination and makes maintenance harder.

**Effort:** ~3h

---

### 29. [✅ Done] Tune async thread pools

`AsyncConfig.java` uses `queueCapacity=10` with default `AbortPolicy`. Tasks are silently rejected under load.

**Effort:** ~30min

---

### 30. [✅ Done] Enable `noUnusedLocals` in tsconfig

`tsconfig.json` has `noUnusedLocals: false`, allowing dead code to compile.

**Effort:** ~5min
