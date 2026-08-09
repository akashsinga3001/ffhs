<script setup>
import Icon from './Icon.vue'

defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  icon: { type: String, default: null },
  tone: { type: String, default: null }, // 'good' | 'bad' | null
})
</script>

<template>
  <div
    class="rounded-xl px-4 py-3.5 transition-shadow hover:shadow-[var(--shadow-sm)]"
    :style="{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-hairline)' }"
  >
    <div class="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
      <Icon v-if="icon" :name="icon" :size="12" />
      {{ label }}
    </div>
    <div
      class="mt-1.5 text-lg font-semibold tabular-nums"
      :style="{
        color:
          tone === 'good'
            ? 'var(--color-delta-good)'
            : tone === 'bad'
              ? 'var(--color-delta-bad)'
              : 'var(--color-ink-primary)',
      }"
    >
      {{ value }}
    </div>
  </div>
</template>
