<script setup>
import Icon from './Icon.vue'

const emit = defineEmits(['start'])

const OUTPUTS = [
  { icon: 'shield-check', title: 'Financial Health', question: 'Where am I?', desc: 'A 0–1000 score across five pillars of your financial life.' },
  { icon: 'trending-up', title: 'Financial Momentum', question: 'Am I getting better?', desc: 'Whether your trajectory over the last year is improving or slipping.' },
  { icon: 'wallet', title: 'Financial Efficiency', question: 'Am I converting income into wealth?', desc: 'How much of what you earn actually turns into savings and debt paydown.' },
  { icon: 'clock', title: 'Financial Freedom', question: 'How close am I to optional work?', desc: 'How much of your expenses passive income could already cover.' },
]

const PRIVACY_STEPS = [
  { title: 'You answer in your browser', desc: 'Your numbers are typed locally — nothing is sent as you go.' },
  { title: 'The score is calculated instantly', desc: 'All scoring logic runs on your device, not a server.' },
  { title: 'Nothing is stored', desc: 'Close the tab and it’s gone. There is no account and no database.' },
]

const PREVIEW_PILLARS = [
  { label: 'Cash Flow', pct: 90 },
  { label: 'Liquidity', pct: 91 },
  { label: 'Debt', pct: 76 },
  { label: 'Wealth', pct: 84 },
  { label: 'Risk', pct: 46 },
]
</script>

<template>
  <div>
    <!-- hero -->
    <div class="px-6 pt-14 pb-16 sm:pt-20 sm:pb-24">
      <div class="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <!-- left: the letter -->
        <div>
          <div
            class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium mb-7"
            :style="{ backgroundColor: 'var(--color-accent-wash)', color: 'var(--color-accent)' }"
          >
            A tool built out of obsession, not a product roadmap
          </div>

          <h1
            class="text-[2.75rem] sm:text-6xl leading-[1.05] tracking-tight text-[var(--color-ink-primary)]"
            style="font-family: var(--font-serif); font-weight: 480"
          >
            I couldn't answer one question about my own family's money.
          </h1>

          <p class="mt-6 text-lg leading-relaxed text-[var(--color-ink-secondary)]">
            Not <em>"are we broke."</em> Not <em>"are we rich."</em> Just —
            <strong class="text-[var(--color-ink-primary)] font-semibold">are we okay?</strong>
            Every spreadsheet I built collapsed under its own complexity. Every "financial
            wellness" app wanted my bank login before it would even try to answer. So I built
            the thing I actually wanted: a real score, in about five minutes, that never once
            leaves your browser.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="group inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              :style="{ backgroundColor: 'var(--color-ink-primary)', color: 'var(--color-inverted-text)', boxShadow: 'var(--shadow-sm)' }"
              @click="emit('start')"
            >
              Get your score
              <Icon name="chevron-right" :size="16" class="transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <span class="text-sm text-[var(--color-ink-muted)]">Free. No account. Nothing stored.</span>
          </div>
        </div>

        <!-- right: a concrete preview of the payoff -->
        <div class="relative">
          <div
            class="rounded-2xl p-6"
            :style="{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-hairline)', boxShadow: 'var(--shadow-lg)' }"
          >
            <div class="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">An example score</div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-6xl tracking-tight text-[var(--color-ink-primary)]" style="font-family: var(--font-serif); font-weight: 520">782</span>
              <span class="text-base text-[var(--color-ink-muted)]">/ 1000</span>
            </div>
            <span
              class="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              :style="{ backgroundColor: `color-mix(in srgb, var(--color-status-good) 14%, transparent)`, color: 'var(--color-status-good)' }"
            >
              <span class="h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: 'var(--color-status-good)' }" />
              Healthy
            </span>

            <div class="mt-5 space-y-3">
              <div v-for="p in PREVIEW_PILLARS" :key="p.label">
                <div class="flex items-center justify-between mb-1 text-xs">
                  <span class="text-[var(--color-ink-secondary)]">{{ p.label }}</span>
                  <span class="text-[var(--color-ink-muted)] tabular-nums">{{ p.pct }}%</span>
                </div>
                <div class="h-1.5 rounded-full overflow-hidden" :style="{ backgroundColor: 'var(--color-track)' }">
                  <div
                    class="h-full rounded-full"
                    :style="{
                      width: p.pct + '%',
                      backgroundColor: p.pct >= 80 ? 'var(--color-status-good)' : p.pct >= 60 ? 'var(--color-status-warning)' : 'var(--color-status-serious)',
                    }"
                  />
                </div>
              </div>
            </div>

            <div class="mt-5 rounded-lg px-3 py-2.5 text-xs leading-relaxed" :style="{ backgroundColor: 'var(--color-accent-wash)', color: 'var(--color-accent)' }">
              Biggest opportunity: <strong>Risk Management</strong> — protection is lagging behind everything else.
            </div>
          </div>
          <p class="mt-3 text-center text-xs text-[var(--color-ink-muted)]">Illustrative — yours will look different.</p>
        </div>
      </div>
    </div>

    <!-- founder note -->
    <div class="px-6 py-16" :style="{ backgroundColor: 'var(--color-surface-2)', borderTop: '1px solid var(--color-hairline)', borderBottom: '1px solid var(--color-hairline)' }">
      <div class="mx-auto max-w-2xl">
        <p
          class="text-2xl sm:text-3xl leading-snug text-[var(--color-ink-primary)]"
          style="font-family: var(--font-serif); font-weight: 440; font-style: italic"
        >
          "Money stress doesn't announce itself with a number. It shows up as tension at dinner,
          as a fight about nothing, as a 2am scroll through your balance you don't remember opening."
        </p>
        <p class="mt-6 text-base leading-relaxed text-[var(--color-ink-secondary)]">
          I didn't want another budgeting app to guilt me about coffee. I wanted a rating —
          like a credit score, but for the whole picture: cash flow, liquidity, debt, the wealth
          we're actually building, and how protected we are if something goes wrong. Five pillars,
          one honest number, and the single biggest thing to fix next.
        </p>
        <p class="mt-4 text-base leading-relaxed text-[var(--color-ink-secondary)]">
          It's free because I don't want your money — I built this to answer a question for my
          own family, and it turned out other families were asking the same one.
        </p>
      </div>
    </div>

    <!-- four core outputs -->
    <div id="outputs" class="px-6 py-16 scroll-mt-16">
      <div class="mx-auto max-w-4xl">
        <div class="mb-10">
          <h2 class="text-2xl sm:text-3xl text-[var(--color-ink-primary)]" style="font-family: var(--font-serif); font-weight: 480">
            Four questions. One picture.
          </h2>
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
    <div class="px-6 py-16" :style="{ backgroundColor: 'var(--color-surface-2)', borderTop: '1px solid var(--color-hairline)', borderBottom: '1px solid var(--color-hairline)' }">
      <div class="mx-auto max-w-3xl">
        <div class="mb-10">
          <h2 class="text-2xl sm:text-3xl text-[var(--color-ink-primary)]" style="font-family: var(--font-serif); font-weight: 480">
            Nothing leaves your browser.
          </h2>
          <p class="mt-2 text-sm text-[var(--color-ink-secondary)]">I built it stateless on purpose — this is money, not a to-do list.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-for="(s, i) in PRIVACY_STEPS" :key="s.title" class="relative px-2">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
              :style="{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-hairline)', color: 'var(--color-accent)' }"
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
    <footer id="disclosures" class="px-6 py-12 scroll-mt-16">
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
