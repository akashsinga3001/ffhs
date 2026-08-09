<script setup>
import { computed } from 'vue'

const breakdown = defineModel('breakdown', { required: true })
const override = defineModel('override')

const CATEGORIES = [
  { key: 'home_loan', label: 'Home loan' },
  { key: 'vehicle_loan', label: 'Vehicle loan' },
  { key: 'education_loan', label: 'Education loan' },
  { key: 'personal_loan_and_cc_revolving', label: 'Personal loan / credit-card revolving balance' },
  { key: 'other_secured_debt', label: 'Other secured debt' },
]

const total = computed(() => Object.values(breakdown.value).reduce((a, b) => a + (b || 0), 0))
</script>

<template>
  <div>
    <label class="block text-sm font-medium mb-1.5 text-[var(--color-ink-primary)]">
      Outstanding balance by type
    </label>
    <div class="space-y-2">
      <div v-for="cat in CATEGORIES" :key="cat.key" class="flex items-center gap-3">
        <span class="flex-1 text-sm text-[var(--color-ink-secondary)]">{{ cat.label }}</span>
        <div class="relative w-40">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] text-sm">₹</span>
          <input
            type="number"
            min="0"
            class="w-full rounded-xl pl-7 pr-3.5 py-2 text-sm bg-transparent outline-none transition-colors focus:border-[var(--color-accent)]"
            :style="{ border: '1px solid var(--color-hairline)', backgroundColor: 'var(--color-surface-2)' }"
            v-model.number="breakdown[cat.key]"
          />
        </div>
      </div>
    </div>

    <div
      class="mt-3 flex items-center justify-between text-sm rounded-xl px-3.5 py-2.5"
      :style="{ backgroundColor: 'var(--color-accent-wash)' }"
    >
      <span class="text-[var(--color-ink-secondary)]">Total outstanding debt</span>
      <span class="font-semibold tabular-nums" :style="{ color: 'var(--color-accent)' }">₹{{ total.toLocaleString('en-IN') }}</span>
    </div>

    <div class="mt-4">
      <label class="block text-sm font-medium mb-1.5 text-[var(--color-ink-primary)]">
        Know your actual blended interest rate? (optional)
      </label>
      <div class="relative w-32">
        <input
          type="number"
          min="0"
          max="50"
          step="0.1"
          placeholder="e.g. 9.5"
          class="w-full rounded-xl pl-3.5 pr-7 py-2 text-sm bg-transparent outline-none transition-colors focus:border-[var(--color-accent)]"
          :style="{ border: '1px solid var(--color-hairline)', backgroundColor: 'var(--color-surface-2)' }"
          :value="override === null || override === undefined ? null : override * 100"
          @input="override = $event.target.value === '' ? null : Number($event.target.value) / 100"
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] text-sm">%</span>
      </div>
      <p class="mt-1 text-xs text-[var(--color-ink-muted)]">
        Leave blank and we'll estimate interest from typical rates per loan type.
      </p>
    </div>
  </div>
</template>
