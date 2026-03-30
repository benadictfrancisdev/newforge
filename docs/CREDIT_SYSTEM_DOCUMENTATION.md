# SpaceForge Credit System & AI Cost Documentation

## 1. How SpaceForge Uses Lovable AI Gateway

SpaceForge routes ALL AI calls through a single edge function (`data-agent/index.ts`) which calls:
```
https://ai.gateway.lovable.dev/v1/chat/completions
```
Authenticated via `LOVABLE_API_KEY` (auto-provisioned).

### Model Selection Strategy
| Task Tier | Model Used | Cost Profile |
|---|---|---|
| Standard tasks (insights, query, clean, chat) | `google/gemini-2.5-flash` | Low cost, fast |
| Pro tasks (prediction, hypothesis, risk, causal, ML) | `google/gemini-2.5-pro` | Higher cost, higher quality |

---

## 2. Token Consumption Per Feature

### How tokens are calculated per API call

Each call sends to the AI:
- **System prompt**: ~200–400 tokens (varies by action)
- **Dataset schema** (column names + types): ~80 tokens × number of columns
- **Sample data** (first 20–100 rows serialized as JSON): main variable
- **User query/context**: ~50–200 tokens
- **Output**: 500–3,000 tokens (JSON response)

### Formula: Input Tokens Per Call

```
Input Tokens ≈ SystemPrompt(300) + Schema(cols × 80) + SampleRows(min(rows,100) × cols × 5) + Query(150)
```

### Example Token Calculations

| Dataset Size | Columns | Sample Sent | Input Tokens | Output Tokens | Total Tokens |
|---|---|---|---|---|---|
| 5K rows × 20 cols | 20 | 20 rows | ~2,450 | ~1,500 | ~3,950 |
| 10K rows × 30 cols | 30 | 20 rows | ~3,850 | ~2,000 | ~5,850 |
| 50K rows × 40 cols | 40 | 20 rows | ~4,850 | ~2,500 | ~7,350 |
| 100K rows × 50 cols | 50 | 20 rows | ~5,450 | ~2,500 | ~7,950 |
| 250K rows × 60 cols | 60 | 20 rows | ~6,850 | ~3,000 | ~9,850 |

**Key insight**: Token cost is driven by COLUMNS, not rows. We only send 20–100 sample rows regardless of dataset size. A 250K row dataset costs nearly the same per call as a 10K row dataset.

---

## 3. Estimated Lovable AI Cost Per Call

Using Gemini pricing estimates:
- Flash input: ~$0.075/1M tokens, output: ~$0.30/1M tokens
- Pro input: ~$1.25/1M tokens, output: ~$5.00/1M tokens

| Model | Typical Input | Typical Output | Cost Per Call |
|---|---|---|---|
| Gemini Flash (standard tasks) | ~5,000 tokens | ~2,000 tokens | **~$0.001** |
| Gemini Pro (pro tasks) | ~6,000 tokens | ~2,500 tokens | **~$0.020** |

---

## 4. Complete Feature → API Call Mapping

### ANALYST Mode

| Feature | Section | API Calls Per Use | Model | SpaceForge Credits |
|---|---|---|---|---|
| NLP Engine | Analysis | 1 per query | Flash | 2 |
| Statistics | Analysis | 1 | Flash | 1 |
| Hypothesis Testing | Analysis | 1 | Pro | 3 |
| Predict | Analysis | 1–2 | Pro | 3 |
| ML Workbench | Analysis | 2–3 (train + evaluate) | Pro | 5 |
| Causal Model | Analysis | 1 | Pro | 4 |
| Time Intelligence | Analysis | 1 | Pro | 3 |
| Smart Imputation | Analysis | 1 | Pro | 2 |
| Behavioral Segmentation | Analysis | 1 | Pro | 3 |
| KPI Comparison Cards | Visualize | 1 | Pro | 2 |
| Dashboard (PowerBI) | Visualize | 1 (AI layout) | Pro | 3 |
| Charts | Visualize | 0 (client-side) | — | 0 |
| Auto Dashboard | Visualize | 1 | Pro | 3 |
| Live Stream | Visualize | 0 (client-side) | — | 0 |
| Insight Engine | AI Engine | 1 | Flash | 2 |
| Narratives | AI Engine | 1 | Pro | 3 |
| Trust Layer | AI Engine | 1 | Pro | 3 |
| SQL Forge | Tools | 0 (client-side) | — | 0 |
| Stakeholder Report | Export | 1 | Pro | 4 |
| Full Report | Export | 1–2 | Pro | 5 |
| Chat | Export | 1 per message | Flash | 1 |
| Calendar Table Gen | Tools | 1 | Pro | 2 |

### SCIENTIST Mode

| Feature | Section | API Calls | Model | Credits |
|---|---|---|---|---|
| NLP Engine | Analysis | 1 | Flash | 2 |
| Predict | Analysis | 1–2 | Pro | 3 |
| Statistics | Analysis | 1 | Flash | 1 |
| Hypothesis Builder | Research | 1 | Pro | 3 |
| Experiment Design | Research | 1 | Pro | 4 |
| Feature Engineering | Research | 1 | Pro | 3 |
| Model Arena | Research | 3–5 (multi-model) | Pro | 8 |
| Hyperparameter Tuning | Research | 2–3 | Pro | 5 |
| Research Paper Gen | Research | 2 | Pro | 6 |
| Smart Imputation | Analysis | 1 | Pro | 2 |
| Calendar Table Gen | Tools | 1 | Pro | 2 |
| Pattern Detection | Analysis | 1 | Pro | 3 |
| Causal Model | Analysis | 1 | Pro | 4 |
| Trust Layer | AI Engine | 1 | Pro | 3 |
| Narratives | AI Engine | 1 | Pro | 3 |
| Insight Engine | AI Engine | 1 | Flash | 2 |
| SQL Forge | Tools | 0 | — | 0 |
| Stakeholder Report | Export | 1 | Pro | 4 |
| Full Report | Export | 1–2 | Pro | 5 |
| Chat | Export | 1/msg | Flash | 1 |

### FOUNDER Mode

| Feature | Section | API Calls | Model | Credits |
|---|---|---|---|---|
| Business KPIs | BI | 1 | Pro | 3 |
| Risk Scoring Engine | BI | 1 | Pro | 4 |
| Strategic Actions | BI | 1 | Pro | 4 |
| Scenario Simulation | BI | 1–2 | Pro | 5 |
| Investor Report | BI | 2 | Pro | 6 |
| KPI Comparison Cards | BI | 1 | Pro | 2 |
| NLP Engine | Analysis | 1 | Flash | 2 |
| Dashboard | Analysis | 1 | Pro | 3 |
| Narratives | AI Engine | 1 | Pro | 3 |
| Trust Layer | AI Engine | 1 | Pro | 3 |
| SQL Forge | Tools | 0 | — | 0 |
| Stakeholder Report | Export | 1 | Pro | 4 |
| Full Report | Export | 1–2 | Pro | 5 |
| Chat | Export | 1/msg | Flash | 1 |

### ORGANIZATION Mode
Combines ALL Analyst + Founder features. Same credit costs apply.

---

## 5. Realistic Usage Scenarios

### Standard Plan — $19.99/mo (500 credits)

**Target**: Individual analyst, freelancer, small projects
**Limits**: 10 datasets/mo, 50K rows max, 40 columns, 25 reports

#### Typical Monthly Session (per dataset):
| Action | Credits | Frequency | Total |
|---|---|---|---|
| Upload + Auto Insights | 2 | 1× | 2 |
| NLP queries | 2 each | 5× | 10 |
| Statistics | 1 | 2× | 2 |
| Hypothesis Testing | 3 | 2× | 6 |
| Predict | 3 | 1× | 3 |
| Dashboard | 3 | 1× | 3 |
| Chat messages | 1 each | 5× | 5 |
| Report | 5 | 1× | 5 |
| **Subtotal per dataset** | | | **36** |

**5 active datasets/mo**: 5 × 36 = **180 credits**
**10 active datasets/mo**: 10 × 36 = **360 credits**

✅ **500 credits covers 10 datasets comfortably for standard usage**

**Actual Lovable AI cost**: 10 datasets × ~15 API calls × $0.005 avg = **~$0.75/month**

---

### Pro Plan — $49.99/mo (1,500 credits)

**Target**: Data scientists, consultants, agencies
**Limits**: 30 datasets/mo, 250K rows max, 75 columns, 60 reports

#### Typical Monthly Session (per dataset — heavy usage):
| Action | Credits | Frequency | Total |
|---|---|---|---|
| Upload + Auto Insights | 2 | 1× | 2 |
| NLP queries | 2 each | 10× | 20 |
| Statistics | 1 | 3× | 3 |
| Hypothesis Testing | 3 | 3× | 9 |
| Predict | 3 | 2× | 6 |
| ML Workbench | 5 | 2× | 10 |
| Causal Model | 4 | 1× | 4 |
| Time Intelligence | 3 | 1× | 3 |
| Behavioral Segmentation | 3 | 1× | 3 |
| KPI Comparison | 2 | 2× | 4 |
| Dashboard (AI) | 3 | 1× | 3 |
| Auto Dashboard | 3 | 1× | 3 |
| Narratives | 3 | 1× | 3 |
| Trust Layer | 3 | 1× | 3 |
| Risk Engine | 4 | 1× | 4 |
| Stakeholder Report | 4 | 1× | 4 |
| Full Report | 5 | 1× | 5 |
| Chat messages | 1 each | 10× | 10 |
| **Subtotal per dataset** | | | **99** |

**10 active datasets/mo**: 10 × 99 = **990 credits**
**15 active datasets/mo**: 15 × 99 = **1,485 credits** (right at limit)

✅ **1,500 credits covers ~15 datasets with full Pro features**

**Actual Lovable AI cost**: 15 datasets × ~30 API calls × $0.012 avg = **~$5.40/month**

---

### Team Plan — $89.99/mo (4,000 credits)

**3 users × 10 datasets each = 30 datasets**
30 datasets × 99 credits = **2,970 credits**

✅ **4,000 credits covers a 3-person team with headroom**

**Actual Lovable AI cost**: ~$10.80/month

---

## 6. Why Credits ≠ Tokens

Credits are a **business abstraction**, not a 1:1 token mapping.

| Credit | Actual AI Cost | Your Margin |
|---|---|---|
| 1 credit (chat query) | ~$0.001 | 99.8% margin |
| 3 credits (hypothesis) | ~$0.020 | 93.3% margin |
| 5 credits (ML workbench) | ~$0.025 | 95% margin |
| 8 credits (model arena) | ~$0.060 | 92.5% margin |

**Monthly P&L per plan:**

| Plan | Revenue | AI Cost | Gross Margin |
|---|---|---|---|
| Standard $19.99 | $19.99 | ~$0.75 | **96.2%** |
| Pro $49.99 | $49.99 | ~$5.40 | **89.2%** |
| Team $89.99 | $89.99 | ~$10.80 | **88.0%** |

---

## 7. Credit Economy Design Principles

1. **Client-side features = 0 credits** (Charts, SQL Forge, Live Stream)
2. **Flash model features = 1–2 credits** (Chat, NLP, basic insights)
3. **Pro model features = 3–5 credits** (Hypothesis, Predict, Risk, Reports)
4. **Multi-call features = 5–8 credits** (ML Arena, Research Paper, Full Report)
5. **Token count is COLUMN-driven, not ROW-driven** — we only send sample rows

---

## 8. Row Limit Rationale

| Plan | Row Limit | Why |
|---|---|---|
| Free | 10K | Enough for demos and small experiments |
| Standard | 50K | Covers most business analytics (marketing, sales, HR) |
| Pro | 250K | Handles enterprise-scale data (transactions, CRM, product analytics) |
| Team | 500K | Multi-user enterprise datasets |

**Processing**: Browser handles up to ~100K rows for client-side charting. For 250K+, we use virtual scrolling and server-side aggregation patterns. AI analysis always uses a 20–100 row sample regardless of size.

---

## 9. Summary: What Runs When

```
User uploads dataset (50K rows × 40 cols)
    │
    ├── Auto-Insights → 1 Flash call (2 credits, ~$0.001)
    │
    ├── User asks NLP question → 1 Flash call (2 credits, ~$0.001)  
    │
    ├── User runs Statistics → 1 Flash call (1 credit, ~$0.001)
    │
    ├── User runs Hypothesis Test → 1 Pro call (3 credits, ~$0.020)
    │
    ├── User generates Dashboard → 1 Pro call (3 credits, ~$0.020)
    │
    ├── User exports Full Report → 2 Pro calls (5 credits, ~$0.040)
    │
    └── Total session: ~16 credits, ~$0.083 actual AI cost
```
