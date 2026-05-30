import { createApp } from 'vue'
import { createRoot } from 'react-dom/client'
import { setVeauryOptions } from 'veaury'
import App from './App.vue'
import router from './router'
import './index.css'
import { compositionRoot } from './application/CompositionRoot'
import * as Keys from './application/InjectionKeys'

// Configure veaury for React 19 compatibility
setVeauryOptions({
    react: {
        createRoot
    }
})

const app = createApp(App)

// Provide Hexagonal Ports
app.provide(Keys.IdentityRepoKey, compositionRoot.identityRepo)
app.provide(Keys.SessionRepoKey, compositionRoot.sessionRepo)
app.provide(Keys.KnownIdentityRepoKey, compositionRoot.knownIdentityRepo)
app.provide(Keys.SignalingPortKey, compositionRoot.signalingPort)
app.provide(Keys.NetworkManagerFactoryKey, compositionRoot.createNetworkManager)
app.provide(Keys.BoardActorFactoryKey, compositionRoot.getBoardActor)

app.use(router)

// Initialize identity and sessions from adapters
compositionRoot.identityRepo.getIdentity()
compositionRoot.sessionRepo.getAllGames()

app.mount('#root')
