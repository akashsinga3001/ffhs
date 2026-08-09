<script setup>
import { computed } from 'vue'

const props = defineProps({
  field: { type: Object, required: true },
  invalid: { type: Boolean, default: false },
})

const model = defineModel()

const ringStyle = computed(() => ({
  border: `1px solid ${props.invalid ? 'var(--color-status-critical)' : 'var(--color-hairline)'}`,
  backgroundColor: 'var(--color-surface-2)',
}))

function toggleMultiselect(value) {
  const current = model.value ?? []
  model.value = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}
</script>

<template>
  <div>
    <label class="block text-sm font-medium mb-1.5 text-[var(--color-ink-primary)]">
      {{ field.label }}
      <span v-if="field.required" style="color: var(--color-status-critical)">*</span>
    </label>

    <!-- currency -->
    <div v-if="field.type === 'currency'" class="relative">
      <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] text-sm">₹</span>
      <input
        type="number"
        min="0"
        inputmode="decimal"
        class="w-full rounded-xl pl-7 pr-3.5 py-2.5 text-sm bg-transparent outline-none transition-colors focus:border-[var(--color-accent)]"
        :style="ringStyle"
        v-model.number="model"
      />
    </div>

    <!-- integer -->
    <input
      v-else-if="field.type === 'integer'"
      type="number"
      :min="field.min ?? 0"
      step="1"
      class="w-full rounded-xl px-3.5 py-2.5 text-sm bg-transparent outline-none transition-colors focus:border-[var(--color-accent)]"
      :style="ringStyle"
      v-model.number="model"
    />

    <!-- select -->
    <select
      v-else-if="field.type === 'select'"
      class="w-full rounded-xl px-3.5 py-2.5 text-sm bg-transparent outline-none transition-colors focus:border-[var(--color-accent)]"
      :style="ringStyle"
      v-model="model"
    >
      <option value="" disabled>Select…</option>
      <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>

    <!-- boolean -->
    <div class="inline-flex rounded-xl overflow-hidden p-1" v-else-if="field.type === 'boolean'" :style="{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-hairline)' }">
      <button
        type="button"
        class="px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
        :style="{
          backgroundColor: model === true ? 'var(--color-ink-primary)' : 'transparent',
          color: model === true ? 'var(--color-inverted-text)' : 'var(--color-ink-secondary)',
        }"
        @click="model = true"
      >
        Yes
      </button>
      <button
        type="button"
        class="px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
        :style="{
          backgroundColor: model === false ? 'var(--color-ink-primary)' : 'transparent',
          color: model === false ? 'var(--color-inverted-text)' : 'var(--color-ink-secondary)',
        }"
        @click="model = false"
      >
        No
      </button>
    </div>

    <!-- multiselect -->
    <div v-else-if="field.type === 'multiselect'" class="flex flex-wrap gap-2">
      <button
        v-for="opt in field.options"
        :key="opt.value"
        type="button"
        class="rounded-full px-3.5 py-1.5 text-sm transition-all"
        :style="{
          border: `1px solid ${(model ?? []).includes(opt.value) ? 'var(--color-accent)' : 'var(--color-hairline)'}`,
          backgroundColor: (model ?? []).includes(opt.value) ? 'var(--color-accent-wash)' : 'var(--color-surface-2)',
          color: (model ?? []).includes(opt.value) ? 'var(--color-accent)' : 'var(--color-ink-secondary)',
        }"
        @click="toggleMultiselect(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- trend -->
    <div class="inline-flex rounded-xl overflow-hidden p-1" v-else-if="field.type === 'trend'" :style="{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-hairline)' }">
      <button
        v-for="opt in field.options"
        :key="opt.value"
        type="button"
        class="px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all"
        :style="{
          backgroundColor: model === opt.value ? 'var(--color-ink-primary)' : 'transparent',
          color: model === opt.value ? 'var(--color-inverted-text)' : 'var(--color-ink-secondary)',
        }"
        @click="model = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>
