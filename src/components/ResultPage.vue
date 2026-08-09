<script setup>
import { computed } from 'vue'
import ScoreHero from './ScoreHero.vue'
import PillarMeter from './PillarMeter.vue'
import CoreOutputStat from './CoreOutputStat.vue'
import OpportunityCallout from './OpportunityCallout.vue'
import { PILLAR_LABEL } from '../lib/scoring.js'

const props = defineProps({
  result: { type: Object, required: true },
})

const PILLAR_ORDER = ['cashFlow', 'liquidity', 'debt', 'wealth', 'risk']

const pillarRows = computed(() =>
  PILLAR_ORDER.map((key) => ({
    key,
    label: PILLAR_LABEL[key],
    value: props.result.pillars[key].total,
    max: props.result.pillars[key].max,
  })),
)

const momentumTone = computed(() => {
  const avg = props.result.momentum.avg
  if (avg >= 0.2) return 'good'
  if (avg <= -0.2) return 'bad'
  return null
})
</script>

<template>
  <div class="mx-auto max-w-xl px-6 py-12">
    <div class="motion-fade-up" style="animation-delay: 0ms">
      <ScoreHero :score="result.score" :rating="result.rating" />
    </div>

    <div
      class="motion-fade-up mt-8 rounded-2xl p-6 sm:p-7 space-y-5"
      style="animation-delay: 90ms"
      :style="{ backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-hairline)' }"
    >
      <PillarMeter v-for="p in pillarRows" :key="p.key" :pillar-key="p.key" :label="p.label" :value="p.value" :max="p.max" />
    </div>

    <div class="motion-fade-up mt-8" style="animation-delay: 160ms">
      <div class="mb-3 text-xs font-medium tracking-wide text-[var(--color-ink-muted)]">CORE OUTPUTS</div>
      <div class="grid grid-cols-3 gap-3">
        <CoreOutputStat label="Momentum" icon="trending-up" :value="result.momentum.rating" :tone="momentumTone" />
        <CoreOutputStat label="Efficiency" icon="wallet" :value="Math.round(result.efficiency * 100) + '%'" />
        <CoreOutputStat
          label="Freedom"
          icon="shield-check"
          :value="Math.round(result.freedom * 100) + '%'"
          :tone="result.freedom >= 1 ? 'good' : null"
        />
      </div>
    </div>

    <div class="motion-fade-up mt-6" style="animation-delay: 230ms">
      <OpportunityCallout :opportunity="result.biggestOpportunity" />
    </div>

    <p class="motion-fade-up mt-8 text-center text-xs leading-relaxed text-[var(--color-ink-muted)]" style="animation-delay: 280ms">
      This is an educational self-assessment, not personalized financial, investment,
      legal, or tax advice. Nothing on this page is a recommendation to buy, sell, or
      hold any security.
    </p>
  </div>
</template>

<style scoped>
.motion-fade-up {
  animation: fade-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
