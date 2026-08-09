// Initial shape of the questionnaire's form state. Matches the input field
// names in docs/METHODOLOGY.md / scoring.js exactly.
export function createDefaultFormData() {
  return {
    num_adults_earning: 1,
    num_dependents: 0,

    monthly_income_total: null,
    num_income_earners: 1,
    income_sources: [],
    primary_earner_employment_type: '',
    income_volatility_selfreport: '',

    essential_monthly_expenses: null,
    total_monthly_expenses: null,

    emergency_fund_liquid: 0,
    other_liquid_assets: 0,
    available_credit_limit: 0,

    debt_breakdown: {
      home_loan: 0,
      vehicle_loan: 0,
      education_loan: 0,
      personal_loan_and_cc_revolving: 0,
      other_secured_debt: 0,
    },
    monthly_EMI_total: 0,
    blended_interest_rate_override: null,

    investments_total: 0,
    investment_property_value: 0,
    primary_residence_value: 0,
    passive_income_monthly: 0,
    monthly_investment_contribution: 0,
    asset_allocation: { equity_pct: 0, debt_pct: 0, gold_pct: 0, real_estate_pct: 0 },

    health_insurance_cover: 0,
    has_elderly_dependents: false,
    has_financial_dependents: true,
    life_insurance_cover: 0,
    goals_funded: 0,
    goals_total: 0,
    has_nomination: false,
    has_will: false,
    has_asset_documentation: false,

    trend_income: 'same',
    trend_surplus_savings_rate: 'same',
    trend_debt: 'same',
    trend_emergency_fund: 'same',
    trend_investment_contributions: 'same',
  }
}
