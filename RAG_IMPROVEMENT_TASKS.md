# RAG Improvement Tasks

## Legend

| Status | Meaning |
|--------|---------|
| [x] | Completed |
| [-] | In progress |
| [ ] | Not started |

---

## Highest Priority

- [ ] **Add BGE query instruction prefix** — Prepend `"Represent this sentence for searching relevant passages: "` to the user's question before embedding (query side only, not documents)
- [ ] **Add similarity threshold on retrieval** — Discard chunks below a cosine similarity cutoff (e.g. ~0.4-0.5) instead of always returning top 5; show "no relevant documents found" in the UI when nothing clears the bar
- [ ] **Add hybrid search (keyword + vector)** — Add Postgres full-text search (`tsvector`/`ts_rank`) alongside vector search and combine results, so exact matches (invoice IDs, account codes, dollar amounts) aren't missed by semantic search alone

## Medium Priority

- [ ] **Implement real batch embedding** — Pad inputs to a common length and run as a true `[batch, 512]` tensor through ONNX instead of looping `embed()` sequentially
- [ ] **Chunk by actual token count, not word count** — Use the tokenizer's token count for the 512-token window instead of `str.split()` word count, to avoid silent truncation
- [ ] **Fix zero-vector embedding failure fallback** — Mark failed chunks as `FAILED` and exclude them from the vector index instead of inserting a zero vector
- [ ] **Switch IVFFLAT to HNSW index** — Replace the fixed `lists = 50` IVFFLAT index with pgvector HNSW, which doesn't require list-count tuning and degrades more gracefully as data grows

## Nice to Have

- [ ] **Add reranking / MMR** — Add a second pass (cross-encoder rerank or Maximal Marginal Relevance) after the top-K vector fetch to improve precision and result diversity
- [ ] **Add metadata filtering on retrieval** — Allow scoping search to document type/date range so unrelated document types don't pollute results
- [ ] **Build a golden eval set** — 15-20 hand-written Q&A pairs against seeded demo documents, checked against expected source chunks, to measure retrieval quality (precision@k) objectively when tuning thresholds/chunking
