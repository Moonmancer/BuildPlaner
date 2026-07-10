import './App.css'
import { StoreProvider } from './store'
import { ConfirmProvider } from './components/ConfirmDialog'
import { BuildList } from './components/BuildList'
import { BuildDetail } from './components/BuildDetail'

function App() {
  return (
    <StoreProvider>
      <ConfirmProvider>
        <div className="app">
        <header className="app-header">
          <h1>BuildPlaner</h1>
          <span className="badge">Pre-Renewal</span>
          <span className="tagline">Ragnarok Online · Stats &amp; Skills</span>
        </header>

        <div className="layout">
          <BuildList />
          <BuildDetail />
        </div>
        </div>
      </ConfirmProvider>
    </StoreProvider>
  )
}

export default App
