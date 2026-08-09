<script setup>
import { computed } from 'vue'
import { OPPORTUNITY_COPY } from '../lib/theme.js'
import Icon from './Icon.vue'

const props = defineProps({
  opportunity: { type: Object, required: true }, // { key, label, gap }
})

const blurb = computed(() => OPPORTUNITY_COPY[props.opportunity.key] ?? '')
</script>

<template>
  <div
    class="rounded-2xl px-5 py-5"
    :style="{ backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-hairline)' }"
  >
    <div class="flex gap-3.5">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        :style="{ backgroundColor: 'var(--color-accent-wash)', color: 'var(--color-accent)' }"
      >
        <Icon name="lightbulb" :size="19" />
      </div>
      <div>
        <div class="text-xs font-semibold uppercase tracking-wide" :style="{ color: 'var(--color-accent)' }">
          Your biggest opportunity
        </div>
        <div class="mt-0.5 text-lg font-semibold text-[var(--color-ink-primary)]">
          {{ opportunity.label }}
        </div>
        <p class="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-secondary)]">
          {{ blurb }}
        </p>
      </div>
    </div>
  </div>
</template>
