<script setup>
import Icon from './Icon.vue'

const emit = defineEmits(['start'])

const PILLARS = [
  { icon: 'wallet', label: 'Cash Flow' },
  { icon: 'droplet', label: 'Liquidity' },
  { icon: 'credit-card', label: 'Debt' },
  { icon: 'trending-up', label: 'Wealth' },
  { icon: 'shield', label: 'Risk' },
]

const OUTPUTS = [
  { icon: 'shield-check', title: 'Financial Health', question: 'Where am I?', desc: 'A 0–1000 score across five pillars of your financial life.' },
  { icon: 'trending-up', title: 'Financial Momentum', question: 'Am I getting better?', desc: 'Whether your trajectory over the last year is improving or slipping.' },
  { icon: 'wallet', title: 'Financial Efficiency', question: 'Am I converting income into wealth?', desc: 'How much of what you earn actually turns into savings and debt paydown.' },
  { icon: 'clock', title: 'Financial Freedom', question: 'How close am I to optional work?', desc: 'How much of your expenses passive income could already cover.' },
]

const PRIVACY_STEPS = [
  { icon: 'users', title: 'You answer in your browser', desc: 'Your numbers are typed locally — nothing is sent as you go.' },
  { icon: 'wallet', title: 'The score is calculated instantly', desc: 'All scoring logic runs on your device, not a server.' },
  { icon: 'shield-check', title: 'Nothing is stored', desc: 'Close the tab and it’s gone. There is no account and no database.' },
]
</script>

<template>
  <div>
    <!-- hero -->
    <div class="px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div class="mx-auto max-w-xl text-center">
        <div
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium mb-6"
          :style="{ backgroundColor: 'var(--color-accent-wash)', color: 'var(--color-accent)' }"
        >
          <Icon name="shield-check" :size="13" />
          Family Financial Health Score
        </div>

        <h1 class="text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight text-[var(--color-ink-primary)]">
          How financially healthy is your family?
        </h1>

        <p class="mt-5 text-lg leading-relaxed text-[var(--color-ink-secondary)]">
          Get your Family Financial Health Score — a 0–1000 rating based on cash flow,
          liquidity, debt, wealth creation and risk management.
        </p>

        <div
          class="mt-6 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium"
          :style="{ backgroundColor: `color-mix(in srgb, var(--color-status-good) 12%, transparent)`, color: 'var(--color-status-good)' }"
        >
          <Icon name="shield-check" :size="15" />
          Free. No account. No financial data stored.
        </div>

        <div>
          <button
            type="button"
            class="group mt-9 inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            :style="{ backgroundColor: 'var(--color-ink-primary)', color: 'var(--color-inverted-text)', boxShadow: 'var(--shadow-sm)' }"
            @click="emit('start')"
          >
            Calculate My FFHS
            <Icon name="chevron-right" :size="16" class="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>

        <div class="mt-12 flex flex-wrap items-center justify-center gap-2.5">
          <div
            v-for="p in PILLARS"
            :key="p.label"
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            :style="{ border: '1px solid var(--color-hairline)', color: 'var(--color-ink-secondary)' }"
          >
            <Icon :name="p.icon" :size="13" />
            {{ p.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- four core outputs -->
    <div id="outputs" class="px-6 py-16 scroll-mt-16" :style="{ backgroundColor: 'var(--color-surface-2)', borderTop: '1px solid var(--color-hairline)', borderBottom: '1px solid var(--color-hairline)' }">
      <div class="mx-auto max-w-4xl">
        <div class="text-center mb-10">
          <h2 class="text-2xl font-semibold text-[var(--color-ink-primary)]">Four questions. One picture.</h2>
          <p class="mt-2 text-sm text-[var(--color-ink-secondary)]">
            FFHS isn't a single number — it separates where you are from where you're headed.
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="o in OUTPUTS"
            :key="o.title"
            class="rounded-2xl p-5"
            :style="{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-hairline)', boxShadow: 'var(--shadow-sm)' }"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                :style="{ backgroundColor: 'var(--color-accent-wash)', color: 'var(--color-accent)' }"
              >
                <Icon :name="o.icon" :size="17" />
              </div>
              <div>
                <div class="text-sm font-semibold text-[var(--color-ink-primary)]">{{ o.title }}</div>
                <div class="text-xs text-[var(--color-ink-muted)]">{{ o.question }}</div>
              </div>
            </div>
            <p class="mt-3 text-sm leading-relaxed text-[var(--color-ink-secondary)]">{{ o.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- privacy flow -->
    <div class="px-6 py-16">
      <div class="mx-auto max-w-3xl">
        <div class="text-center mb-10">
          <h2 class="text-2xl font-semibold text-[var(--color-ink-primary)]">Nothing leaves your browser</h2>
          <p class="mt-2 text-sm text-[var(--color-ink-secondary)]">FFHS was built stateless on purpose.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-for="(s, i) in PRIVACY_STEPS" :key="s.title" class="relative text-center px-2">
            <div
              class="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
              :style="{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-hairline)', color: 'var(--color-ink-secondary)' }"
            >
              {{ i + 1 }}
            </div>
            <div class="mt-3 text-sm font-semibold text-[var(--color-ink-primary)]">{{ s.title }}</div>
            <p class="mt-1 text-sm leading-relaxed text-[var(--color-ink-secondary)]">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- disclosures footer -->
    <footer id="disclosures" class="px-6 py-12 scroll-mt-16" :style="{ borderTop: '1px solid var(--color-hairline)' }">
      <div class="mx-auto max-w-3xl">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Privacy &amp; disclosures</h2>

        <p class="mt-3 text-sm leading-relaxed text-[var(--color-ink-secondary)]">
          FFHS is a free financial wellness and educational tool. It calculates a
          self-assessment score from the numbers you enter and explains general
          financial concepts. It is <strong class="text-[var(--color-ink-primary)]">not personalized investment, legal, or tax advice</strong>,
          and does not recommend buying, selling, or holding any specific security.
          FFHS is not a registered investment adviser.
        </p>

        <p class="mt-3 text-sm leading-relaxed text-[var(--color-ink-secondary)]">
          Your financial answers are processed entirely in your browser and are
          <strong class="text-[var(--color-ink-primary)]">never sent to or stored on our servers</strong> — there is no account and no
          database. Hosting and any analytics used to operate this site may still
          process limited technical information (such as page visits), but never
          your financial answers.
        </p>

        <p class="mt-6 text-xs text-[var(--color-ink-muted)]">© {{ new Date().getFullYear() }} FFHS · Family Financial Health Score</p>
      </div>
    </footer>
  </div>
</template>
