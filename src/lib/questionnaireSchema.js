// Schema-driven questionnaire: each step lists fields for the generic
// FormField renderer. Steps that need cross-field structure (debt breakdown,
// asset allocation) carry a `bespoke` flag and are rendered by their own
// component in QuestionnaireFlow.vue instead of the generic list.

const EMPLOYMENT_OPTIONS = [
  { value: 'govt_psu', label: 'Government / PSU' },
  { value: 'private_permanent', label: 'Private sector — permanent' },
  { value: 'private_contract', label: 'Private sector — contract' },
  { value: 'self_employed', label: 'Self-employed / business owner' },
  { value: 'freelance_gig', label: 'Freelance / gig work' },
]

const VOLATILITY_OPTIONS = [
  { value: 'very_stable', label: 'Very stable' },
  { value: 'mostly_stable', label: 'Mostly stable' },
  { value: 'variable', label: 'Variable' },
  { value: 'highly_variable', label: 'Highly variable' },
]

const INCOME_SOURCE_OPTIONS = [
  { value: 'salary', label: 'Salary' },
  { value: 'business', label: 'Business income' },
  { value: 'rental', label: 'Rental income' },
  { value: 'freelance', label: 'Freelance / gig' },
  { value: 'other', label: 'Other recurring income' },
]

const UP_SAME_DOWN = [
  { value: 'up', label: 'Up' },
  { value: 'same', label: 'About the same' },
  { value: 'down', label: 'Down' },
]

const DEBT_TREND = [
  { value: 'reduced', label: 'Reduced' },
  { value: 'same', label: 'About the same' },
  { value: 'increased', label: 'Increased' },
]

export const STEPS = [
  {
    id: 'household',
    title: 'Your household',
    subtitle: 'Just the basics — this shapes a few benchmarks later on.',
    fields: [
      { key: 'num_adults_earning', label: 'Adults earning an income', type: 'integer', min: 1 },
      { key: 'num_dependents', label: 'Dependents (children, elderly parents, etc.)', type: 'integer', min: 0 },
    ],
  },
  {
    id: 'income',
    title: 'Income',
    subtitle: 'Combined across everyone in the household, take-home amounts.',
    fields: [
      { key: 'monthly_income_total', label: 'Total monthly household income', type: 'currency', required: true },
      { key: 'num_income_earners', label: 'Number of income earners', type: 'integer', min: 1 },
      { key: 'income_sources', label: 'Sources of income', type: 'multiselect', options: INCOME_SOURCE_OPTIONS, required: true },
      {
        key: 'primary_earner_employment_type',
        label: "Primary earner's employment type",
        type: 'select',
        options: EMPLOYMENT_OPTIONS,
        required: true,
      },
      {
        key: 'income_volatility_selfreport',
        label: 'How stable is your income month to month?',
        type: 'select',
        options: VOLATILITY_OPTIONS,
        required: true,
      },
    ],
  },
  {
    id: 'expenses',
    title: 'Expenses',
    subtitle: 'Monthly, on average.',
    fields: [
      { key: 'essential_monthly_expenses', label: 'Essential expenses (housing, food, utilities, transport, EMIs, insurance)', type: 'currency', required: true },
      { key: 'total_monthly_expenses', label: 'Total expenses (essential + discretionary)', type: 'currency', required: true },
    ],
  },
  {
    id: 'liquidity',
    title: 'Liquidity',
    subtitle: 'Cash and near-cash you could access in a shock.',
    fields: [
      { key: 'emergency_fund_liquid', label: 'Emergency fund (cash, savings, instant-access — ~7 days)', type: 'currency' },
      { key: 'other_liquid_assets', label: 'Other liquid assets (~30-day access, e.g. short FDs, liquid funds)', type: 'currency' },
      { key: 'available_credit_limit', label: 'Unused credit limit (cards + pre-approved OD/loan)', type: 'currency' },
    ],
  },
  {
    id: 'debt',
    title: 'Debt',
    subtitle: 'Outstanding balances by type, and your total monthly EMI.',
    bespoke: 'debt',
    fields: [{ key: 'monthly_EMI_total', label: 'Total monthly EMI (all loans combined)', type: 'currency' }],
  },
  {
    id: 'wealth',
    title: 'Wealth & investments',
    subtitle: 'Excludes your primary residence unless noted.',
    bespoke: 'wealth',
    fields: [
      { key: 'investments_total', label: 'Total investments (equity, MF, bonds, PPF, EPF, NPS, gold)', type: 'currency' },
      { key: 'investment_property_value', label: 'Investment/rental property value (not your home)', type: 'currency' },
      { key: 'primary_residence_value', label: 'Primary residence value (context only)', type: 'currency' },
      { key: 'passive_income_monthly', label: 'Monthly passive income (rent, dividends, interest, etc.)', type: 'currency' },
      { key: 'monthly_investment_contribution', label: 'Regular monthly investment contribution (SIP, PPF, NPS, etc.)', type: 'currency' },
    ],
  },
  {
    id: 'protection',
    title: 'Protection & goals',
    subtitle: 'Insurance, estate basics, and major financial goals.',
    fields: [
      { key: 'health_insurance_cover', label: 'Health insurance cover (sum insured, combined)', type: 'currency' },
      { key: 'has_elderly_dependents', label: 'Do you have elderly dependents?', type: 'boolean' },
      { key: 'has_financial_dependents', label: 'Does anyone financially depend on your income?', type: 'boolean' },
      { key: 'life_insurance_cover', label: 'Life insurance cover (term + pure life cover)', type: 'currency' },
      { key: 'goals_total', label: 'Major financial goals (retirement, education, home, etc.)', type: 'integer', min: 0 },
      { key: 'goals_funded', label: 'Of those, how many have a dedicated funding plan?', type: 'integer', min: 0 },
      { key: 'has_nomination', label: 'Nominations set on accounts/policies?', type: 'boolean' },
      { key: 'has_will', label: 'Do you have a will?', type: 'boolean' },
      { key: 'has_asset_documentation', label: 'Are your assets documented for your family?', type: 'boolean' },
    ],
  },
  {
    id: 'momentum',
    title: 'Compared to 12 months ago',
    subtitle: 'Rough direction is fine — this drives your Momentum reading, not your score.',
    fields: [
      { key: 'trend_income', label: 'Income', type: 'trend', options: UP_SAME_DOWN },
      { key: 'trend_surplus_savings_rate', label: 'Monthly surplus / savings rate', type: 'trend', options: UP_SAME_DOWN },
      { key: 'trend_debt', label: 'Debt', type: 'trend', options: DEBT_TREND },
      { key: 'trend_emergency_fund', label: 'Emergency fund', type: 'trend', options: UP_SAME_DOWN },
      { key: 'trend_investment_contributions', label: 'Investment contributions', type: 'trend', options: UP_SAME_DOWN },
    ],
  },
]
