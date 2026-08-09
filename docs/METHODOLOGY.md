# FFHS Methodology Spec (v0.1 — draft, in progress)

Status: All 5 pillars, the 4 core outputs, and the biggest-opportunity engine
are drafted, agreed, implemented (`src/lib/scoring.js`), and validated against
7 synthetic family profiles (`src/lib/scoring.test.js`, 23 assertions, all
passing). Scores land in intuitive rating bands and the biggest-opportunity
engine reproduces the spec's own worked example.

This document is the single source of truth for scoring formulas, normalization
curves, weights, and edge cases. The scoring engine must be implemented directly
against this spec — no formulas should exist only in code.

---

## Architecture Decisions

### Statelessness vs. Momentum
V1 stores no data and has no accounts. Momentum ("Am I getting better?") is
therefore derived from **self-reported 12-month trend questions**, not computed
deltas against stored history:

- trend_income: up / same / down
- trend_surplus_savings_rate: up / same / down
- trend_debt: reduced / same / increased (reduced = positive)
- trend_emergency_fund: up / same / down
- trend_investment_contributions: up / same / down

Each answer maps to a signed score; the average/weighted signal produces the
qualitative rating (Strong Positive → Strong Negative). Exact weighting TBD in
the "four core outputs" pass.

---

## Inputs

### Household
- `num_adults_earning` (int)
- `num_dependents` (int — children, elderly parents, etc.)

### Income
- `monthly_income_total` (₹, net/take-home, combined across all earners)
- `num_income_earners` (int)
- `income_sources` (multiselect: salary, business, rental, freelance/gig, other recurring)
- `primary_earner_employment_type` (govt/PSU, private-salaried-permanent, private-salaried-contract, self-employed/business, freelance/gig)
- `income_volatility_selfreport` (very stable, mostly stable, variable, highly variable)

### Expenses
- `essential_monthly_expenses` (₹ — housing, food, utilities, transport, insurance premiums, school fees, minimum debt payments)
- `total_monthly_expenses` (₹ — essential + discretionary; must be ≥ essential)

### Liquidity
- `emergency_fund_liquid` (₹ — cash, savings account, instant-access funds, ~7-day redemption)
- `other_liquid_assets` (₹ — ~30-day redemption, minor/no penalty, excludes emergency fund)
- `available_credit_limit` (₹ — unused credit card limit + pre-approved OD/loan facility)

### Debt
- `monthly_EMI_total` (₹)
- Breakdown by category (₹ each): `home_loan`, `vehicle_loan`, `education_loan`,
  `personal_loan_and_cc_revolving` (bad-debt bucket), `other_secured_debt`
- `total_outstanding_debt` is **derived** as the sum of the breakdown, not
  collected separately — one number to enter per category, and it can't drift
  out of sync with the total it's supposed to summarize. (Implementation note
  added during Phase 2; the scoring engine computes this itself.)
- Interest: estimated per category from typical Indian market rates (home ~8.5%,
  vehicle ~9%, education ~9%, personal/CC ~14–36%), with an **optional override**
  field for users who know their actual blended rate.

### Wealth
- `investments_total` (₹ — equity, MF, bonds, PPF, EPF, NPS, gold-ETF/SGB; excludes primary residence)
- `retirement_specific` (₹ — subset of investments_total in EPF/PPF/NPS; context only, not double-counted)
- `investment_property_value` (₹ — property held for investment/rental, not primary residence)
- `primary_residence_value` (₹, optional — net-worth context only, excluded from productive/investable assets)
- `passive_income_monthly` (₹ — rent, dividends, interest, business royalties, etc.)
- `monthly_investment_contribution` (₹ — regular SIP/PPF/NPS/other contributions)
- `asset_allocation`: `{ equity_pct, debt_pct, gold_pct, real_estate_pct }` (percentages of `investments_total`, sum to 100)

### Protection
- `health_insurance_cover` (₹ sum insured, family floater or individual combined)
- `family_size`, `has_elderly_dependents` (bool) — adequacy context for health cover
- `life_insurance_cover` (₹ — term + pure life cover)
- `has_financial_dependents` (bool) — gates relevance of life insurance
- `goals_funded` / `goals_total` (int / int — major goals with a dedicated funding plan)
- Estate checklist (bools): `has_nomination`, `has_will`, `has_asset_documentation`

### Momentum (12-month self-reported trend)
See Architecture Decisions above.

---

## Pillar 1 — Cash Flow (250 pts)

Question: *Can the family consistently generate surplus cash?*

| Metric | Pts | Formula | Curve (piecewise linear, capped) |
|---|---:|---|---|
| Savings Rate | 70 | (income − total expenses) / income | 0%→0, 10%→25, 20%→45, 30%→60, 40%+→70 |
| Monthly Surplus | 60 | income − total expenses (absolute ₹) | ₹0→0, ₹5k→15, ₹15k→30, ₹30k→45, ₹60k+→60 |
| Income Stability | 60 | employment-type base (0–40) + volatility adj. (0–20) | see below |
| Income Diversity | 60 | f(earners) + f(source types) | see below |

**Decision:** Monthly Surplus intentionally uses fixed absolute-₹ bands, not
income-relative bands. This is deliberate: it catches families whose percentage
savings rate looks fine but whose real rupee cushion is thin, regardless of
income level. A high earner can max this metric easily — accepted trade-off.

### Income Stability — employment-type base (0–40)
| Employment type | Base pts |
|---|---:|
| Government / PSU | 40 |
| Private salaried — permanent | 34 |
| Private salaried — contract | 24 |
| Self-employed / established business | 26 |
| Freelance / gig | 16 |

### Income Stability — volatility adjustment (0–20)
| Self-report | Pts |
|---|---:|
| Very stable | +20 |
| Mostly stable | +12 |
| Variable | +5 |
| Highly variable | +0 |

`Income Stability = base + adjustment`, capped at 60.

### Income Diversity
- Earners component (cap 45): 1 earner → 20, 2 → 35, 3+ → 45
- Sources component (cap 15): 1 source → 0, 2 → 10, 3+ → 15
- `Income Diversity = earners_component + sources_component`, capped at 60.

Note: a single stable earner is not penalized to near-zero overall — the
Income Stability metric already rewards that resilience. Diversity legitimately
scores lower for undiversified households; that's the point of the metric.

---

## Pillar 2 — Liquidity (150 pts)

Question: *How long can the family survive a financial shock?*

| Metric | Pts | Formula | Curve (piecewise linear, capped) |
|---|---:|---|---|
| Emergency Fund | 80 | emergency_fund_liquid / essential_monthly_expenses (months) | 0→0, 1mo→20, 3mo→45, 6mo→65, 12mo+→80 (flat past 12mo — no reward for excess idle cash) |
| Liquid Assets | 40 | other_liquid_assets / essential_monthly_expenses (additional months) | 0→0, 1mo→15, 3mo→30, 6mo+→40 |
| Credit Availability | 30 | available_credit_limit / essential_monthly_expenses (months), then gated | 0→0, 1mo→10, 3mo→20, 6mo+→30, **then capped per gate below** |

### Credit Availability gate
Credit is a secondary resilience measure and must never heavily compensate for
an inadequate emergency fund. The raw Credit Availability score is capped based
on Emergency Fund coverage:

| Emergency Fund coverage | Credit Availability cap |
|---|---:|
| <1 month | 10 / 30 |
| 1–3 months | 20 / 30 |
| ≥3 months | 30 / 30 (no gate) |

`Credit Availability score = min(raw_curve_score, gate_cap)`

## Pillar 3 — Debt (250 pts)

Question: *Is the family's debt manageable, affordable, and productive?*

| Metric | Pts | Formula | Curve (piecewise linear, capped) |
|---|---:|---|---|
| Debt-to-Income | 60 | monthly_EMI_total / monthly_income_total | 0%→60, 20%→50, 35%→35, 50%→15, 60%+→0 |
| Debt-to-Net-Worth | 60 | total_outstanding_debt / gross_total_assets | 0%→60, 30%→45, 50%→30, 70%→15, 90%+→0 |
| Interest Burden | 70 | estimated_monthly_interest / monthly_income_total | 0%→70, 5%→55, 10%→35, 15%→15, 20%+→0 |
| Bad Debt Ratio | 60 | personal_loan_and_cc_revolving / total_outstanding_debt (0 if no debt) | 0%→60, 10%→50, 25%→30, 50%→10, 75%+→0 |

**Decisions:**
- **Debt-to-Income = EMI ÷ monthly income** (affordability/cash-flow burden, the
  standard bank ratio), deliberately not total-debt ÷ annual-income — that would
  overlap with Debt-to-Net-Worth.
- **Debt-to-Net-Worth is implemented as debt ÷ gross total assets**, not
  debt ÷ (assets − debt). Literal net worth can be zero or negative early in a
  mortgage, which makes a net-worth-denominator ratio unstable. Gross-assets
  denominator stays numerically sane at any leverage level while still
  capturing the leverage intent — a young family with an 80%-LTV home loan will
  naturally score low here.
  - `gross_total_assets = primary_residence_value + investment_property_value + investments_total + emergency_fund_liquid + other_liquid_assets`
- **Interest Burden** uses `estimated_monthly_interest`, computed from the debt
  category breakdown × the estimated (or user-overridden) rates from the Inputs
  section: `Σ(category_balance × category_rate / 12)`.
- A fully debt-free family scores 250/250 on this pillar by construction (every
  ratio evaluates to 0%, and Bad Debt Ratio is defined as 0 when there's no debt).

## Pillar 4 — Wealth Creation (200 pts)

Question: *Is the family's financial wealth actually growing?*

| Metric | Pts | Formula | Curve (piecewise linear, capped) |
|---|---:|---|---|
| Investment Rate | 60 | monthly_investment_contribution / monthly_income_total | 0%→0, 5%→20, 10%→35, 20%→50, 30%+→60 |
| Asset Allocation | 40 | diversification: max single-category concentration across equity/debt/gold/real-estate % | 25%(4-way even split)→40, 40%→35, 60%→22, 80%→10, 100%→0 |
| Net-Worth Growth (proxy) | 60 | (monthly_investment_contribution + monthly_debt_principal_reduction) / monthly_income_total | 0%→0, 5%→20, 10%→35, 20%→50, 30%+→60 |
| Passive Income | 40 | passive_income_monthly / total_monthly_expenses | 0%→0, 10%→10, 25%→20, 50%→30, 100%+→40 |

**Decisions:**
- **Net-Worth Growth is redefined as a snapshot-computable flow proxy**, not a
  literal before/after delta (V1 has no stored history to diff against). It
  measures active wealth-building capacity right now — money currently being
  directed into investments plus debt principal paydown — rather than realized
  historical growth. This is intentionally distinct from the separate Momentum
  output, which stays as self-reported trend only.
  - `monthly_debt_principal_reduction = monthly_EMI_total − estimated_monthly_interest` (reuses the Interest Burden calc from Pillar 3, no new input required).
- **Asset Allocation (V1) scores diversification only** — max concentration
  across `equity_pct / debt_pct / gold_pct / real_estate_pct` (new input,
  percentages of `investments_total`, sum to 100). Horizon-appropriateness
  (matching equity % to years-to-goal) is deferred to a future version.

### New input required
- `asset_allocation`: `{ equity_pct, debt_pct, gold_pct, real_estate_pct }` (sum to 100)
- `monthly_investment_contribution` (₹ — regular SIP/PPF/NPS/other contributions)

## Pillar 5 — Risk Management (150 pts)

Question: *How well protected is the family against major financial shocks?*

| Metric | Pts | Formula | Curve (piecewise linear, capped) |
|---|---:|---|---|
| Health Insurance | 50 | health_insurance_cover / recommended_health_cover | 0%→0, 50%→20, 75%→32, 100%→45, 150%+→50 |
| Life Insurance | 40 | life_insurance_cover / recommended_life_cover (only if has_financial_dependents) | 0%→0, 40%→15, 70%→28, 100%→38, 120%+→40 |
| Goal Funding | 30 | goals_funded / goals_total | linear 0→30; if goals_total = 0, treat as N/A → full 30 |
| Estate Planning | 30 | has_nomination(10) + has_will(10) + has_asset_documentation(10) | sum of booleans × 10 |

**Benchmarks (placeholders — validate against synthetic profiles in a later pass):**
- `recommended_health_cover = ₹300,000 × max(1, num_adults_earning) + ₹200,000 × num_dependents + (has_elderly_dependents ? ₹500,000 : 0)`
- `recommended_life_cover = 10 × (monthly_income_total × 12)` — standard 10x-annual-income rule of thumb
- **If `has_financial_dependents = false`, Life Insurance scores full 40/40 regardless of actual cover** — no one depends on the income, so absent cover isn't a deficiency (spec: "should not reward unnecessary insurance," which cuts both ways — it also shouldn't *penalize* unnecessary insurance decisions).

## Four Core Outputs

### 1. Financial Health = FFHS score
Sum of the five pillars, 0–1000. See per-pillar formulas above.

| Score | Rating |
|---:|---|
| 900–1000 | Exceptional |
| 800–899 | Excellent |
| 700–799 | Healthy |
| 600–699 | Stable |
| 500–599 | Warning |
| <500 | High Risk |

### 2. Financial Momentum
Each of the 5 self-reported trend answers (see Architecture Decisions) maps to
a signed value: positive direction → **+1**, same → **0**, negative direction →
**−1** (for debt, "reduced" is positive, "increased" is negative). Average the
5 signed values → `momentum_avg` in [−1, +1]:

| momentum_avg | Rating |
|---|---|
| ≥ 0.6 | Strong Positive |
| 0.2 to 0.6 | Positive |
| −0.2 to 0.2 | Neutral |
| −0.6 to −0.2 | Negative |
| ≤ −0.6 | Strong Negative |

Momentum is displayed separately from the FFHS score and never added to it.

### 3. Financial Efficiency
`Efficiency = (monthly_surplus + monthly_debt_principal_reduction) / monthly_income_total`, shown as a %.

- `monthly_surplus = monthly_income_total − total_monthly_expenses` (already
  captures all income not spent, whether held as cash or invested).
- `monthly_debt_principal_reduction` is added back because the EMI portion that
  is principal isn't a true expense — it converts cash into reduced liability,
  i.e. it's wealth-neutral, not wealth-lost. Only the interest portion is a
  genuine cost, and it's already excluded here since it stayed inside `total_monthly_expenses`.
- Investment returns (market appreciation) are explicitly **not** included and
  are out of scope for V1 — a stateless single-snapshot tool has no portfolio
  history to compute realized returns from. Flagged as a future enhancement.
- Note this is deliberately broader than the Pillar 4 "Net-Worth Growth" proxy,
  which only counts money that's actively deployed (`monthly_investment_contribution
  + monthly_debt_principal_reduction`). Efficiency counts *all* retained income,
  including idle cash sitting unspent. A family that hoards cash without
  investing it can score well on Efficiency but poorly on Pillar 4 — that's the
  intended distinction between "are we retaining income" (Efficiency) and "are
  we actively deploying it" (Wealth Creation pillar).

### 4. Financial Freedom
`Freedom = passive_income_monthly / total_monthly_expenses`, shown as a %.
100%+ means passive income theoretically covers current monthly expenses.
This is *current passive-income coverage* only — full financial-independence
readiness (accounting for inflation, retirement horizon, sustainable
withdrawal rate) is out of scope for V1 and flagged as a future enhancement,
per the spec's explicit distinction between the two.

---

## Biggest Opportunity Engine

The spec's own worked example (Cash Flow 224/250, Liquidity 137/150, Debt
191/250, Wealth 168/200, Risk 116/150) picks **Risk Management** as the
biggest opportunity — even though Debt has both a lower percentage score
(76.4% vs 77.3%) and a larger absolute point gap (59 vs 34 pts). This means
the engine isn't simply "lowest %" or "largest gap" — it must weight by how
fast/high-leverage each pillar's fix is.

**Formula:** `opportunity_score(pillar) = (pillar_max − pillar_score) × actionability_multiplier`

Pick the pillar with the highest `opportunity_score`.

| Pillar | Actionability multiplier | Rationale |
|---|---:|---|
| Risk Management | 1.5 | Fastest, highest-leverage fix — buying adequate insurance or writing a will takes days/weeks, and an uninsured shock can erase progress made in every other pillar. |
| Liquidity | 1.3 | Fast — redirecting existing cash into an emergency fund doesn't require new income. |
| Cash Flow | 1.0 | Medium — improving savings rate/surplus takes sustained behavior change over months. |
| Wealth Creation | 0.7 | Medium-slow — building investment habits and allocation changes compound slowly. |
| Debt | 0.5 | Slowest — structural, paydown takes years, refinancing options are limited. |

**Validation against the spec's own example:**

| Pillar | Gap | Multiplier | Opportunity score |
|---|---:|---:|---:|
| Cash Flow | 26 | 1.0 | 26.0 |
| Liquidity | 13 | 1.3 | 16.9 |
| Debt | 59 | 0.5 | 29.5 |
| Wealth | 32 | 0.7 | 22.4 |
| **Risk** | **34** | **1.5** | **51.0 ← highest** |

Risk Management wins, matching the spec's worked example. These multipliers
are a first-pass judgment call and should be revisited once synthetic profiles
are tested (Task: synthetic profiles).

## Synthetic Test Profiles
_Pending._
