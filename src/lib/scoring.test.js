import { describe, it, expect } from 'vitest'
import { computeFFHS } from './scoring.js'

// Synthetic Indian family profiles — sanity-checks that intuitive financial
// situations produce intuitive scores, per docs/METHODOLOGY.md Phase 1 step 9.
// These assert bands/ordering, not exact point totals: the formulas are a
// first-pass calibration, not yet validated against real user data.

function assertNoNaN(result) {
  expect(Number.isFinite(result.score)).toBe(true)
  for (const pillar of Object.values(result.pillars)) {
    expect(Number.isFinite(pillar.total)).toBe(true)
    expect(pillar.total).toBeGreaterThanOrEqual(0)
    expect(pillar.total).toBeLessThanOrEqual(pillar.max)
  }
}

describe('Profile: young single-income renters, no safety net', () => {
  const inputs = {
    num_adults_earning: 1,
    num_dependents: 1,
    monthly_income_total: 45000,
    num_income_earners: 1,
    income_sources: ['salary'],
    primary_earner_employment_type: 'private_permanent',
    income_volatility_selfreport: 'mostly_stable',
    essential_monthly_expenses: 35000,
    total_monthly_expenses: 42000,
    emergency_fund_liquid: 10000,
    other_liquid_assets: 0,
    available_credit_limit: 50000,
    monthly_EMI_total: 0,
    debt_breakdown: {},
    investments_total: 0,
    investment_property_value: 0,
    primary_residence_value: 0,
    passive_income_monthly: 0,
    monthly_investment_contribution: 0,
    asset_allocation: { equity_pct: 0, debt_pct: 0, gold_pct: 0, real_estate_pct: 0 },
    health_insurance_cover: 0,
    has_elderly_dependents: false,
    life_insurance_cover: 0,
    has_financial_dependents: true,
    goals_funded: 0,
    goals_total: 2,
    has_nomination: false,
    has_will: false,
    has_asset_documentation: false,
    trend_income: 'same',
    trend_surplus_savings_rate: 'same',
    trend_debt: 'same',
    trend_emergency_fund: 'down',
    trend_investment_contributions: 'same',
  }
  const result = computeFFHS(inputs)

  it('produces no NaN/out-of-range sub-scores', () => assertNoNaN(result))

  it('lands in Warning/High Risk — thin margins, zero protection, zero wealth', () => {
    expect(result.score).toBeLessThan(600)
  })

  it('debt pillar is maxed — no debt at all', () => {
    expect(result.pillars.debt.total).toBe(250)
  })

  it('flags Risk Management as the biggest opportunity — no insurance, no estate docs', () => {
    expect(result.biggestOpportunity.key).toBe('risk')
  })

  it('zero investments ⇒ zero Asset Allocation score, not a free max via curve extrapolation', () => {
    expect(result.pillars.wealth.metrics.assetAllocation.score).toBe(0)
  })
})

describe('Profile: dual-income professionals, heavy home loan', () => {
  const inputs = {
    num_adults_earning: 2,
    num_dependents: 1,
    monthly_income_total: 250000,
    num_income_earners: 2,
    income_sources: ['salary'],
    primary_earner_employment_type: 'private_permanent',
    income_volatility_selfreport: 'very_stable',
    essential_monthly_expenses: 90000,
    total_monthly_expenses: 150000,
    emergency_fund_liquid: 400000,
    other_liquid_assets: 200000,
    available_credit_limit: 500000,
    monthly_EMI_total: 75000,
    debt_breakdown: { home_loan: 8000000 },
    investments_total: 1500000,
    investment_property_value: 0,
    primary_residence_value: 9500000,
    passive_income_monthly: 5000,
    monthly_investment_contribution: 30000,
    asset_allocation: { equity_pct: 60, debt_pct: 25, gold_pct: 10, real_estate_pct: 5 },
    health_insurance_cover: 1000000,
    has_elderly_dependents: false,
    life_insurance_cover: 20000000,
    has_financial_dependents: true,
    goals_funded: 2,
    goals_total: 3,
    has_nomination: true,
    has_will: true,
    has_asset_documentation: true,
    trend_income: 'up',
    trend_surplus_savings_rate: 'up',
    trend_debt: 'reduced',
    trend_emergency_fund: 'up',
    trend_investment_contributions: 'up',
  }
  const result = computeFFHS(inputs)

  it('produces no NaN/out-of-range sub-scores', () => assertNoNaN(result))

  it('lands in Stable/Healthy — strong income and protection, but heavily leveraged', () => {
    expect(result.score).toBeGreaterThanOrEqual(600)
    expect(result.score).toBeLessThan(900)
  })

  it('debt pillar is the weakest relative to its max — large home loan dominates', () => {
    const pctByPillar = Object.entries(result.pillars).map(([k, p]) => [k, p.total / p.max])
    const weakest = pctByPillar.reduce((a, b) => (b[1] < a[1] ? b : a))
    expect(weakest[0]).toBe('debt')
  })

  it('momentum is strongly positive — every trend improved', () => {
    expect(result.momentum.rating).toBe('Strong Positive')
  })
})

describe('Profile: affluent family, weak protection (mirrors the spec worked example)', () => {
  const inputs = {
    num_adults_earning: 2,
    num_dependents: 2,
    monthly_income_total: 400000,
    num_income_earners: 2,
    income_sources: ['salary', 'rental'],
    primary_earner_employment_type: 'govt_psu',
    income_volatility_selfreport: 'very_stable',
    essential_monthly_expenses: 100000,
    total_monthly_expenses: 180000,
    emergency_fund_liquid: 900000,
    other_liquid_assets: 500000,
    available_credit_limit: 1000000,
    monthly_EMI_total: 40000,
    debt_breakdown: { home_loan: 3000000 },
    investments_total: 6000000,
    investment_property_value: 4000000,
    primary_residence_value: 12000000,
    passive_income_monthly: 60000,
    monthly_investment_contribution: 80000,
    asset_allocation: { equity_pct: 45, debt_pct: 30, gold_pct: 10, real_estate_pct: 15 },
    health_insurance_cover: 500000,
    has_elderly_dependents: true,
    life_insurance_cover: 5000000,
    has_financial_dependents: true,
    goals_funded: 1,
    goals_total: 3,
    has_nomination: true,
    has_will: false,
    has_asset_documentation: false,
    trend_income: 'up',
    trend_surplus_savings_rate: 'same',
    trend_debt: 'reduced',
    trend_emergency_fund: 'up',
    trend_investment_contributions: 'up',
  }
  const result = computeFFHS(inputs)

  it('produces no NaN/out-of-range sub-scores', () => assertNoNaN(result))

  it('lands in Healthy/Excellent — strong cash flow and wealth, undersized protection', () => {
    expect(result.score).toBeGreaterThanOrEqual(700)
  })

  it('flags Risk Management as the biggest opportunity despite Debt likely having a larger point gap', () => {
    expect(result.biggestOpportunity.key).toBe('risk')
  })
})

describe('Profile: self-employed, revolving credit-card debt', () => {
  const inputs = {
    num_adults_earning: 1,
    num_dependents: 2,
    monthly_income_total: 90000,
    num_income_earners: 1,
    income_sources: ['business'],
    primary_earner_employment_type: 'self_employed',
    income_volatility_selfreport: 'variable',
    essential_monthly_expenses: 60000,
    total_monthly_expenses: 85000,
    emergency_fund_liquid: 15000,
    other_liquid_assets: 0,
    available_credit_limit: 100000,
    monthly_EMI_total: 25000,
    debt_breakdown: { personal_loan_and_cc_revolving: 500000 },
    investments_total: 50000,
    investment_property_value: 0,
    primary_residence_value: 0,
    passive_income_monthly: 0,
    monthly_investment_contribution: 0,
    asset_allocation: { equity_pct: 100, debt_pct: 0, gold_pct: 0, real_estate_pct: 0 },
    health_insurance_cover: 300000,
    has_elderly_dependents: false,
    life_insurance_cover: 1000000,
    has_financial_dependents: true,
    goals_funded: 0,
    goals_total: 2,
    has_nomination: false,
    has_will: false,
    has_asset_documentation: false,
    trend_income: 'down',
    trend_surplus_savings_rate: 'down',
    trend_debt: 'increased',
    trend_emergency_fund: 'down',
    trend_investment_contributions: 'same',
  }
  const result = computeFFHS(inputs)

  it('produces no NaN/out-of-range sub-scores', () => assertNoNaN(result))

  it('lands in High Risk/Warning — thin liquidity, all-bad-debt, high interest burden', () => {
    expect(result.score).toBeLessThan(600)
  })

  it('bad debt ratio scores nearly zero — 100% of debt is CC/personal', () => {
    expect(result.pillars.debt.metrics.badDebtRatio.score).toBeLessThan(5)
  })

  it('momentum is strongly negative — every trend worsened', () => {
    expect(result.momentum.rating).toBe('Strong Negative')
  })
})

describe('Profile: near-FI family with strong passive income', () => {
  const inputs = {
    num_adults_earning: 2,
    num_dependents: 1,
    monthly_income_total: 300000,
    num_income_earners: 2,
    income_sources: ['salary', 'rental', 'business'],
    primary_earner_employment_type: 'private_permanent',
    income_volatility_selfreport: 'very_stable',
    essential_monthly_expenses: 80000,
    total_monthly_expenses: 120000,
    emergency_fund_liquid: 1500000,
    other_liquid_assets: 500000,
    available_credit_limit: 500000,
    monthly_EMI_total: 0,
    debt_breakdown: {},
    investments_total: 25000000,
    investment_property_value: 10000000,
    primary_residence_value: 15000000,
    passive_income_monthly: 130000,
    monthly_investment_contribution: 100000,
    asset_allocation: { equity_pct: 50, debt_pct: 30, gold_pct: 10, real_estate_pct: 10 },
    health_insurance_cover: 1500000,
    has_elderly_dependents: false,
    life_insurance_cover: 30000000,
    has_financial_dependents: true,
    goals_funded: 3,
    goals_total: 3,
    has_nomination: true,
    has_will: true,
    has_asset_documentation: true,
    trend_income: 'up',
    trend_surplus_savings_rate: 'up',
    trend_debt: 'same',
    trend_emergency_fund: 'up',
    trend_investment_contributions: 'up',
  }
  const result = computeFFHS(inputs)

  it('produces no NaN/out-of-range sub-scores', () => assertNoNaN(result))

  it('lands in Excellent/Exceptional', () => {
    expect(result.score).toBeGreaterThanOrEqual(800)
  })

  it('financial freedom is above 100% — passive income covers expenses', () => {
    expect(result.freedom).toBeGreaterThanOrEqual(1.0)
  })
})

describe('Profile: single freelancer, no dependents, debt-free — edge cases', () => {
  const inputs = {
    num_adults_earning: 1,
    num_dependents: 0,
    monthly_income_total: 70000,
    num_income_earners: 1,
    income_sources: ['freelance'],
    primary_earner_employment_type: 'freelance_gig',
    income_volatility_selfreport: 'variable',
    essential_monthly_expenses: 30000,
    total_monthly_expenses: 40000,
    emergency_fund_liquid: 200000,
    other_liquid_assets: 0,
    available_credit_limit: 100000,
    monthly_EMI_total: 0,
    debt_breakdown: {},
    investments_total: 300000,
    investment_property_value: 0,
    primary_residence_value: 0,
    passive_income_monthly: 0,
    monthly_investment_contribution: 15000,
    asset_allocation: { equity_pct: 70, debt_pct: 30, gold_pct: 0, real_estate_pct: 0 },
    health_insurance_cover: 500000,
    has_elderly_dependents: false,
    life_insurance_cover: 0,
    has_financial_dependents: false,
    goals_funded: 0,
    goals_total: 0,
    has_nomination: true,
    has_will: false,
    has_asset_documentation: true,
    trend_income: 'same',
    trend_surplus_savings_rate: 'same',
    trend_debt: 'same',
    trend_emergency_fund: 'same',
    trend_investment_contributions: 'same',
  }
  const result = computeFFHS(inputs)

  it('produces no NaN/out-of-range sub-scores', () => assertNoNaN(result))

  it('no financial dependents ⇒ full life insurance credit despite zero cover', () => {
    expect(result.pillars.risk.metrics.lifeInsurance.score).toBe(40)
  })

  it('no major goals ⇒ full goal-funding credit', () => {
    expect(result.pillars.risk.metrics.goalFunding.score).toBe(30)
  })

  it('debt-free ⇒ debt pillar maxed', () => {
    expect(result.pillars.debt.total).toBe(250)
  })

  it('momentum is neutral — everything flat', () => {
    expect(result.momentum.rating).toBe('Neutral')
  })
})
