<script setup>
import Logo from './Logo.vue'

defineProps({
  showNav: { type: Boolean, default: false },
})
</script>

<template>
  <header
    class="sticky top-0 z-20 backdrop-blur-md"
    :style="{ backgroundColor: 'color-mix(in srgb, var(--color-page) 82%, transparent)', borderBottom: '1px solid var(--color-hairline)' }"
  >
    <div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
      <div class="flex items-center gap-2">
        <Logo :size="26" />
        <span class="text-sm font-semibold tracking-tight text-[var(--color-ink-primary)]">FFHS</span>
      </div>

      <nav v-if="showNav" class="flex items-center gap-5 text-sm text-[var(--color-ink-secondary)]">
        <a href="#outputs" class="hidden sm:inline hover:text-[var(--color-ink-primary)] transition-colors">How it works</a>
        <a href="#disclosures" class="hidden sm:inline hover:text-[var(--color-ink-primary)] transition-colors">Privacy &amp; disclosures</a>
      </nav>
    </div>
  </header>
</template>
