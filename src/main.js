import { createApp } from 'vue'
import { inject } from '@vercel/analytics'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/fraunces/opsz-italic.css'
import './style.css'
import App from './App.vue'

inject()
createApp(App).mount('#app')
