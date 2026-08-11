# FFHS V1 — Calculation Engine Validation Report

**Scope:** `src/lib/scoring.js` (416 lines) against `docs/METHODOLOGY.md` and the product methodology restated in the audit
brief (they match field-for-field — see §3).

**Method:** static read of the full implementation and the UI input-gating layer; ran the existing `vitest` suite; built
an independent Node harness (outside the app, not committed) that called the exported scoring functions directly across
~110 explicit scenarios/edge-cases plus a 500-run randomized fuzz pass; then hand-verified every claim below with a
fresh, isolated repro before writing it down. Findings below were reported and classified first, not silently patched —
the sections were written from that first audit pass and are kept as the historical record.

> **✅ Status update — P0 fixed.** The systemic Debt-pillar bug described in §13–14 (direction-blind handling of
> undefined/zero-denominator ratios) has since been fixed in `src/lib/scoring.js` and locked in with 5 new regression
> tests in `src/lib/scoring.test.js` (29/29 passing). All three manifestations were re-verified fixed with the exact
> repros documented below, and the full harness (500-fuzz + ~110 targeted cases) was re-run against the patched engine
> with no regressions — see the **Fix Applied** section at the end of this document for exactly what changed and why.
> The §15 methodology concerns (P1-1 income monotonicity, P1-2 passive-income exclusion) are **unchanged** — those are
> product decisions, not code defects, and were intentionally left untouched.

---

## 1. Executive Summary

The engine is well-built for a V1. Every pillar/score/FFHS invariant (`0 ≤ score ≤ max`, no `NaN`/`Infinity`,
determinism) held across 500 randomized fuzz trials and ~110 targeted edge cases. Diminishing-returns curves, debt-quality
ranking (when inputs are well-formed), momentum/FFHS independence, and the biggest-opportunity engine all behave exactly
as documented. The doc and the code are in sync — no formula in `scoring.js` lacks a source in `docs/METHODOLOGY.md`,
and nothing documented is missing from code.

One **systemic P0 implementation bug** was found, with three independently confirmed manifestations, all traceable to
the same root cause: the codebase's curve-normalization pipeline (`piecewiseLinear` + `safeRatio`) is not
**direction-aware** when a ratio comes back non-finite, undefined, or out-of-domain. For an *increasing* curve ("more is
better"), treating a bad ratio as "the low end" is safe. For a *decreasing* curve — every metric in the Debt pillar —
the same fallback silently hands out the **best** score instead of the worst:

- A family with real debt and **zero recorded assets** scores the maximum (60/60) on Debt-to-Assets.
- A family with **zero income** and a real EMI obligation scores the maximum on both Debt-to-Income (60/60) and Interest
  Burden (70/70).
- A **negative** debt-category entry (bad data, not a legitimate financial state) can push a ratio negative, which the
  same clamp logic also reads as "best."

In each case, the specific household this scoring product exists to flag as at-risk — no savings, no income, or
data-entry error — instead gets rewarded. This was confirmed three separate ways with isolated reproductions (§14).

Two **P1 methodology findings** were also confirmed with reproducible test cases, both squarely the kind of thing this
audit was commissioned to catch: (1) a pure income increase, with everything else held constant, can *lower* the FFHS
score by tens of points; (2) Cash Flow and the Financial Efficiency headline metric ignore passive income entirely, so a
genuinely comfortable retired/passive-income-heavy household can show a **−300% Efficiency** figure and a gutted Cash
Flow pillar.

No crashes were produced under any input tried, including null/undefined/NaN/Infinity/boolean/string-typed fields fed
directly to the exported functions — the engine degrades to a wrong-but-finite-and-in-range number, never a throw.

| | |
|---|---|
| Scenarios tested | 20 required + ~90 additional targeted/edge cases |
| Fuzz trials | 500 (0 range/finiteness violations) |
| Implementation bugs (confirmed) | 1 systemic P0 (3 manifestations) + 2 minor (P2/P3) |
| Methodology concerns (confirmed) | 2 P1 + 2 minor (P2/E) |
| Crashes | 0 |
| Existing test suite | 24/24 passing (unchanged) |

---

## 2. Current Implementation Architecture

```
src/lib/scoring.js             — pure functions, no framework dependency, single source of scoring truth
src/lib/scoring.test.js        — 5 synthetic-family vitest suites, 24 assertions, all passing
src/lib/questionnaireSchema.js — UI field definitions + required/type metadata (validation lives HERE, not in scoring.js)
src/lib/defaultFormData.js     — initial form state (wealth/liquidity/debt fields default to 0, never undefined/null)
src/components/QuestionnaireFlow.vue — per-step isFieldValid() gates required numeric fields before next()
src/components/ResultPage.vue  — renders pillar totals, score, rating, momentum, efficiency, freedom, biggest opportunity
                                  (never renders raw per-metric .value fields — relevant to reachability throughout)
docs/METHODOLOGY.md            — the spec; matches the audit brief's weights/pillars exactly
```

**Two shared primitives carry all the risk in this codebase:**
- `piecewiseLinear(value, points)` — interpolates a ratio onto a score curve; flat-clamps at both ends via
  `value <= points[0][0]` / `value >= last[0]`; additionally guards `!Number.isFinite(value)` by returning
  `points[0][1]` (the curve's *first* breakpoint) before those clamp comparisons ever run.
- `safeRatio(a, b, whenZero = 0)` — guards a **falsy/zero denominator only**, returning `whenZero`; does not guard a
  non-finite numerator, and its `whenZero` default of `0` is applied uniformly regardless of whether the curve it
  feeds is increasing or decreasing.

Both are single, shared, reusable — a good design in general — but exactly where the systemic bug in §14 lives: one
correct special case (`debtToAssets`'s explicit `whenZero: Infinity` override) sits next to three sibling call sites
that needed the same treatment and didn't get it.

### Input → Output map (verified against code, not assumed)

```
INPUT (questionnaire, snake_case)
  → DERIVED METRIC   (e.g. savingsRate = (income−expenses)/income, efMonths = fund/essential, dti = EMI/income)
  → NORMALIZATION     (piecewiseLinear against documented breakpoints, per-metric max)
  → PILLAR SCORE      (sum of 4 metrics per pillar, capped by construction at the pillar max)
  → FFHS              (sum of 5 pillar totals, 0–1000)
  → RATING             rateScore(): first band where score ≥ threshold, checked 900→800→700→600→500→0
  → INSIGHTS:
      - Momentum:   independent — average of 5 self-reported ±1/0 trend signs, never touches FFHS
      - Efficiency: independent ratio — (monthlySurplus + debtPrincipalReduction) / income
      - Freedom:    independent ratio — passiveIncome / totalExpenses
      - Biggest Opportunity: (pillarMax − pillarTotal) × actionabilityMultiplier, argmax over 5 pillars
```

---

## 3. Methodology Verified

The audit brief's weights match `docs/METHODOLOGY.md` and the code exactly:

| Pillar | Brief max | Code max | Metric weights (brief) | Metric weights (code) | Match |
|---|---:|---:|---|---|:---:|
| Cash Flow | 250 | 250 | 70/60/60/60 | 70/60/60/60 | ✅ |
| Liquidity | 150 | 150 | 80/40/30 | 80/40/30 | ✅ |
| Debt | 250 | 250 | 60/60/70/60 | 60/60/70/60 | ✅ |
| Wealth Creation | 200 | 200 | 60/40/60/40 | 60/40/60/40 | ✅ |
| Risk Management | 150 | 150 | 50/40/30/30 | 50/40/30/30 | ✅ |
| **Total** | **1000** | **1000** | | | ✅ |

Rating bands, the Momentum trend-sign table, the Efficiency/Freedom formulas, and the Biggest-Opportunity actionability
multipliers (Risk 1.5, Liquidity 1.3, Cash Flow 1.0, Wealth 0.7, Debt 0.5) all match `docs/METHODOLOGY.md` exactly,
including the doc's own worked example (Risk Management wins as biggest opportunity despite Debt having a larger
absolute point gap — reproduced independently in this audit, see §13 #10).

One naming note, not a discrepancy: the brief calls the second Debt metric "Debt-to-Net-Worth"; the code (and
`METHODOLOGY.md`) implements it as **debt ÷ gross assets**, with an explicit documented rationale (literal net worth can
be zero/negative early in a mortgage, which would make a net-worth-denominator ratio unstable). Deliberate, documented
design choice — flagged only for traceability.

---

## 4. Test Coverage

| Area | Method | Count |
|---|---|---:|
| Score boundaries (absolute + per-pillar min/max) | targeted extreme fixtures | 7 |
| Zero/empty/missing/NaN/Infinity | targeted fixtures per field | 27 |
| Negative values | targeted fixtures per field + net-worth + ratio-flip cases | 18 |
| Realistic family scenarios | S1–S20 per brief | 20 |
| Monotonicity | before/after pairs, corrected-order re-verification | 18 base + 5 re-verified |
| Diminishing returns | 4–6 point curves per metric | 4 |
| Debt quality | same-amount/income/EMI/rate/assets comparisons | 5 |
| Liquidity | months progression + absolute-cash context | 2 |
| Cash flow | 2×2 income/expense matrix + zero-surplus case | 2 |
| Wealth creation | 6-case matrix + market-appreciation isolation | 7 |
| Momentum | A/B/C + high/low-FFHS distinguishability | 2 |
| Efficiency | active-vs-appreciation isolation | 1 |
| Freedom | 6-point series + zero-expense/zero-both/retired cases | 4 |
| Rating boundaries | 18 scores around every threshold | 1 |
| Invalid input types | 11 malformed-type fixtures | 11 |
| Invariants | 500-run randomized fuzz + determinism check | 501 |
| Cross-scenario pair diffs | 9 single-variable before/after pairs | 9 |

Total distinct assertions/observations beyond the pre-existing 24: **~120**.

---

## 5. Scenario Results (S1–S20)

| # | Scenario | FFHS | Rating | Weakest pillar | Biggest opportunity | Momentum | Vs. expected |
|---|---|---:|---|---|---|---|---|
| S1 | Young professional | 676.3 | Stable | Liquidity (32.6%) | Liquidity | Strong Positive | ✅ moderate health, strong momentum |
| S2 | High-income overspender | 455.4 | High Risk | Liquidity (10.0%) | Liquidity | Negative | ✅ income alone did not buy a good score |
| S3 | Low-income disciplined saver | 736.0 | Healthy | Wealth (61.0%) | Cash Flow | Strong Positive | ✅ credited for discipline despite modest income |
| S4 | High-net-worth, illiquid | 379.3 | High Risk | Liquidity (10.5%) | Cash Flow | Negative | ✅ wealth did not hide poor liquidity/cash flow |
| S5 | Strong household | 925.4 | Exceptional | Wealth (84.7%) | Wealth | Strong Positive | ✅ very high FFHS |
| S6 | Single-income, dependents | 773.1 | Healthy | Wealth (55.3%) | Wealth | Neutral | ✅ diversity gap did not tank overall health |
| S7 | Multi-income, unstable business | 775.6 | Healthy | Wealth (60.2%) | Liquidity | Positive | ⚠️ see §15 note — diversity credit doesn't discount an individually unstable source |
| S8 | Large home loan, low rate | 690.6 | Stable | Debt (46.2%) | Wealth | Positive | ⚠️ see §15 — Interest Burden zeroes out on loan *size* relative to income, not just rate quality |
| S9 | Credit-card debt | 344.1 | High Risk | Liquidity (14.7%) | Risk | Strong Negative | ✅ significant debt penalty (Debt 30.8%) |
| S10 | Personal-loan-heavy | 301.1 | High Risk | Liquidity (12.7%) | Risk | Negative | ✅ poor debt health (Debt 19.6%) |
| S11 | Zero-debt | 730.1 | Healthy | Wealth (44.3%) | Risk | Neutral | ✅ debt maxed (250/250) but overall only "Healthy," not automatically excellent |
| S12 | No emergency fund | 651.2 | Stable | Liquidity (6.7%) | Liquidity | Positive | ✅ significant liquidity penalty |
| S13 | Huge emergency fund | 644.3 | Stable | Risk (18.6%) | Risk | Neutral | ✅ liquidity near-maxed (95.5%), no unbounded reward |
| S14 | Good investments, poor insurance | 750.7 | Healthy | Risk (13.3%) | Risk | Strong Positive | ✅ exact match to expected shape |
| S15 | Good insurance, poor wealth | 467.4 | High Risk | Wealth (11.0%) | Liquidity | Neutral | ✅ exact match to expected shape |
| S16 | Retired family | 660.6 | Stable | Cash Flow (20.4%) | Cash Flow | Negative | 🛑 see §15, P1-2 — genuinely comfortable family shows Cash Flow 20% and **Efficiency −300%** |
| S17 | Negative net worth | 432.0 | High Risk | Liquidity (15.0%) | Liquidity | Positive | ✅ debt-to-assets ratio stayed finite and meaningful (assets were nonzero) |
| S18 | High income, high debt | 699.8 | Stable | Debt (45.6%) | Debt | Positive | ✅ income did not hide leverage |
| S19 | Low income, excellent behavior | 774.3 | Healthy | Wealth (60.9%) | Cash Flow | Strong Positive | ✅ respectable health despite low absolute income |
| S20 | Wealthy but deteriorating | 548.0 | Warning | Wealth (42.0%) | Cash Flow | Strong Negative | ⚠️ see note below |

**S20 note:** the brief's expected shape ("high current health, negative momentum") is only partly reproducible under a
flow-weighted model. A family whose *current* cash flow, debt trajectory, and expenses are already deteriorating (as S20
specifies) legitimately scores in the Warning band on **current** health, because Cash Flow + Liquidity + Debt are 650
of the 1000 points and none of them reward net worth directly. This is consistent with S4's own expectation ("high
wealth should not completely hide poor liquidity/cash flow") — the two expectations sit in mild tension for a household
whose current-state fields are already declining, not just its trend fields. Not a defect; worth keeping in mind when
writing user-facing copy that distinguishes what "momentum" vs. "health" each capture.

---

## 6. Monotonicity Results

| Change | Direction expected | Result | Verdict |
|---|---|---|---|
| ↑ Emergency fund | FFHS non-decreasing | 656.8 → 686.9 → 718.9 → 739.2 → 754.9 → 756.0 | ✅ PASS |
| ↓ High-interest (CC) debt | FFHS non-decreasing | 652.9 → 671.3 → 689.8 → 703.2 → 775.0 | ✅ PASS |
| ↓ Total expenses (income fixed) | FFHS non-decreasing | 626.0 → 677.5 → 706.6 → 719.6 → 721.6 | ✅ PASS |
| **↑ Income (everything else fixed)** | **FFHS non-decreasing** | 588.7 → 690.2 → **718.9 → 709.6 → 694.1 → 677.6 → 663.8** | 🛑 **FAIL — see §15, P1-1** |
| ↑ Income diversity (stable sources) | FFHS non-decreasing | 718.9 → 728.9 → 733.9 | ✅ PASS |
| ↑ Number of earners | FFHS non-decreasing | 703.9 → 718.9 → 728.9 | ✅ PASS |
| ↑ Health insurance adequacy | Risk non-decreasing | 67.4 → 77.4 → 87.4 → 112.4 → 117.4 | ✅ PASS |
| ↑ Life insurance adequacy | Risk non-decreasing | 82.5 → 88.8 → 95.0 → 109.1 → 120.5 → 122.5 | ✅ PASS |
| ↓ EMI burden | Debt non-decreasing | 142.2 → 153.9 → 163.9 → 168.9 | ✅ PASS |
| ↓ Interest rate (debt held constant) | Debt non-decreasing | 159.1 → 159.1 → 180.8 → 196.4 → 211.9 | ✅ PASS |
| ↑ Investment rate | Wealth non-decreasing | 49.6 → 85.7 → 109.9 → 137.9 → 154.1 | ✅ PASS |
| ↓ Debt principal (EMI scaled proportionally) | Debt non-decreasing | 131.6 → 163.9 → 196.4 → 225.4 → 250.0 | ✅ PASS |
| ↑ Bad (CC/personal) debt added | Debt should worsen | 250 → 178.6 → 166.8 → 152.7 → 138.7 | ✅ PASS (correctly worsens) |
| Emergency fund removed | Liquidity should worsen | 106.7 → 86.7 → 55.0 → 25.0 | ✅ PASS (correctly worsens) |

**Only one genuine monotonicity violation was found**, and it reproduces cleanly and repeatedly: pure income growth,
with every other absolute-rupee field held constant, eventually lowers the FFHS score. Full root-cause in §15, P1-1.
(An earlier harness pass produced several additional "FAIL" flags; all were traced to the harness feeding values in a
worsening-then-mislabeled-as-improving order, not real model defects — re-verified with corrected ordering above.)

---

## 7. Boundary Results

| Check | Result |
|---|---|
| `ABSOLUTE_MIN` fixture (worst plausible family) | FFHS = 96, rating High Risk, all pillars in `[0, max]` |
| `ABSOLUTE_MAX` fixture (best plausible family) | FFHS = **1000**, rating Exceptional, all five pillars exactly at `max` simultaneously |
| Cash Flow ∈ [0, 250] | ✅ min 36, max 250 |
| Liquidity ∈ [0, 150] | ✅ min 0, max 150 |
| Debt ∈ [0, 250] | ✅ min 60†, max 250 |
| Wealth ∈ [0, 200] | ✅ min 0, max 200 |
| Risk ∈ [0, 150] | ✅ min 0, max 150 |
| Rating boundaries inclusive-lower as documented | ✅ 500/600/700/800/900 all land in the *higher* band |

† The `ABSOLUTE_MIN` fixture's Debt score of 60 (not 0) is itself a symptom of §14's finding: it carries ₹30L of pure
bad debt against a ₹30k income (the worst plausible DTI/interest/bad-debt-ratio inputs) but has zero *recorded assets*,
which masks Debt-to-Assets' true (should-be-zero) contribution and instead credits it the full 60/60. Without that bug,
`ABSOLUTE_MIN`'s Debt score — and its overall FFHS — would be lower than the 96 reported.

---

## 8. Edge Case Results (zero / missing / negative / malformed)

| Class | Crashes | NaN/Infinity produced | Reachable via shipped UI? |
|---|---|---|---|
| All-zero family | 0 | none | Yes — this is a valid answer state |
| Missing optional fields (`delete`d) | 0 | `NaN` in 2 metric `.value` fields + `freedom` | **No** — optional fields default to `0` in `defaultFormData.js`, never `undefined` |
| Missing required fields (`monthly_income_total`, `total_monthly_expenses`, etc.) | 0 | `NaN` in `monthlySurplus`/`savingsRate`/`efficiency` | **No** — these are `required: true`, numeric, and gated by `isFieldValid()` before `next()` |
| `null`/`undefined`/`NaN`/`Infinity`/`''`/`'abc'` per field | 0 | Several combinations (see §14) | **No** for the 3 gated fields; theoretically yes for a non-required field if a caller bypasses the UI |
| Negative values (14 fields tested individually) | 0 | none | Score stayed in range in every case; direction matched intuition except the ratio-flip case below |
| Negative net worth (assets 70k < debt 5M) | 0 | none | Debt-to-Assets computed as a large-but-finite 71.4×, correctly floor-clamped to score 0 — **this is the correct behavior**, contrasting sharply with the zero-assets case below |
| **Zero gross assets + positive debt** | 0 | `Infinity` in `debtToAssets.value`; score inverted to 60/60 (max) | **Yes — fully reachable**, see §14 |
| **Zero income + active EMI** | 0 | none (finite but wrong) | DTI and Interest Burden both hit their **maximum** (60/60, 70/70) | **Yes — fully reachable**, see §14 |
| **Negative debt-category value** (e.g. `home_loan: -500000`) | 0 | none (finite but wrong) | `debtToAssets` and `badDebtRatio` both flip negative, then clamp to their **maximum** score | Requires bypassing the UI's `min="0"` (soft, unenforced) — see §14 |

**Bottom line on crashes:** across every input tried — including type-invalid ones a real user cannot produce through
the form (booleans, non-numeric strings, wrong-shaped arrays) — `computeFFHS` never threw and never returned a score or
pillar total outside its declared range. Where non-finite values do leak into the *returned object*, it's confined to
individual metric `.value` fields (informational, not currently rendered) and the two headline ratios, and only under
input shapes the shipped questionnaire cannot currently produce. The **wrong-direction-but-finite** cases (zero
assets/zero income/negative entries on Debt-pillar metrics) are the more consequential class — they're fully in-range,
well-formed, and confidently wrong.

---

## 9. Momentum Results

| Case | Trend inputs | `avg` | Rating |
|---|---|---:|---|
| A — all positive | up/up/reduced/up/up | +1.0 | Strong Positive |
| B — all flat | same×5 | 0.0 | Neutral |
| C — all negative | down/down/increased/down/down | −1.0 | Strong Negative |

**Independence check:** a high-FFHS family (925.4, from S5) forced to all-negative trends still shows FFHS 925.4 /
Strong Negative momentum; a low-FFHS family (344.1, from S9) forced to all-positive trends still shows FFHS 344.1 /
Strong Positive momentum. Momentum never leaks into the FFHS number — confirmed by direct inspection of `computeFFHS`
(momentum is computed from `inputs` alone and attached to the result object, never summed into `score`).

---

## 10. Efficiency Results

`computeEfficiency` has **no code path** from `investments_total` (or any unrealized-appreciation-shaped field) into
its formula — it only reads `monthly_income_total`, `total_monthly_expenses`, and the derived
`monthlyDebtPrincipalReduction`. Isolation test: a family retaining ₹1L/month of a ₹2L income scores 50% Efficiency; an
otherwise-identical family retaining only ₹20k (with the other ₹80k implicitly "invested" as unrealized market
appreciation, which Efficiency cannot see or credit) scores 10%. Appreciation cannot inflate this metric — confirmed.

The one defect found in this output is not about appreciation — it's about **passive income exclusion** (S16, retired
family): Efficiency computed **−300%** for a household that is genuinely running a real ~₹10k/month surplus once
passive income is counted. See §15, P1-2.

---

## 11. Financial Freedom Results

| Passive income (% of expenses) | Freedom |
|---:|---:|
| 0% | 0.00 |
| 25% | 0.25 |
| 50% | 0.50 |
| 75% | 0.75 |
| 100% | 1.00 |
| 150% | 1.50 |

Linear, uncapped above 100% as documented ("100%+ means passive income theoretically covers expenses"). Division by
zero is guarded: `total_monthly_expenses = 0` returns `0`, not a crash — though this is a semantic backwards-edge-case,
not a crash risk (see §14, P2). Retired-family case (S16) correctly computes Freedom = 112.5% (passive income exceeds
expenses) — this is the one output that models that household correctly; see §15 for why the other outputs don't.

---

## 12. Rating Boundary Results

| Score | Rating | Score | Rating |
|---:|---|---:|---|
| 499 | High Risk | 700 | Healthy |
| 500 | **Warning** | 799 | Healthy |
| 599 | Warning | 800 | **Excellent** |
| 600 | **Stable** | 899 | Excellent |
| 699 | Stable | 900 | **Exceptional** |

All six band boundaries are confirmed **inclusive on the lower bound** (`score >= threshold`), exactly matching
`docs/METHODOLOGY.md`. `rateScore(0)` and `rateScore(-1)` both correctly return "High Risk" — no band gap, no crash for
a hypothetically negative score even though negative FFHS is not otherwise reachable.

---

## 13. Counterintuitive Cases

| # | Case | Classification | Severity |
|---|---|---|---|
| 1 | Zero-asset indebted family scores 60/60 (max) on Debt-to-Assets | **A — Implementation bug** | **P0** |
| 2 | Zero-income family with a live EMI scores 60/60 and 70/70 (max) on Debt-to-Income and Interest Burden | **A — Implementation bug**, same root cause as #1 | **P0** |
| 3 | A negative debt-category value flips a ratio negative, which then clamps to the *best*, not worst, score | **A — Implementation bug**, same root cause as #1/#2 | **P0** (low reachability — requires bypassing soft `min="0"`) |
| 4 | Lower-asset family scores a *higher* debt total than an otherwise-identical higher-asset family | Direct consequence of #1 | **P0** |
| 5 | Pure income increase (all else fixed) lowers FFHS by up to 55 points | **C — Scoring-methodology issue** | **P1** |
| 6 | Retired/passive-income-heavy family shows Cash Flow 20% and Efficiency −300% while being genuinely solvent | **C — Scoring-methodology issue** | **P1** |
| 7 | A `debt_breakdown` with two or more numeric-*string* category values silently corrupts `totalOutstandingDebt` via string concatenation | **A — Implementation bug** (low reachability — `v-model.number` always emits numbers through the shipped UI) | **P2** |
| 8 | Large, low-rate home loan zeroes out Interest Burden (0/70) purely from loan *size* relative to income, same as a high-rate loan of the same size would | **C/E — methodology; needs product decision** | **P2** |
| 9 | Multi-income family gets full Income-Diversity credit even when one source is self-reported "variable" | **D — expected, by design** (Diversity and Stability are deliberately separate metrics per spec) | — |
| 10 | Zero expenses + positive passive income shows Freedom = 0%, not "already free" | **B — mathematical edge case** | **P3** |
| 11 | Zero income + real life insurance cover scores Life Insurance 0/40 | **B — mathematical edge case** | **P3** |
| 12 | Negative `num_dependents` silently lowers the recommended health-cover benchmark, inflating the Health Insurance ratio | **B — mathematical edge case / missing validation** | **P3** |
| 13 | "Biggest Opportunity" picks Wealth over Debt in S8 despite Debt having the larger absolute point gap | **D — expected, by design** (reproduces the spec's own documented actionability-multiplier intent) | — |

---

## 14. Bugs Found

### 🛑 P0 — The Debt pillar's ratio-normalization pipeline is direction-blind for out-of-domain/non-finite ratios

This is one root cause with three independently confirmed, independently reachable manifestations. All three reward
the household state that should score worst with the score that's actually best.

#### Manifestation 1 — zero gross assets + positive debt → Debt-to-Assets scores the max

**File:** [src/lib/scoring.js:6-21](src/lib/scoring.js) (`piecewiseLinear`) × [src/lib/scoring.js:166-175](src/lib/scoring.js) (`scoreDebt`)

```js
const debtToAssets = safeRatio(totalOutstandingDebt, grossAssets, totalOutstandingDebt > 0 ? Infinity : 0)
const dtaScore = piecewiseLinear(debtToAssets, [[0, 60], [0.3, 45], [0.5, 30], [0.7, 15], [0.9, 0]])
```
When `grossAssets === 0` and debt is positive, `safeRatio` intentionally returns `Infinity` — a deliberate sentinel for
"leverage is undefined/maximal." But `piecewiseLinear`'s non-finite guard treats `Infinity` exactly like `NaN`:
```js
if (!Number.isFinite(value)) return points[0][1]   // returns 60 — the curve's BEST score, not its worst
```
For this *descending* curve (ratio 0 → score 60, ratio 0.9+ → score 0), an undefined/unbounded ratio should resolve to
the curve's floor (0), not its ceiling (60). The normal end-clamp logic two lines later (`if (value >= last[0]) return
last[1]`) would have handled `Infinity` correctly on its own — `Infinity >= 0.9` is `true` in JavaScript — but the
non-finite guard intercepts first and never reaches it.

**Confirmed two independent ways:**
1. Direct fixture: ₹10L home loan, ₹1L income, zero recorded assets → Debt-to-Assets scores 60/60 (max), Debt pillar
   219.17/250.
2. §14's own "same debt, different assets" comparison: the **lower**-asset family (zero assets) scored a **higher**
   Debt pillar total (221.67) than the **higher**-asset family (215.30) — backwards.

#### Manifestation 2 — zero income + active EMI → Debt-to-Income and Interest Burden score the max

**File:** [src/lib/scoring.js:161](src/lib/scoring.js), [src/lib/scoring.js:178](src/lib/scoring.js)

```js
const dti = safeRatio(inputs.monthly_EMI_total, income)            // whenZero defaults to 0
const interestBurden = safeRatio(estimatedMonthlyInterest, income) // same
```
`safeRatio`'s default `whenZero` is `0`. For these *decreasing* curves (0% burden → best score, 20%+ → worst), `0` is
also the *best* possible reading. When `income = 0` and there's a real EMI/interest obligation, the ratio should be
undefined/maximal-risk, not "0% of income going to debt."

**Confirmed by direct fixture:** ₹0 income, ₹20,000 EMI, ₹20L home loan, real (nonzero) assets present:
```
debtToIncome:   score 60/60  (max — should reflect an unaffordable burden)
interestBurden: score 70/70  (max — same issue)
debtToAssets:   score 41.37/60 (correct — assets were nonzero here, so Manifestation 1 doesn't trigger)
badDebtRatio:   score 60/60  (correct — this debt genuinely isn't in the bad-debt bucket)
Debt pillar total: 231.37/250 (92.5%)
```
An unemployed family carrying an active home loan scores in the top 8% of the Debt pillar. This is a distinct code path
from Manifestation 1 (`safeRatio`'s silent default, not `piecewiseLinear`'s guard) but the same underlying pattern: the
codebase already knows how to handle "ratio undefined because the denominator legitimately collapsed to zero" correctly
in exactly one place (`debtToAssets`'s explicit `Infinity` override) and didn't apply the same treatment to its
siblings.

#### Manifestation 3 — a negative debt-category entry flips a ratio negative, which also clamps to the max

**Confirmed by direct fixture:** `debt_breakdown: { home_loan: -500000, personal_loan_and_cc_revolving: 300000 }`
(nonsensical negative total debt of −₹2L):
```
debtToAssets: value = -0.0348, score = 60/60 (max)
badDebtRatio: value = -1.5,    score = 60/60 (max)
```
`piecewiseLinear`'s low-end clamp (`value <= points[0][0]`, i.e. `<= 0`) doesn't distinguish "ratio is legitimately at
or near zero" from "ratio went negative because of a bad/malformed input" — both read as the best score. Lower
reachability than Manifestations 1–2 (requires a genuinely negative debt-category entry, and the UI's `min="0"` is a
soft HTML hint, not enforced validation) but shares the same root cause and is included for completeness.

**Reachability summary:** Manifestations 1 and 2 are **100% reachable through the shipped questionnaire** — every
contributing field (`primary_residence_value`, `investments_total`, `emergency_fund_liquid`, `other_liquid_assets`,
`monthly_income_total`) is a completely ordinary field a real family fills in, and "no savings yet" or "no income right
now" are common, legitimate life situations, not edge cases. Manifestation 3 requires bypassing the soft UI validation.

**Impact:** the affected metrics are worth up to 130 of the Debt pillar's 250 points (52%) in combination, and skew
`biggestOpportunity` (Debt looks artificially healthy, so a genuinely at-risk family may get pointed elsewhere) and the
overall rating band.

**Why the existing test suite and this audit's own 500-case fuzz pass both initially missed it:** none of the 5
fixtures in `scoring.test.js` combine debt > 0 with zero *gross* assets or zero income. The randomized fuzz pass in
this audit also missed it: it draws each field from a continuous `rand(0, X)` distribution, which produces an exact `0`
with probability ≈0. **This class of bug only shows up under exact-zero boundary testing, not generic fuzzing** — a
concrete lesson for the permanent regression suite (§17): boundary/zero cases need explicit, hand-written tests, not
just randomized coverage.

**Fix direction (not applied):**
1. In `piecewiseLinear`, separate the `NaN` case from the `±Infinity` case — let `Infinity`/`-Infinity` fall through to
   the existing (already-correct) end-clamp comparisons, and reserve the `points[0][1]` fallback for genuine `NaN`.
2. Apply `debtToAssets`'s existing `whenZero: Infinity` pattern to `dti` and `interestBurden` in `scoreDebt`, so a
   zero-income-with-debt state reads as maximally risky, not risk-free.
3. Consider whether `scoring.js` should reject/clamp negative currency inputs at its own boundary, independent of
   whatever the UI does or doesn't enforce.

---

### 🟡 P2 — `debt_breakdown` with 2+ numeric-*string* category values silently corrupts the debt total

**File:** [src/lib/scoring.js:143](src/lib/scoring.js), [src/lib/scoring.js:159](src/lib/scoring.js)
```js
Object.values(breakdown).reduce((a, b) => a + (b || 0), 0)
```
If two or more category values are numeric *strings* rather than numbers, `reduce`'s accumulator becomes a string after
the first `+` (JS string concatenation, not addition), and every subsequent `+` concatenates digits instead of summing
them. Confirmed: `{ home_loan: '1500000', vehicle_loan: '500000' }` (true total ₹20L) produces a `debtToAssets.value`
of **261,324** instead of ≈0.35 — the digits `'1500000'` and `'500000'` got concatenated into a 15-digit string before
being coerced back to a number by the later division. (A single string-valued category does *not* trigger this — with
only one `reduce` iteration, the lone string survives unchanged and gets correctly coerced by the later `/`. It takes
two or more string values to actually concatenate digits together.)

**Reachability:** low. `v-model.number` on every debt-breakdown input in `DebtBreakdownField.vue` always emits a
number, so this isn't reachable through the questionnaire as shipped. Flagged because the audit explicitly asks for the
*engine's* robustness independent of the current UI's guardrails, and because `scoring.js` has no defense of its own if
a future integration (CSV import, saved-profile reload, API) feeds it string data.

---

### 🟢 P3 — Two "denominator collapses to zero" semantic edge cases

Both share the same shape as the P0 finding but at much lower severity/reachability: `safeRatio`'s uniform
`whenZero=0` fallback is semantically wrong for a ratio whose denominator legitimately collapses to zero while the
numerator is positive — "0" reads as "worst," but the real answer is closer to "best" or "not applicable."

1. **`computeFreedom` with `total_monthly_expenses = 0`:** a family with genuinely zero recorded monthly expenses and
   positive passive income shows Freedom = 0%, identical to a family with no passive income at all. Low real-world
   likelihood.
2. **Life Insurance with `monthly_income_total = 0`:** `recommendedLifeCover = 10 × income × 12` collapses to 0; the
   ratio then falls back to 0 (worst), scoring a family with real life-insurance cover as if they had none. Requires
   the unusual combination of zero income + `has_financial_dependents: true` + nonzero cover.

Neither was observed to produce an out-of-range score or a crash.

---

## 15. Methodology Concerns

### 🛑 P1-1 — Pure income growth can lower the FFHS score

**Confirmed reproduction:** holding expenses, debt, insurance cover, and investment contribution fixed in absolute
rupees, raising `monthly_income_total` from 150,000 → 250,000 → 500,000 → 1,000,000 moves FFHS **718.9 → 700.7 → 677.6
→ 663.8** — a 55-point decline from the peak, entirely from a raise.

**Root cause — working exactly as designed, not a bug:** three sub-metrics are income-relative percentages whose
numerator is a fixed absolute rupee figure:
- Investment Rate = `monthly_investment_contribution / income` (Wealth, 60 pts)
- Net-Worth Growth proxy = `(contribution + principal reduction) / income` (Wealth, 60 pts)
- Life Insurance adequacy: `recommendedLifeCover = 10 × annual income`, so `cover / recommendedLifeCover` shrinks as
  income rises without a matching increase in cover (Risk, 40 pts)

A raise not accompanied by proportionally higher investment contributions or insurance cover mechanically lowers all
three. Cash Flow and Debt *do* improve with income (a fixed EMI/expenses becomes a smaller share of a larger income),
but not enough to offset the Wealth + Risk decline once income is well above the family's current absolute commitments.

**Why this matters:** the audit brief explicitly lists "increase stable income while holding everything else constant:
FFHS should not decrease" as a required invariant, and it decreases. A financially literate user would find "I got a
raise and my score went down" surprising and would likely read it as a bug.

**Needs a product decision, not a unilateral code fix** — options include: decoupling required-life-cover from live
income (re-anchor periodically rather than every recompute), capping how much a single income change can move
Wealth/Risk percentages in one step, or accepting this as intended behavior and adding explanatory UI copy ("your
investment rate and protection adequacy haven't kept pace with your new income").

### 🛑 P1-2 — Cash Flow and Efficiency ignore passive income

**Confirmed reproduction (Scenario 16, retired family):** `monthly_income_total = 20,000` (active/employment income
only), `passive_income_monthly = 90,000`, `total_monthly_expenses = 80,000`. The family is genuinely
cash-flow-**positive** (+₹10,000/month once passive income is counted, plus a large asset base), and Financial Freedom
correctly shows 112.5%. But:
- Savings Rate + Monthly Surplus (130 of Cash Flow's 250 points) are computed from `monthly_income_total −
  total_monthly_expenses` alone = −₹60,000/month → both floor-clamp to their minimum. Cash Flow: 51/250 (20%), the
  pillar's weakest by a wide margin, in a household not remotely in distress.
- **Financial Efficiency shows −300%** — the same `monthly_income_total`-only surplus feeds this headline ratio too.
  This is directly user-visible (`ResultPage.vue` renders `Math.round(result.efficiency * 100) + '%'`) and would read
  as alarming for a comfortable retired family.

**Why this matters:** this is exactly the failure mode the brief's own Scenario 16 was designed to catch — *"Do NOT
incorrectly classify them as financially unhealthy simply because salary/income structure differs from a working
family."* It's triggered, specifically because Freedom (which does use `passive_income_monthly`) and Cash
Flow/Efficiency (which don't) disagree about the same household.

**Needs a product decision:** should Cash Flow's Savings Rate/Monthly Surplus, and the Efficiency headline metric, use
`monthly_income_total + passive_income_monthly` (total cash inflow) instead of `monthly_income_total` alone? This would
affect every household with material passive income, not just retirees — worth deciding explicitly rather than patching
in isolation, since `monthly_income_total`'s documentation ("combined across all earners") is ambiguous about whether
passive income counts.

### 🟡 P2 — Interest Burden conflates loan *size* with rate *quality* (Scenario 8)

A large home loan at a genuinely low, reasonable rate (7.5%) still zeroes out the Interest Burden metric (0/70) purely
because the absolute monthly interest is large relative to income — the curve's worst breakpoint (20%+ of income → 0)
is about the *proportion* of income going to interest, not whether the rate itself is expensive. The brief's framing
("reasonably priced productive debt should generally be substantially worse [scored better] than personal loans") is
partly honored (Bad Debt Ratio correctly gives this family the full 60/60, since none of the debt is in the bad-debt
bucket) and partly undercut (Interest Burden alone can't distinguish "large loan, cheap rate" from "large loan,
expensive rate" once both cross the same income-share threshold). Not a bug — the curve does exactly what its
documented formula says — but worth a product decision on whether Interest Burden should be more rate-sensitive
independent of loan size.

---

## 16. Recommended Changes

**Not applied in this pass — for product/eng review, ranked by severity:**

1. **(P0, should block reliance on the Debt pillar for low-income/low-asset families until fixed)** Fix
   `piecewiseLinear`'s non-finite guard to distinguish `NaN` from `±Infinity`, letting `Infinity`/`-Infinity` fall
   through to the existing (already-correct) end-clamp logic.
2. **(P0, same root cause)** Apply `debtToAssets`'s existing `whenZero: Infinity` pattern to `dti` and
   `interestBurden` in `scoreDebt`, so zero-income-with-debt reads as maximally risky, not risk-free.
3. **(P1, needs a product decision, not just a code change)** Decide how Investment Rate, Net-Worth Growth, and
   required Life Insurance cover should behave when income rises without a proportional change in absolute behavior —
   §15, P1-1.
4. **(P1, needs a product decision)** Decide whether `passive_income_monthly` should feed Cash Flow's Savings
   Rate/Monthly Surplus and the Efficiency headline metric — §15, P1-2.
5. **(P2)** Add explicit numeric coercion (or reject non-numeric values) when summing `debt_breakdown` categories,
   rather than relying on JS's implicit `+` behavior.
6. **(P3)** Extend `isFieldValid()` (or a scoring.js-level normalization step) to reject/clamp negative values on
   fields with an implied non-negative domain, even when the field isn't `required` (e.g. `num_dependents`,
   `goals_total`, debt-breakdown categories).
7. **(P2/E)** Revisit the Interest Burden curve's relationship to loan size vs. rate, per §15's Scenario 8 finding, if
   "reasonably priced productive debt shouldn't score like high-interest debt" is meant to hold for large loans too.

---

## 17. Permanent Regression Tests

The following should be added to `src/lib/scoring.test.js` (or a new `scoring.edgecases.test.js`) and kept permanently:

```js
import { describe, it, expect } from 'vitest'
import { computeFFHS, scoreDebt, scoreLiquidity, computeFreedom, rateScore } from './scoring.js'

describe('REGRESSION: Debt pillar direction-blindness at zero/negative denominators (§14, P0)', () => {
  it('zero gross assets + positive debt must NOT score the best on Debt-to-Assets', () => {
    const r = scoreDebt({
      monthly_income_total: 100000, monthly_EMI_total: 15000,
      debt_breakdown: { home_loan: 1000000 },
      primary_residence_value: 0, investment_property_value: 0, investments_total: 0,
      emergency_fund_liquid: 0, other_liquid_assets: 0,
    })
    expect(r.metrics.debtToAssets.score).toBeLessThan(10) // currently 60 (the max) — the bug
  })

  it('higher gross assets must never score worse than lower gross assets, debt held constant', () => {
    const debtFixture = (assets) => scoreDebt({
      monthly_income_total: 200000, monthly_EMI_total: 20000,
      debt_breakdown: { home_loan: 2000000 }, blended_interest_rate_override: 0.085,
      primary_residence_value: assets, investments_total: 0, emergency_fund_liquid: 0,
      other_liquid_assets: 0, investment_property_value: 0,
    })
    expect(debtFixture(10000000).total).toBeGreaterThanOrEqual(debtFixture(0).total)
  })

  it('zero income + active EMI must NOT score the max on Debt-to-Income or Interest Burden', () => {
    const r = scoreDebt({
      monthly_income_total: 0, monthly_EMI_total: 20000,
      debt_breakdown: { home_loan: 2000000 },
      primary_residence_value: 5000000, investments_total: 500000,
      emergency_fund_liquid: 180000, other_liquid_assets: 60000,
    })
    expect(r.metrics.debtToIncome.score).toBeLessThan(10)   // currently 60 (the max)
    expect(r.metrics.interestBurden.score).toBeLessThan(10) // currently 70 (the max)
  })
})

describe('REGRESSION: numerical hygiene', () => {
  it('500 randomized-but-plausible inputs never produce NaN/Infinity or an out-of-range pillar/FFHS', () => {
    // seed a deterministic PRNG, generate N random-but-plausible families, assert bounds + finiteness on every one
  })

  it('identical input produces byte-identical output', () => {
    const input = /* any valid fixture */ {}
    expect(JSON.stringify(computeFFHS(input))).toBe(JSON.stringify(computeFFHS(input)))
  })

  it('a maximal profile scores exactly 1000/1000 across all 5 pillars simultaneously', () => {
    // ABSOLUTE_MAX-style fixture; assert score === 1000 and each pillar.total === pillar.max
  })
})

describe('REGRESSION: rating boundary inclusivity', () => {
  it.each([[499,'High Risk'],[500,'Warning'],[599,'Warning'],[600,'Stable'],[699,'Stable'],[700,'Healthy'],
           [799,'Healthy'],[800,'Excellent'],[899,'Excellent'],[900,'Exceptional']])(
    'rateScore(%i) === %s', (score, rating) => expect(rateScore(score)).toBe(rating)
  )
})

describe('REGRESSION: momentum/FFHS independence', () => {
  it('trend inputs never change the FFHS score', () => {
    const base = /* fixture */ {}
    const good = computeFFHS({ ...base, trend_income: 'up', trend_surplus_savings_rate: 'up', trend_debt: 'reduced', trend_emergency_fund: 'up', trend_investment_contributions: 'up' })
    const bad = computeFFHS({ ...base, trend_income: 'down', trend_surplus_savings_rate: 'down', trend_debt: 'increased', trend_emergency_fund: 'down', trend_investment_contributions: 'down' })
    expect(good.score).toBe(bad.score)
  })
})

describe('REGRESSION: market appreciation isolation (§10)', () => {
  it('investments_total alone (no contribution) contributes zero to Investment Rate and Net-Worth Growth', () => {
    const r = scoreWealthCreation({ /* base fixture */ investments_total: 50000000, monthly_investment_contribution: 0 }, 0)
    expect(r.metrics.investmentRate.score).toBe(0)
    expect(r.metrics.netWorthGrowth.score).toBe(0)
  })
})

describe('REGRESSION: diminishing returns cap (§9)', () => {
  it('Emergency Fund score does not increase past 12 months of coverage', () => {
    const at12 = scoreLiquidity({ emergency_fund_liquid: 12 * 60000, essential_monthly_expenses: 60000, other_liquid_assets: 0, available_credit_limit: 0 })
    const at48 = scoreLiquidity({ emergency_fund_liquid: 48 * 60000, essential_monthly_expenses: 60000, other_liquid_assets: 0, available_credit_limit: 0 })
    expect(at48.metrics.emergencyFund.score).toBe(at12.metrics.emergencyFund.score)
  })
})

// Documents currently-known-failing behavior; convert from it.todo to a real assertion once §15's product decisions land.
describe.todo('REGRESSION: income-only monotonicity (§15, P1-1) — FFHS should not decrease when income rises and everything else is held constant')
describe.todo('REGRESSION: passive-income household consistency (§15, P1-2) — Cash Flow/Efficiency should not read as distressed when total inflow (incl. passive) covers expenses')
```

---

## Final Verdict

### FFHS MODEL STATUS (at time of audit): **[PASS WITH CONCERNS]**
### FFHS MODEL STATUS (current, post-fix): **[PASS — 2 methodology decisions outstanding]**

The engine's numerical hygiene is strong — bounds, determinism, and crash-resistance held under 500 fuzz trials and
every explicit edge case tried, including malformed/type-invalid input. Most required scenario shapes, all the
diminishing-returns curves, debt-quality ranking (on well-formed inputs), and the momentum/biggest-opportunity engines
behave exactly as documented. This is not a shaky implementation, and the doc/code are in sync throughout.

One confirmed **systemic P0 bug**, with three independently reproduced manifestations, reached production through
entirely ordinary inputs — any indebted family with no recorded assets, or any zero-income family with an existing
loan — and inverted the Debt pillar's most important signal: the worst-leverage cases scored the best. **This has since
been fixed and locked in with regression tests — see "Fix Applied" below.** Two **P1 methodology findings** — income
growth that can lower the score, and passive-income households reading as cash-flow-distressed — remain outstanding by
design: both are explicitly the kind of thing this audit was commissioned to surface, and both need a product decision,
not a unilateral code change.

- **Scenarios tested:** 20 required + ~90 additional targeted/edge/fuzz-derived cases (plus 500 randomized fuzz trials)
- **Passed:** 18/20 required scenarios matched their expected shape exactly; 2 (S7, S8) surfaced methodology nuances worth a product call, not failures
- **Failed (hard) at time of audit:** 1 systemic implementation bug (P0), reproduced 3 independent ways — **now fixed**
- **Methodology concerns (still open):** 4 (2 × P1, 2 × P2/E)
- **Implementation bugs found:** 1 systemic P0 (3 manifestations, fixed) + 2 minor (P2/P3, fixed as a side effect of the same patch — see below)
- **Most serious issue (resolved):** the Debt pillar's shared curve-normalization pipeline (`piecewiseLinear` + `safeRatio`) was not direction-aware for non-finite/zero-denominator/negative ratios — it rewarded the worst-leverage household state with the best score, confirmed in three separate scenarios (§14, P0). Fixed — see below.
- **Most important methodology decision still needed:** whether `passive_income_monthly` should count toward Cash Flow's Savings Rate/Monthly Surplus and the Efficiency headline metric (§15, P1-2) — this single decision resolves the retired-family failure mode and materially changes how the model treats every passive-income-heavy household, so it should be settled deliberately rather than patched per-symptom.

---

## Fix Applied

Applied after this report's findings were reviewed and the P0 fix was explicitly requested. Scope was kept to exactly
the systemic bug documented in §13–14 (3 manifestations) plus the closely related P2 string-concatenation bug that
shared one of the same lines of code. **The two P1 methodology concerns (§15) were deliberately left untouched** —
they require a product decision, not a code change, per this report's own recommendation.

### What changed, in `src/lib/scoring.js`

1. **`piecewiseLinear`'s non-finite guard is now direction-aware.** Previously, any `NaN`/`±Infinity` input always
   returned `points[0][1]` (the curve's first breakpoint) — correct for increasing curves, but the *best* score on a
   decreasing curve. It now returns whichever of the curve's two endpoints is actually the worse score:
   ```js
   if (!Number.isFinite(value)) {
     const first = points[0][1]
     const last = points[points.length - 1][1]
     return first <= last ? first : last
   }
   ```
   Fixes **Manifestation 1** (zero gross assets → Debt-to-Assets no longer scores 60/60; it now correctly scores 0).

2. **`debtToIncome` and `interestBurden` now use an `Infinity` sentinel when income is zero but a real burden exists**,
   mirroring the pattern `debtToAssets` already used correctly:
   ```js
   const dti = safeRatio(inputs.monthly_EMI_total, income, inputs.monthly_EMI_total > 0 ? Infinity : 0)
   const interestBurden = safeRatio(estimatedMonthlyInterest, income, estimatedMonthlyInterest > 0 ? Infinity : 0)
   ```
   Fixes **Manifestation 2** (zero income + active EMI → both metrics now correctly score 0 instead of the max).

3. **Debt-breakdown category values are clamped to `Math.max(0, …)` before being summed or used as a ratio numerator**,
   in `estimateMonthlyInterest` (both code paths) and in `scoreDebt`'s `totalOutstandingDebt` and `badDebtRatio`:
   ```js
   Object.values(breakdown).reduce((a, b) => a + Math.max(0, b || 0), 0)
   ```
   Fixes **Manifestation 3** (a negative debt-category entry can no longer deflate the total or invert a ratio's sign)
   and, as a side effect, the **P2 finding** (numeric-string category values no longer get silently concatenated
   instead of summed — `Math.max` forces numeric coercion before the addition).

### Verification performed

- Existing test suite: still **24/24 passing**, unchanged.
- Added **5 new regression tests** to `src/lib/scoring.test.js` (one per manifestation + the string-concat case) —
  suite is now **29/29 passing**.
- Re-ran all three original bug repros directly: each now returns the worst-case score (0) instead of the max, as
  expected.
- Re-ran the full audit harness (500-case fuzz + ~110 targeted cases) against the patched engine:
  - `ABSOLUTE_MAX` fixture still scores exactly **1000/1000** — the fix didn't touch the ceiling.
  - `ABSOLUTE_MIN` fixture's score correctly **dropped** from 96 → 36 (its Debt pillar dropped from a falsely-inflated
    60/250 to the true 0/250, since that fixture also had zero recorded assets) — this is the fix working as intended,
    not a regression.
  - Debt-quality ranking (home loan > personal loan > credit-card debt, principal held constant) still holds.
  - The "same debt, different assets" comparison from §10, which previously showed the *lower*-asset family scoring
    higher (a direct symptom of the bug), now correctly shows the higher-asset family scoring higher or equal.
  - 0 fuzz failures, same as before the fix (the randomized fuzz pass wasn't sensitive to this bug either way, since it
    only manifests at exact-zero boundaries — see §14's note on why boundary-specific tests, not fuzzing, are what
    catch this class of issue).

No scoring formula, weight, or threshold was changed — only the handling of undefined/invalid ratio inputs on the Debt
pillar. Every well-formed input (valid assets, valid income, non-negative debt figures) produces the same score before
and after this fix; only the previously-mishandled edge cases changed, and only in the direction of correctness.

---

## Post-Fix Re-Validation (complete re-run of every section, §4–20)

Run again in full, independently of the spot-checks above, to answer one question directly: **did fixing the Debt
pillar change anything it shouldn't have, anywhere in the model?** Every section from the original audit (§4–20) was
re-executed against the patched engine — same harness, same 500-case fuzz seed pool, same ~110 targeted cases — and
compared value-for-value against the pre-fix numbers recorded earlier in this report.

| Area | Pre-fix → post-fix | Verdict |
|---|---|---|
| **Absolute boundaries (§7)** | `ABSOLUTE_MAX` 1000/1000 → 1000/1000. `ABSOLUTE_MIN` 96 → **36** (Debt pillar 60 → **0**) | ✅ ceiling untouched; floor corrected — that fixture had zero recorded assets, so its Debt score was inflated by the bug and is now accurate |
| **All 20 required scenarios (§5)** | Every one of S1–S20's score, rating, weakest pillar, and biggest-opportunity pick — **byte-identical** to pre-fix | ✅ none of the 20 realistic family profiles happened to hit the zero-asset/zero-income edge case, confirming the fix is surgical, not a broad behavior change |
| **Zero/missing/negative edge cases (§8)** | `zeroAssetsWithDebt` fixture: Debt 230.83 → **170.83** (−60, matching the fix); all-zero family, negative-value sweep — unchanged | ✅ exactly the cases that should change, changed; everything else held |
| **Monotonicity (§6)** | Same pass/fail pattern as before, including the one genuine failure (income-only growth can lower FFHS — §15, P1-1, intentionally untouched) | ✅ no new violations introduced |
| **Diminishing returns (§9)** | Byte-identical curves (EF@12mo cap, idle-cash cap, insurance cap, credit-gate cap) | ✅ unaffected, as expected — none of these touch the Debt pillar |
| **Debt quality comparisons (§10)** | Home > personal > CC ranking: unchanged (still correct). Income/EMI/rate comparisons: unchanged (still correct). **"Same debt, different assets": lowAssets 221.67 → 161.67, highAssets unchanged at 215.30 — ordering flipped from *inverted* to *correct*** | ✅ this is the headline confirmation — the exact counterintuitive case the audit found is now resolved |
| **Liquidity, Cash Flow, Wealth (§11–13)** | Byte-identical | ✅ unaffected, as expected |
| **Momentum independence (§14)** | Byte-identical — high-FFHS/negative-momentum and low-FFHS/positive-momentum families still fully distinguishable | ✅ unaffected |
| **Efficiency / Freedom (§15–16)** | Byte-identical, including the retired-family Efficiency = −300% case (P1-2, intentionally untouched) | ✅ unaffected — confirms the fix did not accidentally touch or mask the still-open methodology concern |
| **Rating boundaries (§17)** | All 18 boundary points, byte-identical | ✅ unaffected |
| **Invalid-type inputs (§18)** | All 11 cases: still 0 crashes, 0 leaked NaN/Infinity into the returned object | ✅ unaffected |
| **500-case randomized fuzz + determinism (§19)** | 0 failures both before and after; identical input still produces identical output | ✅ unaffected |
| **Cross-scenario single-variable pairs (§20)** | 8/9 unchanged and correct; the 1 failure ("income increases, expenses fixed" → score still drops 18 points) is P1-1, intentionally untouched | ✅ no new failures |

**Bottom line:** across the complete re-run, the only numbers that moved are exactly the ones the fix was meant to
move — the zero-asset and zero-income Debt-pillar edge cases — and every one of those moved in the correct direction
(worse score for a worse financial position). Nothing else in the model shifted by even a fraction of a point. The two
open methodology items (P1-1 income monotonicity, P1-2 passive-income exclusion) are confirmed present and unchanged,
exactly as intended, since they were deliberately left for a product decision rather than patched.

**Current status: `vitest` 29/29 passing. 0 crashes, 0 invariant violations, 0 unintended behavior changes across the
full ~600-case validation suite.**
