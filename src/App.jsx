function App() {
  return (
    <div className="app">
      <header className="hero">
        <div className="logo">❤️</div>

        <h1>Googly Bank</h1>

        <p className="tagline">
          Good things you've earned.
          <br />
          Good things you're owed.
        </p>
      </header>

      <section className="card greeting">
        <h2>Good evening, Googs ❤️</h2>
        <p>You're owed some good things today.</p>
      </section>

      <section className="card">
        <h3>Available Rewards</h3>

        <div className="reward-row"><span>🤗 Hugs</span><strong>4</strong></div>
        <div className="reward-row"><span>💆 Head Massages</span><strong>2</strong></div>
        <div className="reward-row"><span>☕ Coffee in Bed</span><strong>1</strong></div>
        <div className="reward-row"><span>🦶 Foot Rubs</span><strong>1</strong></div>
      </section>

      <section className="card">
        <h3>Pending</h3>
        <div className="pending-row">⏳ 1 request awaiting approval</div>
        <div className="pending-row">🎁 2 rewards awaiting delivery</div>
      </section>

      <div className="actions">
        <button>Request Something</button>
        <button className="secondary">Redeem a Reward</button>
      </div>

      <nav className="bottom-nav">
        <span>🏠 Home</span>
        <span>❤️ Bank</span>
        <span>📜 History</span>
      </nav>
    </div>
  )
}

export default App
