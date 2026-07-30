# Finly Hub — Accounting Realism & Feature Roadmap

Suggestions to make Finly Hub reflect how real accountants work, not just a demo shell.
See `ACCOUNTING_IMPROVEMENTS.md` glossary note at the bottom if terms are unfamiliar.

## Legend

| Status | Meaning |
|--------|---------|
| [x] | Completed |
| [-] | In progress |
| [ ] | Not started |

---

## Phase 0: Foundation (highest priority — everything else depends on this)

- [ ] **Chart of Accounts** — Add `accounts` table: Assets / Liabilities / Equity / Revenue / Expenses, with parent/child sub-accounts
- [ ] **Journal Entries (double-entry ledger)** — Add `journal_entries` + `journal_lines` tables; every entry must have debits = credits
- [ ] **Post invoices to the ledger** — Approving an invoice creates a journal entry (e.g. Debit Expense, Credit Accounts Payable)
- [ ] **Post categorized transactions to the ledger** — Approving a transaction category creates the matching journal entry
- [ ] **Post reconciliation adjustments to the ledger** — Discrepancies resolved during reconciliation generate adjusting entries
- [ ] **Trial Balance report** — Sum debits/credits per account as of a date; debits must equal credits
- [ ] **Balance Sheet report** — Assets = Liabilities + Equity, computed from the ledger
- [ ] **Rebuild P&L report from the ledger** — Revenue minus Expenses, computed from journal entries instead of raw transaction tags

## Phase 1: Invoice Processing Improvements

- [ ] **Duplicate invoice detection** — Flag same vendor + amount + date within a configurable window before approval
- [ ] **Vendor master table** — Persist `Vendor` entity (tax ID, default expense account, payment terms) instead of free-text vendor names
- [ ] **Line-item extraction** — Extract and store individual invoice line items, not just the total, for proper coding

## Phase 2: Transaction Categorization Improvements

- [ ] **Confidence-based auto-approval** — Auto-post categorizations above a confidence threshold; queue low-confidence ones for review
- [ ] **Learn from corrections** — When a user overrides a suggested category, save a vendor → category rule for future imports

## Phase 3: Reconciliation Improvements

- [ ] **Partial / split matching** — Support one bank line matching multiple invoices (or vice versa)
- [ ] **Explain non-matches** — Show why a line didn't match (amount delta, date delta) instead of just "no match"

## Phase 4: Reporting Improvements

- [ ] **Period comparison** — Month-over-month and year-over-year comparisons on reports, not just raw totals

## Phase 5: RAG Copilot Improvements

- [ ] **Ledger-grounded Q&A** — Answer questions about actual financial data (e.g. "biggest expense category last quarter") via structured query, not just uploaded documents

## Phase 6: New Features — Product Maturity

- [ ] **Multi-entity / multi-tenant support** — Accountants manage multiple client companies, not just one
- [ ] **Audit trail UI** — Browseable timeline surfacing the existing audit log JSONB diffs
- [ ] **Approval workflows** — Preparer submits, reviewer approves, before entries post to the ledger
- [ ] **Recurring transactions / accruals** — Auto-post subscriptions, rent, depreciation schedules each period
- [ ] **Tax categorization** — Map expense accounts to tax lines (e.g. Schedule C categories)
- [ ] **Export to QuickBooks / Xero** — Compatible CSV or API export so this can feed an existing system
- [ ] **Bank feed integration** — Plaid (or equivalent) instead of manual CSV/XLSX upload

---

## Suggested Demo Priorities

If prioritizing for an investor demo rather than full production readiness, the highest-impact
subset is:

1. Duplicate invoice detection
2. Category-learning from corrections
3. Real double-entry ledger producing a Trial Balance + Balance Sheet

These make the product look like real accounting software rather than an OCR + tagging demo.

---

## Quick Glossary

| Term | Meaning |
|------|---------|
| Double-entry | Every transaction has two sides — a debit and a credit — that must balance |
| Chart of Accounts | The fixed list of "buckets" (Assets, Liabilities, Equity, Revenue, Expenses) money moves through |
| Journal Entry | The actual debit/credit record of a transaction |
| General Ledger | Every journal entry ever recorded |
| Trial Balance | Summary of total debits/credits per account — should always balance |
| P&L (Income Statement) | Revenue minus Expenses over a period |
| Balance Sheet | Assets = Liabilities + Equity, at a point in time |
