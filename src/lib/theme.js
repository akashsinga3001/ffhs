// Maps score percentages / ratings to the fixed status palette.
// Status colors are reserved for severity — never reused as categorical identity.

export function severityFromPct(pct) {
  if (pct >= 0.8) return 'good'
  if (pct >= 0.6) return 'warning'
  if (pct >= 0.4) return 'serious'
  return 'critical'
}

const RATING_SEVERITY = {
  Exceptional: 'good',
  Excellent: 'good',
  Healthy: 'good',
  Stable: 'warning',
  Warning: 'warning',
  'High Risk': 'critical',
}

export function severityFromRating(rating) {
  return RATING_SEVERITY[rating] ?? 'warning'
}

export const OPPORTUNITY_COPY = {
  cashFlow:
    'Your surplus and savings rate have room to grow — small, sustained changes to spending or income compound quickly here.',
  liquidity:
    'Your cash buffer is thinner than it should be — redirecting existing savings toward an emergency fund is the fastest lever you have.',
  debt:
    "Debt is weighing on your score — it's the slowest pillar to move, but reducing high-cost balances first will have the biggest effect.",
  wealth:
    'Less of your income is being actively deployed into productive assets than it could be — even a small increase in regular investing compounds over time.',
  risk:
    'Your current financial position is strong, but protection is lagging behind your cash-flow and wealth-building strength. Closing this gap is fast and high-leverage.',
}
