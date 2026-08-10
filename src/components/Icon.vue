<script setup>
import { computed } from 'vue'
import {
  Home,
  Wallet,
  Receipt,
  Droplet,
  CreditCard,
  TrendingUp,
  Shield,
  ShieldCheck,
  Clock,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  Users,
  Info,
} from '@lucide/vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  strokeWidth: { type: [Number, String], default: 1.75 },
})

const COMPONENTS = {
  home: Home,
  wallet: Wallet,
  receipt: Receipt,
  droplet: Droplet,
  'credit-card': CreditCard,
  'trending-up': TrendingUp,
  shield: Shield,
  'shield-check': ShieldCheck,
  clock: Clock,
  lightbulb: Lightbulb,
  'chevron-right': ChevronRight,
  'chevron-left': ChevronLeft,
  users: Users,
  info: Info,
}

const component = computed(() => COMPONENTS[props.name])
</script>

<template>
  <component :is="component" v-if="component" :size="size" :stroke-width="strokeWidth" />
</template>
