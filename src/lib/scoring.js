// FFHS scoring engine — implements docs/METHODOLOGY.md exactly.
// Every formula, breakpoint, and edge case here should trace back to that doc.
// Input field names match the "Inputs" section of the spec (snake_case) so the
// two stay auditable against each other.

/**
 * Piecewise-linear interpolation over ascending [x, y] breakpoints, flat-clamped at both ends.
 * A non-finite value (NaN, +/-Infinity — e.g. a ratio whose denominator collapsed to 0) always
 * resolves to the curve's WORST score, not simply its first breakpoint: on a decreasing curve
 * (higher ratio = worse, e.g. every Debt pillar metric) the first breakpoint is the BEST score,
 * so falling back to it would silently reward missing/undefined data instead of penalizing it.
 */
function piecewiseLinear(value, points) {
  if (!Number.isFinite(value)) {
    const first = points[0][1]
    const last = points[points.length - 1][1]
    return first <= last ? first : last
  }
  if (value <= points[0][0]) return points[0][1]
  const last = points[points.length - 1]
  if (value >= last[0]) return last[1]
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    if (value >= x0 && value <= x1) {
      const t = (value - x0) / (x1 - x0)
      return y0 + t * (y1 - y0)
    }
  }
  return last[1]
}

/** a / b, guarding division by zero. Returns `whenZero` if b is 0. */
function safeRatio(a, b, whenZero = 0) {
  if (!b) return whenZero
  return a / b
}

// ---------------------------------------------------------------------------
// Pillar 1 — Cash Flow (250 pts)
// ---------------------------------------------------------------------------

const EMPLOYMENT_BASE = {
  govt_psu: 40,
  private_permanent: 34,
  private_contract: 24,
  self_employed: 26,
  freelance_gig: 16,
}

const VOLATILITY_ADJUSTMENT = {
  very_stable: 20,
  mostly_stable: 12,
  variable: 5,
  highly_variable: 0,
}

function earnersComponent(numEarners) {
  if (numEarners <= 1) return 20
  if (numEarners === 2) return 35
  return 45
}

function sourcesComponent(numSources) {
  if (numSources <= 1) return 0
  if (numSources === 2) return 10
  return 15
}

export function scoreCashFlow(inputs) {
  const { monthly_income_total: income, total_monthly_expenses: expenses } = inputs

  const savingsRate = safeRatio(income - expenses, income)
  const savingsRateScore = piecewiseLinear(savingsRate, [
    [0, 0], [0.1, 25], [0.2, 45], [0.3, 60], [0.4, 70],
  ])

  const monthlySurplus = income - expenses
  const surplusScore = piecewiseLinear(monthlySurplus, [
    [0, 0], [5000, 15], [15000, 30], [30000, 45], [60000, 60],
  ])

  const employmentBase = EMPLOYMENT_BASE[inputs.primary_earner_employment_type] ?? 0
  const volatilityAdj = VOLATILITY_ADJUSTMENT[inputs.income_volatility_selfreport] ?? 0
  const incomeStabilityScore = employmentBase + volatilityAdj

  const incomeDiversityScore =
    earnersComponent(inputs.num_income_earners) + sourcesComponent(inputs.income_sources?.length ?? 0)

  return {
    total: savingsRateScore + surplusScore + incomeStabilityScore + incomeDiversityScore,
    max: 250,
    metrics: {
      savingsRate: { value: savingsRate, score: savingsRateScore, max: 70 },
      monthlySurplus: { value: monthlySurplus, score: surplusScore, max: 60 },
      incomeStability: { score: incomeStabilityScore, max: 60 },
      incomeDiversity: { score: incomeDiversityScore, max: 60 },
    },
  }
}

// ---------------------------------------------------------------------------
// Pillar 2 — Liquidity (150 pts)
// ---------------------------------------------------------------------------

export function scoreLiquidity(inputs) {
  const essential = inputs.essential_monthly_expenses

  const efMonths = safeRatio(inputs.emergency_fund_liquid, essential)
  const efScore = piecewiseLinear(efMonths, [
    [0, 0], [1, 20], [3, 45], [6, 65], [12, 80],
  ])

  const laMonths = safeRatio(inputs.other_liquid_assets, essential)
  const laScore = piecewiseLinear(laMonths, [
    [0, 0], [1, 15], [3, 30], [6, 40],
  ])

  const creditMonths = safeRatio(inputs.available_credit_limit, essential)
  const creditRaw = piecewiseLinear(creditMonths, [
    [0, 0], [1, 10], [3, 20], [6, 30],
  ])
  const gateCap = efMonths < 1 ? 10 : efMonths < 3 ? 20 : 30
  const creditScore = Math.min(creditRaw, gateCap)

  return {
    total: efScore + laScore + creditScore,
    max: 150,
    metrics: {
      emergencyFund: { value: efMonths, score: efScore, max: 80 },
      liquidAssets: { value: laMonths, score: laScore, max: 40 },
      creditAvailability: { value: creditMonths, score: creditScore, max: 30, gateCap },
    },
  }
}

// ---------------------------------------------------------------------------
// Pillar 3 — Debt (250 pts)
// ---------------------------------------------------------------------------

const DEFAULT_INTEREST_RATES = {
  home_loan: 0.085,
  vehicle_loan: 0.09,
  education_loan: 0.09,
  personal_loan_and_cc_revolving: 0.24,
  other_secured_debt: 0.1,
}

/** Estimated monthly interest across the debt breakdown, honoring a blended-rate override. */
export function estimateMonthlyInterest(inputs) {
  const breakdown = inputs.debt_breakdown ?? {}
  if (Number.isFinite(inputs.blended_interest_rate_override)) {
    const totalOutstandingDebt = Object.values(breakdown).reduce((a, b) => a + Math.max(0, b || 0), 0)
    return (totalOutstandingDebt * inputs.blended_interest_rate_override) / 12
  }
  let monthlyInterest = 0
  for (const [category, rate] of Object.entries(DEFAULT_INTEREST_RATES)) {
    monthlyInterest += Math.max(0, breakdown[category] ?? 0) * rate / 12
  }
  return monthlyInterest
}

export function scoreDebt(inputs) {
  const income = inputs.monthly_income_total
  const breakdown = inputs.debt_breakdown ?? {}
  // Total outstanding debt is derived from the category breakdown rather than
  // collected as a separate field — one number to enter, and it can't drift
  // out of sync with the breakdown it's supposed to summarize.
  const totalOutstandingDebt = Object.values(breakdown).reduce((a, b) => a + Math.max(0, b || 0), 0)

  // whenZero: Infinity (not the default 0) — a zero/undefined income with a real EMI to pay is
  // maximally risky, not risk-free. Mirrors the same pattern already used for debtToAssets below.
  const dti = safeRatio(inputs.monthly_EMI_total, income, inputs.monthly_EMI_total > 0 ? Infinity : 0)
  const dtiScore = piecewiseLinear(dti, [
    [0, 60], [0.2, 50], [0.35, 35], [0.5, 15], [0.6, 0],
  ])

  const grossAssets =
    (inputs.primary_residence_value ?? 0) +
    (inputs.investment_property_value ?? 0) +
    (inputs.investments_total ?? 0) +
    (inputs.emergency_fund_liquid ?? 0) +
    (inputs.other_liquid_assets ?? 0)
  const debtToAssets = safeRatio(totalOutstandingDebt, grossAssets, totalOutstandingDebt > 0 ? Infinity : 0)
  const dtaScore = piecewiseLinear(debtToAssets, [
    [0, 60], [0.3, 45], [0.5, 30], [0.7, 15], [0.9, 0],
  ])

  const estimatedMonthlyInterest = estimateMonthlyInterest(inputs)
  // Same whenZero: Infinity treatment as debtToIncome above, and for the same reason.
  const interestBurden = safeRatio(estimatedMonthlyInterest, income, estimatedMonthlyInterest > 0 ? Infinity : 0)
  const interestScore = piecewiseLinear(interestBurden, [
    [0, 70], [0.05, 55], [0.1, 35], [0.15, 15], [0.2, 0],
  ])

  const badDebtRatio = safeRatio(Math.max(0, breakdown.personal_loan_and_cc_revolving ?? 0), totalOutstandingDebt)
  const badDebtScore = piecewiseLinear(badDebtRatio, [
    [0, 60], [0.1, 50], [0.25, 30], [0.5, 10], [0.75, 0],
  ])

  const monthlyDebtPrincipalReduction = Math.max(0, inputs.monthly_EMI_total - estimatedMonthlyInterest)

  return {
    total: dtiScore + dtaScore + interestScore + badDebtScore,
    max: 250,
    monthlyDebtPrincipalReduction,
    metrics: {
      debtToIncome: { value: dti, score: dtiScore, max: 60 },
      debtToAssets: { value: debtToAssets, score: dtaScore, max: 60 },
      interestBurden: { value: interestBurden, score: interestScore, max: 70 },
      badDebtRatio: { value: badDebtRatio, score: badDebtScore, max: 60 },
    },
  }
}

// ---------------------------------------------------------------------------
// Pillar 4 — Wealth Creation (200 pts)
// ---------------------------------------------------------------------------

export function scoreWealthCreation(inputs, monthlyDebtPrincipalReduction) {
  const income = inputs.monthly_income_total

  const investmentRate = safeRatio(inputs.monthly_investment_contribution, income)
  const investmentRateScore = piecewiseLinear(investmentRate, [
    [0, 0], [0.05, 20], [0.1, 35], [0.2, 50], [0.3, 60],
  ])

  // With zero investments there's nothing to diversify — without this guard,
  // an all-zero allocation reads as maxConcentration 0, which falls below the
  // curve's first breakpoint (0.25) and flat-clamps to its score (40, the max).
  // That would hand a family with no investments a perfect Asset Allocation
  // score, which is the opposite of the intended signal.
  const allocation = inputs.asset_allocation ?? {}
  const hasInvestments = (inputs.investments_total ?? 0) > 0
  const maxConcentration = Math.max(
    allocation.equity_pct ?? 0,
    allocation.debt_pct ?? 0,
    allocation.gold_pct ?? 0,
    allocation.real_estate_pct ?? 0,
  ) / 100
  const allocationScore = hasInvestments
    ? piecewiseLinear(maxConcentration, [[0.25, 40], [0.4, 35], [0.6, 22], [0.8, 10], [1.0, 0]])
    : 0

  const netWorthGrowthProxy = safeRatio(
    inputs.monthly_investment_contribution + monthlyDebtPrincipalReduction,
    income,
  )
  const netWorthGrowthScore = piecewiseLinear(netWorthGrowthProxy, [
    [0, 0], [0.05, 20], [0.1, 35], [0.2, 50], [0.3, 60],
  ])

  const passiveCoverage = safeRatio(inputs.passive_income_monthly, inputs.total_monthly_expenses)
  const passiveScore = piecewiseLinear(passiveCoverage, [
    [0, 0], [0.1, 10], [0.25, 20], [0.5, 30], [1.0, 40],
  ])

  return {
    total: investmentRateScore + allocationScore + netWorthGrowthScore + passiveScore,
    max: 200,
    metrics: {
      investmentRate: { value: investmentRate, score: investmentRateScore, max: 60 },
      assetAllocation: { value: maxConcentration, score: allocationScore, max: 40 },
      netWorthGrowth: { value: netWorthGrowthProxy, score: netWorthGrowthScore, max: 60 },
      passiveIncome: { value: passiveCoverage, score: passiveScore, max: 40 },
    },
  }
}

// ---------------------------------------------------------------------------
// Pillar 5 — Risk Management (150 pts)
// ---------------------------------------------------------------------------

export function scoreRiskManagement(inputs) {
  const recommendedHealthCover =
    300000 * Math.max(1, inputs.num_adults_earning) +
    200000 * inputs.num_dependents +
    (inputs.has_elderly_dependents ? 500000 : 0)
  const healthRatio = safeRatio(inputs.health_insurance_cover, recommendedHealthCover)
  const healthScore = piecewiseLinear(healthRatio, [
    [0, 0], [0.5, 20], [0.75, 32], [1.0, 45], [1.5, 50],
  ])

  let lifeScore
  let lifeRatio = null
  if (inputs.has_financial_dependents) {
    const recommendedLifeCover = 10 * inputs.monthly_income_total * 12
    lifeRatio = safeRatio(inputs.life_insurance_cover, recommendedLifeCover)
    lifeScore = piecewiseLinear(lifeRatio, [
      [0, 0], [0.4, 15], [0.7, 28], [1.0, 38], [1.2, 40],
    ])
  } else {
    lifeScore = 40
  }

  const goalFundingScore =
    inputs.goals_total === 0 ? 30 : piecewiseLinear(safeRatio(inputs.goals_funded, inputs.goals_total), [[0, 0], [1, 30]])

  const estateScore =
    (inputs.has_nomination ? 10 : 0) + (inputs.has_will ? 10 : 0) + (inputs.has_asset_documentation ? 10 : 0)

  return {
    total: healthScore + lifeScore + goalFundingScore + estateScore,
    max: 150,
    metrics: {
      healthInsurance: { value: healthRatio, score: healthScore, max: 50 },
      lifeInsurance: { value: lifeRatio, score: lifeScore, max: 40 },
      goalFunding: { score: goalFundingScore, max: 30 },
      estatePlanning: { score: estateScore, max: 30 },
    },
  }
}

// ---------------------------------------------------------------------------
// FFHS aggregate score + rating
// ---------------------------------------------------------------------------

const RATING_BANDS = [
  [900, 'Exceptional'],
  [800, 'Excellent'],
  [700, 'Healthy'],
  [600, 'Stable'],
  [500, 'Warning'],
  [0, 'High Risk'],
]

export function rateScore(score) {
  for (const [threshold, rating] of RATING_BANDS) {
    if (score >= threshold) return rating
  }
  return 'High Risk'
}

export function computeFFHS(inputs) {
  const cashFlow = scoreCashFlow(inputs)
  const liquidity = scoreLiquidity(inputs)
  const debt = scoreDebt(inputs)
  const wealth = scoreWealthCreation(inputs, debt.monthlyDebtPrincipalReduction)
  const risk = scoreRiskManagement(inputs)

  const pillars = { cashFlow, liquidity, debt, wealth, risk }
  const score = cashFlow.total + liquidity.total + debt.total + wealth.total + risk.total

  return {
    score,
    rating: rateScore(score),
    pillars,
    momentum: computeMomentum(inputs),
    efficiency: computeEfficiency(inputs, debt.monthlyDebtPrincipalReduction),
    freedom: computeFreedom(inputs),
    biggestOpportunity: computeBiggestOpportunity(pillars),
  }
}

// ---------------------------------------------------------------------------
// Financial Momentum
// ---------------------------------------------------------------------------

const TREND_SIGN = {
  up: 1, same: 0, down: -1,
  reduced: 1, increased: -1,
}

const MOMENTUM_TREND_FIELDS = [
  'trend_income',
  'trend_surplus_savings_rate',
  'trend_debt',
  'trend_emergency_fund',
  'trend_investment_contributions',
]

export function computeMomentum(inputs) {
  const signs = MOMENTUM_TREND_FIELDS.map((field) => TREND_SIGN[inputs[field]] ?? 0)
  const avg = signs.reduce((a, b) => a + b, 0) / signs.length

  let rating
  if (avg >= 0.6) rating = 'Strong Positive'
  else if (avg >= 0.2) rating = 'Positive'
  else if (avg > -0.2) rating = 'Neutral'
  else if (avg > -0.6) rating = 'Negative'
  else rating = 'Strong Negative'

  return { avg, rating }
}

// ---------------------------------------------------------------------------
// Financial Efficiency & Freedom
// ---------------------------------------------------------------------------

export function computeEfficiency(inputs, monthlyDebtPrincipalReduction) {
  const monthlySurplus = inputs.monthly_income_total - inputs.total_monthly_expenses
  return safeRatio(monthlySurplus + monthlyDebtPrincipalReduction, inputs.monthly_income_total)
}

export function computeFreedom(inputs) {
  return safeRatio(inputs.passive_income_monthly, inputs.total_monthly_expenses)
}

// ---------------------------------------------------------------------------
// Biggest Opportunity engine
// ---------------------------------------------------------------------------

const ACTIONABILITY_MULTIPLIER = {
  risk: 1.5,
  liquidity: 1.3,
  cashFlow: 1.0,
  wealth: 0.7,
  debt: 0.5,
}

export const PILLAR_LABEL = {
  cashFlow: 'Cash Flow',
  liquidity: 'Liquidity',
  debt: 'Debt',
  wealth: 'Wealth Creation',
  risk: 'Risk Management',
}

export function computeBiggestOpportunity(pillars) {
  let best = null
  for (const [key, pillar] of Object.entries(pillars)) {
    const gap = pillar.max - pillar.total
    const opportunityScore = gap * ACTIONABILITY_MULTIPLIER[key]
    if (!best || opportunityScore > best.opportunityScore) {
      best = { key, label: PILLAR_LABEL[key], gap, opportunityScore }
    }
  }
  return best
}
