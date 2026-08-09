<script setup>
import { reactive, ref, computed } from 'vue'
import { STEPS } from '../lib/questionnaireSchema.js'
import { createDefaultFormData } from '../lib/defaultFormData.js'
import FormField from './form/FormField.vue'
import DebtBreakdownField from './form/DebtBreakdownField.vue'
import AllocationField from './form/AllocationField.vue'
import Icon from './Icon.vue'

const emit = defineEmits(['complete', 'exit'])

const STEP_ICON = {
  household: 'home',
  income: 'wallet',
  expenses: 'receipt',
  liquidity: 'droplet',
  debt: 'credit-card',
  wealth: 'trending-up',
  protection: 'shield',
  momentum: 'clock',
}

const formData = reactive(createDefaultFormData())
const stepIndex = ref(0)
const attemptedNext = ref(false)

const step = computed(() => STEPS[stepIndex.value])
const isFirst = computed(() => stepIndex.value === 0)
const isLast = computed(() => stepIndex.value === STEPS.length - 1)

function isFieldValid(field) {
  if (!field.required) return true
  const value = formData[field.key]
  if (field.type === 'multiselect') return Array.isArray(value) && value.length > 0
  if (field.type === 'currency' || field.type === 'integer') {
    return value !== null && value !== undefined && value !== '' && !Number.isNaN(value) && value >= 0
  }
  if (field.type === 'select') return !!value
  return true
}

const stepIsValid = computed(() => {
  let ok = step.value.fields.every(isFieldValid)
  if (step.value.id === 'expenses') {
    ok = ok && formData.total_monthly_expenses >= formData.essential_monthly_expenses
  }
  return ok
})

function next() {
  if (!stepIsValid.value) {
    attemptedNext.value = true
    return
  }
  attemptedNext.value = false
  if (isLast.value) {
    emit('complete', formData)
  } else {
    stepIndex.value++
  }
}

function back() {
  attemptedNext.value = false
  if (isFirst.value) {
    emit('exit')
  } else {
    stepIndex.value--
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl px-6 py-12">
    <!-- progress -->
    <div class="flex gap-1.5 mb-8">
      <div v-for="(s, i) in STEPS" :key="s.id" class="h-1 flex-1 rounded-full overflow-hidden" :style="{ backgroundColor: 'var(--color-track)' }">
        <div
          class="h-full rounded-full transition-transform duration-500 ease-out origin-left"
          :style="{ backgroundColor: 'var(--color-accent)', transform: `scaleX(${i <= stepIndex ? 1 : 0})` }"
        />
      </div>
    </div>

    <div
      class="rounded-2xl p-7 sm:p-9"
      :style="{ backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-hairline)' }"
    >
      <div :key="step.id" class="step-enter">
        <div class="mb-7 flex items-start gap-3.5">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            :style="{ backgroundColor: 'var(--color-accent-wash)', color: 'var(--color-accent)' }"
          >
            <Icon :name="STEP_ICON[step.id]" :size="19" />
          </div>
          <div>
            <div class="text-xs font-medium tracking-wide text-[var(--color-ink-muted)]">
              STEP {{ stepIndex + 1 }} OF {{ STEPS.length }}
            </div>
            <h1 class="text-xl font-semibold text-[var(--color-ink-primary)] leading-tight">{{ step.title }}</h1>
          </div>
        </div>
        <p class="-mt-4 mb-6 text-sm text-[var(--color-ink-secondary)]">{{ step.subtitle }}</p>

        <div class="space-y-5">
          <DebtBreakdownField
            v-if="step.bespoke === 'debt'"
            v-model:breakdown="formData.debt_breakdown"
            v-model:override="formData.blended_interest_rate_override"
          />

          <template v-for="field in step.fields" :key="field.key">
            <div v-if="field.key === 'life_insurance_cover' && !formData.has_financial_dependents">
              <label class="block text-sm font-medium mb-1.5 text-[var(--color-ink-primary)]">{{ field.label }}</label>
              <p
                class="text-sm rounded-lg px-3 py-2"
                :style="{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-ink-muted)', border: '1px solid var(--color-hairline)' }"
              >
                Not scored — you told us no one financially depends on your income.
              </p>
            </div>
            <FormField v-else :field="field" :invalid="attemptedNext && !isFieldValid(field)" v-model="formData[field.key]" />
          </template>

          <AllocationField v-if="step.bespoke === 'wealth'" v-model="formData.asset_allocation" />
        </div>

        <p v-if="attemptedNext && !stepIsValid" class="mt-4 text-sm" :style="{ color: 'var(--color-status-critical)' }">
          Please fill in the required fields before continuing.
        </p>
      </div>
    </div>

    <div class="mt-6 flex items-center justify-between">
      <button
        type="button"
        class="px-4 py-2.5 text-sm font-medium rounded-lg text-[var(--color-ink-secondary)] transition-colors hover:bg-[var(--color-surface-2)]"
        @click="back"
      >
        Back
      </button>
      <button
        type="button"
        class="group inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
        :style="{ backgroundColor: 'var(--color-ink-primary)', color: 'var(--color-inverted-text)', boxShadow: 'var(--shadow-sm)' }"
        @click="next"
      >
        {{ isLast ? 'Calculate My Score' : 'Next' }}
        <Icon name="chevron-right" :size="15" class="transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.step-enter {
  animation: step-enter-anim 0.22s ease both;
}
@keyframes step-enter-anim {
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .step-enter {
    animation: none;
  }
}
</style>
