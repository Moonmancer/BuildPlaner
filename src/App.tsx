import './App.css'

const roadmap = [
  { phase: 'Phase 1', title: 'Gerüst & Hosting', status: 'done' },
  { phase: 'Phase 2', title: 'Builds & Milestones (localStorage)', status: 'next' },
  { phase: 'Phase 3', title: 'Pre-Renewal Stats & Skill-Bäume', status: 'todo' },
  { phase: 'Phase 4', title: 'XML Export / Import', status: 'todo' },
  { phase: 'Phase 5', title: 'Import aus Calculator-URLs', status: 'todo' },
] as const

function App() {
  return (
    <main className="page">
      <header className="hero">
        <h1>BuildPlaner</h1>
        <p className="subtitle">
          Stats &amp; Skills für Ragnarok&nbsp;Online planen und verwalten
          <span className="badge">Pre-Renewal</span>
        </p>
      </header>

      <section className="roadmap">
        <h2>Roadmap</h2>
        <ul>
          {roadmap.map((r) => (
            <li key={r.phase} className={`item ${r.status}`}>
              <span className="dot" aria-hidden="true" />
              <span className="phase">{r.phase}</span>
              <span className="title">{r.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="foot">
        Phase 1 steht – die Seite ist live. Der Planer selbst folgt in Phase&nbsp;2.
      </footer>
    </main>
  )
}

export default App
