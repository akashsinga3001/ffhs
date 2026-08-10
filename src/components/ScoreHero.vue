<script setup>
import { computed, toRef } from 'vue'
import { severityFromRating } from '../lib/theme.js'
import { useCountUp } from '../composables/useCountUp.js'

const props = defineProps({
  score: { type: Number, required: true },
  rating: { type: String, required: true },
})

const severity = computed(() => severityFromRating(props.rating))
const animatedScore = useCountUp(toRef(props, 'score'))

const R = 86
const CIRCUMFERENCE = 2 * Math.PI * R
const dashoffset = computed(() => CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, animatedScore.value / 1000))))
</script>

<template>
  <div class="relative flex flex-col items-center text-center">
    <div class="relative h-52 w-52">
      <svg viewBox="0 0 200 200" class="h-full w-full -rotate-90">
        <circle cx="100" cy="100" :r="R" fill="none" :stroke="'var(--color-track)'" stroke-width="14" />
        <circle
          cx="100"
          cy="100"
          :r="R"
          fill="none"
          :stroke="`var(--color-status-${severity})`"
          stroke-width="14"
          stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="dashoffset"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span
          class="text-7xl tabular-nums tracking-tight text-[var(--color-ink-primary)]"
          style="font-family: var(--font-serif); font-weight: 520"
        >
          {{ Math.round(animatedScore) }}
        </span>
        <span class="text-sm text-[var(--color-ink-muted)]">/ 1000</span>
      </div>
    </div>

    <span
      class="mt-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium"
      :style="{
        color: `var(--color-status-${severity})`,
        backgroundColor: `color-mix(in srgb, var(--color-status-${severity}) 14%, transparent)`,
      }"
    >
      <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: `var(--color-status-${severity})` }" />
      {{ rating }}
    </span>
  </div>
</template>
