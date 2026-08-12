import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'

export async function renderLanding() {
  const app = createSSRApp(App)
  return await renderToString(app)
}
