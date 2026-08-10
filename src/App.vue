<script setup>
import { ref, computed } from 'vue'
import AppHeader from './components/AppHeader.vue'
import LandingPage from './components/LandingPage.vue'
import QuestionnaireFlow from './components/QuestionnaireFlow.vue'
import ResultPage from './components/ResultPage.vue'
import Icon from './components/Icon.vue'
import { computeFFHS } from './lib/scoring.js'

const view = ref('landing') // 'landing' | 'questionnaire' | 'result'
const result = ref(null)
const showNav = computed(() => view.value === 'landing')

function handleComplete(formData) {
  result.value = computeFFHS(formData)
  view.value = 'result'
}
</script>

<template>
  <div class="flex min-h-screen flex-col" :style="{ backgroundColor: 'var(--color-page)' }">
    <AppHeader :show-nav="showNav" />
    <main class="flex-1">
      <LandingPage v-if="view === 'landing'" @start="view = 'questionnaire'" />
      <QuestionnaireFlow
        v-else-if="view === 'questionnaire'"
        @exit="view = 'landing'"
        @complete="handleComplete"
      />
      <ResultPage v-else-if="view === 'result'" :result="result" />
    </main>

    <footer
      v-if="view !== 'landing'"
      :style="{ borderTop: '1px solid var(--color-hairline)', backgroundColor: 'var(--color-surface-2)' }"
    >
      <div class="mx-auto flex max-w-4xl items-start gap-2 px-6 py-3 text-xs leading-relaxed text-[var(--color-ink-muted)]">
        <Icon name="info" :size="14" class="mt-0.5 shrink-0" />
        <p>
          FFHS is an educational self-assessment tool, not personalized financial, investment,
          legal, or tax advice — it does not recommend buying, selling, or holding any security,
          and is not a registered investment adviser. Everything is calculated in your browser;
          nothing you enter is sent to or stored on our servers.
        </p>
      </div>
    </footer>
  </div>
</template>
