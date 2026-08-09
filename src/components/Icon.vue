<script setup>
// Small hand-drawn line-icon set — no external icon library / network dependency,
// consistent with the app's zero-third-party-requests privacy stance.
const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})

const PATHS = {
  home: ['M4 11.5 12 4l8 7.5', 'M6.5 10v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-9'],
  wallet: ['M3 7.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z', 'M3 11.5h18', 'M16.75 15.25h.01'],
  receipt: ['M6 3h9l3 3v15H6z', 'M9.5 9h5', 'M9.5 13h5', 'M9.5 17h3'],
  droplet: ['M12 3c4 5 6.5 8.4 6.5 11.5A6.5 6.5 0 1 1 5.5 14.5C5.5 11.4 8 8 12 3Z'],
  'credit-card': ['M3 6.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11Z', 'M3 10.5h18', 'M6.5 15h4'],
  'trending-up': ['M4 16 10 10l4 4 6-8', 'M15 6h5v5'],
  shield: ['M12 3.5 19 6.5v5c0 5-3 8.2-7 9.5-4-1.3-7-4.5-7-9.5v-5Z'],
  'shield-check': ['M12 3.5 19 6.5v5c0 5-3 8.2-7 9.5-4-1.3-7-4.5-7-9.5v-5Z', 'M9 12l2 2 4-4'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7.5V12l3 2'],
  lightbulb: ['M9 18.5h6', 'M10 21.5h4', 'M12 3a6 6 0 0 0-3.5 10.9c.6.42.9 1.02.9 1.6h5.2c0-.58.3-1.18.9-1.6A6 6 0 0 0 12 3Z'],
  'chevron-right': ['M9 6l6 6-6 6'],
  'chevron-left': ['M15 6l-6 6 6 6'],
  users: ['M8.5 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M2.75 19a5.75 5.75 0 0 1 11.5 0', 'M15.5 5a3 3 0 0 1 0 5.9', 'M17 13.3a5.75 5.75 0 0 1 4.25 5.7'],
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke-width="strokeWidth"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path v-for="(d, i) in PATHS[name] ?? []" :key="i" :d="d" />
  </svg>
</template>
