<script setup>
import { computed, ref, onMounted } from 'vue'
import { severityFromPct } from '../lib/theme.js'
import Icon from './Icon.vue'

const props = defineProps({
  pillarKey: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: Number, required: true },
  max: { type: Number, required: true },
})

const ICON = {
  cashFlow: 'wallet',
  liquidity: 'droplet',
  debt: 'credit-card',
  wealth: 'trending-up',
  risk: 'shield',
}

const pct = computed(() => Math.max(0, Math.min(1, props.value / props.max)))
const severity = computed(() => severityFromPct(pct.value))

// setTimeout, not requestAnimationFrame: rAF is paused entirely for
// backgrounded/hidden tabs, which would leave the meter stuck at 0% width
// indefinitely if the result page happens to mount while unfocused.
const mounted = ref(false)
onMounted(() => setTimeout(() => (mounted.value = true), 20))
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <div
          class="flex h-7 w-7 items-center justify-center rounded-lg"
          :style="{ color: `var(--color-status-${severity})`, backgroundColor: `color-mix(in srgb, var(--color-status-${severity}) 14%, transparent)` }"
        >
          <Icon :name="ICON[pillarKey]" :size="14" />
        </div>
        <span class="text-sm font-medium text-[var(--color-ink-primary)]">{{ label }}</span>
      </div>
      <span class="text-sm tabular-nums text-[var(--color-ink-secondary)]"> {{ Math.round(value) }} / {{ max }} </span>
    </div>
    <div class="h-2.5 rounded-full overflow-hidden" :style="{ backgroundColor: 'var(--color-track)' }">
      <div
        class="h-full rounded-full transition-[width] duration-[900ms] ease-out"
        :style="{ width: (mounted ? pct * 100 : 0) + '%', backgroundColor: `var(--color-status-${severity})` }"
      />
    </div>
  </div>
</template>
