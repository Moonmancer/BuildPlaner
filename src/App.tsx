import './App.css'
import { StoreProvider } from './store'
import { ConfirmProvider } from './components/ConfirmDialog'
import { BuildList } from './components/BuildList'
import { BuildDetail } from './components/BuildDetail'
import { ShareImport } from './components/ShareImport'
import { ExportReminder } from './components/ExportReminder'

function App() {
  return (
    <StoreProvider>
      <ConfirmProvider>
        <ShareImport />
        <div className="app">
        <header className="app-header">
          <h1>BuildPlaner</h1>
          <span className="badge">Pre-Renewal</span>
          <span className="tagline">Ragnarok Online · Stats &amp; Skills</span>
        </header>

        <ExportReminder />

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
