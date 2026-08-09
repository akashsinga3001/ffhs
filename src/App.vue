<script setup>
import { ref, computed } from 'vue'
import AppHeader from './components/AppHeader.vue'
import LandingPage from './components/LandingPage.vue'
import QuestionnaireFlow from './components/QuestionnaireFlow.vue'
import ResultPage from './components/ResultPage.vue'
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
  <div class="min-h-screen" :style="{ backgroundColor: 'var(--color-page)' }">
    <AppHeader :show-nav="showNav" />
    <main>
      <LandingPage v-if="view === 'landing'" @start="view = 'questionnaire'" />
      <QuestionnaireFlow
        v-else-if="view === 'questionnaire'"
        @exit="view = 'landing'"
        @complete="handleComplete"
      />
      <ResultPage v-else-if="view === 'result'" :result="result" />
    </main>
  </div>
</template>
