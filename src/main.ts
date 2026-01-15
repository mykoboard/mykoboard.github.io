import { createApp } from 'vue'
import { createRoot } from 'react-dom/client'
import { setVeauryOptions } from 'veaury'
import App from './App.vue'
import router from './router'
import './index.css'

// Configure veaury for React 19 compatibility
setVeauryOptions({
    react: {
        createRoot
    }
})

const app = createApp(App)
app.use(router)
app.mount('#root')
