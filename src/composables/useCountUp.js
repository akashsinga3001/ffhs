import { ref, watch } from 'vue'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

/** Animates a reactive number toward `targetRef`'s value whenever it changes. */
export function useCountUp(targetRef, { duration = 900 } = {}) {
  const current = ref(prefersReducedMotion() ? targetRef.value : 0)
  let frame = null
  let fallback = null

  watch(
    targetRef,
    (target, previous) => {
      if (prefersReducedMotion()) {
        current.value = target
        return
      }
      const from = previous ?? 0
      const start = performance.now()
      cancelAnimationFrame(frame)
      clearTimeout(fallback)

      function tick(now) {
        const t = Math.min(1, (now - start) / duration)
        current.value = from + (target - from) * easeOutExpo(t)
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)

      // requestAnimationFrame is paused for backgrounded/hidden tabs, which
      // would otherwise leave `current` stuck mid-animation indefinitely if
      // the tab isn't visible when this fires. setTimeout isn't throttled the
      // same way, so it guarantees the value lands on target eventually.
      fallback = setTimeout(() => {
        current.value = target
      }, duration + 100)
    },
    { immediate: true },
  )

  return current
}
