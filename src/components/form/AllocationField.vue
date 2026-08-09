<script setup>
import { computed } from 'vue'

const allocation = defineModel({ required: true })

const CATEGORIES = [
  { key: 'equity_pct', label: 'Equity / mutual funds' },
  { key: 'debt_pct', label: 'Debt / bonds / FDs' },
  { key: 'gold_pct', label: 'Gold' },
  { key: 'real_estate_pct', label: 'Investment real estate' },
]

const total = computed(() => Object.values(allocation.value).reduce((a, b) => a + (b || 0), 0))
</script>

<template>
  <div>
    <label class="block text-sm font-medium mb-1.5 text-[var(--color-ink-primary)]">
      How is it split? (% of your total investments)
    </label>
    <div class="space-y-2">
      <div v-for="cat in CATEGORIES" :key="cat.key" class="flex items-center gap-3">
        <span class="flex-1 text-sm text-[var(--color-ink-secondary)]">{{ cat.label }}</span>
        <div class="relative w-24">
          <input
            type="number"
            min="0"
            max="100"
            class="w-full rounded-xl pl-3.5 pr-7 py-2 text-sm bg-transparent outline-none transition-colors focus:border-[var(--color-accent)]"
            :style="{ border: '1px solid var(--color-hairline)', backgroundColor: 'var(--color-surface-2)' }"
            v-model.number="allocation[cat.key]"
          />
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] text-sm">%</span>
        </div>
      </div>
    </div>
    <p
      class="mt-2 text-xs"
      :style="{ color: total === 100 || total === 0 ? 'var(--color-ink-muted)' : 'var(--color-status-warning)' }"
    >
      Total: {{ total }}% <span v-if="total !== 100 && total !== 0">— should add up to 100%</span>
    </p>
  </div>
</template>
