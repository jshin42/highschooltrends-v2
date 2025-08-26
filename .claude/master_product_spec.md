# HighSchoolTrends.org — Master MECE Spec (Final)

> **Audience:** Eng, Data, TPM/PM, Design
> **Goal:** Ship a durable, deterministic product that monetizes parents (\$5/mo) and realtors (\$29/mo) while remaining cheap to operate and easy to scale.

---

## 1) Goals & Value Proposition (tiering locked)

**Primary goal:** Build trust with a **free, fast, accurate Trends & Compare** experience; convert to **paid alerts** that run on deterministic district sources.

### Tiers

* **Free**

  * All ranking data (2014–2024 where available), basic search & **confidence indicators**
  * Trends chart + 3-school comparison table (limits applied), no exports/alerts
* **Parent (\$5/mo)**

  * * Unlimited comparisons, extended history, **alerts** (rezoning, policy/handbook deltas, program changes), monthly digest
* **Realtor (\$29/mo)**

  * * Professional PDF reports, bulk exports, **read API access** (rate-limited), buyer tour planner, farm heatmap

**Conversion KPI:** ≥7% 30-day conversion from free viewers who compare ≥2 schools.

---

## 2) Scope & Scale (data reality)

* **US, public high schools** (has Grade 12)
* **USNews** HTML snapshot volumes (for scale planning):

  * `USNEWS_2024`: **17,660** HTML files
  * `USNEWS_2025`: **18,878** HTML files
* **Other sources (deterministic):** BoardDocs, Legistar, BoardBook, Diligent Community, Simbli (agendas/minutes/policies), ArcGIS (attendance polygons), district handbooks (current+prior), per-event ICS

---

## 3) Feature Set (MECE; P0/P1 focus)

### A. Free “Trends & Compare” (Top-of-Funnel)

* **Trends Chart:** time-series of normalized metrics (USN percentile, Niche score, enrollment).
* **Comparison Table:** latest values + Δ1y/Δ3y for up to **3** schools.
* **Confidence indicators:**

  * **Verified** (Bucket 1), **Estimated** (Bucket 2), **ML Estimated** (Bucket 3).
* **Gates:** no export; extended history & rezoning badge details **paywalled**.

### B. Paid Alerts (Parents)

* **Top 3 weekly alerts (prioritized):**

  1. **Rezoning Stage Change** (discussion → first reading → vote scheduled); includes affected zones and next date.
  2. **New Boundary Option Maps/Packets uploaded** (Option A/B/C; tables/maps; citations).
  3. **Handbook/SR\&R policy delta** (HS-relevant sections changed since prior year).
* Freshness SLO: ≤24h from source publication; **citations with page anchors required**.

### C. Paid Workflows (Realtors)

* **Listing → Snapshot PDF** (<60s P95; co-branded; citations), **bulk export**, **read API**.

---

## 4) Architecture (deterministic & cheap to run)

### Async watcher model (cost control)

* **Watchers start only when a user subscribes** (Parent/Realtor) and run **until unsubscribe**.
* Free tier reads **precomputed Gold** only (no per-user crawling).

### Data layers

* **Bronze:** manifests + raw blobs (PDF/HTML/ICS/GeoJSON)
* **Silver:** Docling-parsed chunks (Markdown + anchors, JSON)
* **Gold:** feature-ready views (trends, events, risk, compare snapshot)

---

## 5) Deterministic source discovery (MECE)

**A. Governance portals (Agendas/Minutes/Policies)**
BoardDocs, Legistar, BoardBook, Diligent Community, Simbli — fetch agendas, packets, minutes, policy PDFs.

**B. Boundary hubs & option maps**
District CMS paths matching `(boundary|rezoning|attendance|planning|engage)`; capture **Option A/B/C** PDFs/PNGs.

**C. Attendance polygons (ArcGIS)**
Portal/Hub APIs → Feature/Map services with `geometryType=Polygon`; GeoJSON snapshots.

**D. Calendars / ICS**
Legistar per-event iCal; district meeting hubs (date anchoring).

**E. Handbooks / SR\&R (current + prior)**
Delta by section; HS only.

**Manifests:** JSONL per category with `{district_id, doc_type, canonical_url, fetched_at, checksum, confidence, evidence[]}`.

---

## 6) USNews HTML → Gold Standard (contract & example)

### 6.1 Input & paths

* Snapshot directories:

  * `/USNEWS_2024/**/*.html` (17,660 files)
  * `/USNEWS_2025/**/*.html` (18,878 files)
* Example file:
  `file:///Volumes/OWC Express 1M2/USNEWS_2025/william-fremd-high-school-6921/docker_curl_20250821_061341.html`

### 6.2 Normalized **Gold** schema (per school, per year)

```json
{
  "year": 2025,
  "nces_id": "string|null",                // resolved later; allow null at ingest
  "usn_slug": "string",                    // e.g., william-fremd-high-school-6921
  "name": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zip": "string"
  },
  "phone": "string|null",
  "website": "string|null",
  "grades": "string",                      // "9-12"
  "enrollment": 2657,                      // integer
  "student_teacher_ratio": "16:1",
  "national_rank": 397,                    // int|null
  "state_rank": 14,                        // int|null
  "ap_participation_rate": 62.0,           // percent as float (0-100)
  "ap_pass_rate": 56.0,                    // float
  "math_proficiency": 64.0,                // float
  "reading_proficiency": 63.0,             // float
  "science_proficiency": 77.0,             // float
  "graduation_rate": 94.0,                 // float
  "demographics": {
    "white_pct": 45.3,
    "asian_pct": 31.6,
    "hispanic_pct": 14.0,
    "black_pct": 4.7,
    "two_or_more_pct": 4.1,
    "american_indian_pct": 0.01
  },
  "gender": {
    "female_pct": 49.0,
    "male_pct": 51.0
  },
  "economically_disadvantaged_pct": null,
  "free_lunch_pct": null,
  "reduced_lunch_pct": null,
  "college_readiness_index": 57.6,
  "setting": "large suburb",
  "full_time_teachers": 163,
  "confidence_bucket": "verified|estimated|ml_estimated",
  "provenance": {
    "source": "USNEWS",
    "html_path": "absolute/path.html",
    "captured_at": "ISO8601",
    "checksum_sha256": "hex"
  }
}
```

### 6.3 **Gold standard example** (from the provided file)

```json
{
  "year": 2025,
  "usn_slug": "william-fremd-high-school-6921",
  "name": "William Fremd High School",
  "address": {
    "street": "1000 S Quentin Rd",
    "city": "Palatine",
    "state": "Illinois",
    "zip": ""
  },
  "phone": "(847) 755-2610",
  "website": "http://adc.d211.org/Domain/9",
  "grades": "9-12",
  "enrollment": 2657,
  "student_teacher_ratio": "16:1",
  "national_rank": 397,
  "state_rank": 14,
  "ap_participation_rate": 62.0,
  "ap_pass_rate": 56.0,
  "math_proficiency": 64.0,
  "reading_proficiency": 63.0,
  "science_proficiency": 77.0,
  "graduation_rate": 94.0,
  "demographics": {
    "white_pct": 45.3,
    "asian_pct": 31.6,
    "hispanic_pct": 14.0,
    "black_pct": 4.7,
    "two_or_more_pct": 4.1,
    "american_indian_pct": 0.01
  },
  "gender": {
    "female_pct": 49.0,
    "male_pct": 51.0
  },
  "economically_disadvantaged_pct": null,
  "free_lunch_pct": null,
  "reduced_lunch_pct": null,
  "college_readiness_index": 57.6,
  "setting": "large suburb",
  "full_time_teachers": 163,
  "confidence_bucket": "verified",
  "provenance": {
    "source": "USNEWS",
    "html_path": "file:///Volumes/OWC Express 1M2/USNEWS_2025/william-fremd-high-school-6921/docker_curl_20250821_061341.html",
    "captured_at": "2025-08-21T06:13:41Z",
    "checksum_sha256": "<sha256>"
  }
}
```

> **Note:** If ZIP is not present in page, leave empty; do **not** invent.

### 6.4 Storage layout (authoritative)

```
/data/gold/usnews/
  2024/schools.jsonl         # one record per school
  2025/schools.jsonl
  2024/schools.parquet       # columnar for analytics
  2025/schools.parquet
  schemas/usnews_school_v1.json
```

### 6.5 Extraction rules (HTML → fields)

* Prefer **DOM selectors** on stable labels; fallback to regex on rendered text.
* Strip commas from numerics; store **percent as float** (e.g., `62%` → `62.0`).
* Normalize race labels to our keys; missing → `null`.
* Phone canonical form: as-shown text (no reformatting).
* **Website**: take primary school site if multiple links appear.

### 6.6 Rank bucketing & dedup (confidence)

* **Bucket 1 (Verified):** **National exact ranks** `#1–#13,426` → `confidence_bucket="verified"`

  * **Uniqueness rule:** national ranks in **Bucket 1 must be unique** across all schools for that year. Hard-fail on duplicates.
* **Bucket 2 (Estimated):** **National range ranks** `#13,427–#17,901` (USN shows e.g., “#13,427–#13,500”)

  * Store `national_rank = null`, add `estimated_rank_range=[low,high]`, set `confidence_bucket="estimated"`.
  * Duplicates allowed (range bins).
* **State-only ranks:** e.g., “309–395th within Indiana” → store `state_rank = 395` (use the **higher number**), `national_rank=null`, `confidence_bucket="estimated"`.
* **Unranked:** `confidence_bucket="ml_estimated"` (no rank values).
* **Display mapping → UI badges:**

  * Verified → **green** “Verified”
  * Estimated → **amber** “Estimated”
  * ML Estimated → **gray** “Modeled”

### 6.7 QC & validation (must pass CI)

* Schema validation (required fields by bucket).
* **Monotone checks:** `female_pct + male_pct` ∈ \[95,105] (tolerate rounding).
* Percent fields ∈ \[0,100]; enrollment/teachers are integers ≥0.
* **Bucket-1 uniqueness:** no duplicate national ranks in same year.
* **Diff checks:** year-over-year extreme jumps flagged for review (>30 pct-pt).

---

## 7) APIs (Free & Paid)

**Free**
`GET /api/schools/{id}/trends?metrics=usn_percentile,niche_score,enrollment&from=2017&to=2024`
`GET /api/compare?school_ids=ID1,ID2,ID3&metrics=...` (≤3 IDs)

**Paid (Parents)**
`POST /api/watchlists` (starts watchers)
`GET /api/alerts?since=...`

**Paid (Realtors)**
`POST /api/reports/snapshot`
`GET /api/export/usnews?year=2025&format=parquet` *(rate-limited)*

---

## 8) SLIs / SLOs / Acceptance

* **Free Trends API** P95 < **300ms**; Compare P95 < **350ms** (CDN cached).
* **Snapshot PDF** P95 < **60s**; **Rezoning alerts** freshness ≤ **24h**; **citations required**.
* **USNews Gold build** completeness ≥ **99%** of discovered files; Bucket-1 uniqueness = **100%**.
* **Confidence display** on all school pages; no “unknown” states.

Acceptance for this spec: first release meets all SLOs above and passes QC gates in §6.7.

---

## 9) Rollout (first 4 weeks)

1. Build **USNews Gold** (`2024`, `2025`) per schema + QC.
2. Ship **Free Trends & Compare** (limits, confidence badges).
3. Enable **Paid watchers** (start/stop on subscribe).
4. Wire **Top 3 weekly alerts** (rezoning stage, new option maps/packets, handbook delta).
5. Release **Snapshot PDF** (realtor) and **read API** (rate-limited).

---

## 10) Risks & Mitigations

* **HTML drift:** maintain selector map + regex fallback; nightly canary scrape; quarantine on mismatch.
* **Duplicate ranks:** CI hard-fails Bucket-1 duplicates; triage queue.
* **Scrape costs:** watchers only for subscribers; batch Docling; ETag + checksum to avoid re-parse.
* **Compliance:** fair-housing lexicon; no demographic claims; citations on all summaries.

---

## 11) Developer Notes (how to build this cleanly)

* **Never** ship one-off scripts; integrate into ETL with tests + docs.
* **Idempotency keys**: `(source_url, checksum_sha256)` for blobs; `(year, usn_slug)` for USNews gold.
* **Paths:** see §6.4; keep JSONL as truth, Parquet for analytics.
* **Tests:** contract tests for APIs; QC tests for gold; UI tests for limits/gating/a11y.
* **Observability:** structured logs `{school_id, year, duration_ms, bucket, qc_flags[]}`.

---

### Appendix A — USNews rank → UI confidence mapping

* **Bucket 1:** “Verified” (Green)
* **Bucket 2:** “Estimated” (Amber)
* **Bucket 3:** “ML Estimated” (Gray)

### Appendix B — Compare table fields (free)

`usn_percentile_latest`, `Δ1y`, `Δ3y`, `niche_score_latest`, `enrollment_latest`, flags: `AP`, `IB`

### Appendix C — Weekly alert triggers (deterministic)

* **Rezoning Stage Change:** match agenda item keywords `(boundary|attendance zone|redistrict)` + stage `(first reading|action|adoption)`; include meeting date from ICS.
* **New Option Maps/Packets:** new PDFs/PNGs matching `option[_ -]?(A|B|C)`; attach page anchors.
* **Handbook Delta:** diff HS sections across `year-1` vs `year` Docling outputs; include changed clauses.

---

**This .md is the single source of truth for P0/P1.**
If a decision isn’t reflected here, it’s not in scope.
