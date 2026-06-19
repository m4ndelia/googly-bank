import { useState } from 'react'
import './styles.css'

const SHANE_PIN = '4522'
const ADMIN_PIN = '2205'
const APP_VERSION = 'v0.2'

const initialRewards = [
  { id: 'hugs', icon: '🤗', name: 'Hugs', balance: 4 },
  { id: 'head-massage', icon: '💆', name: 'Head Massage', balance: 2 },
  { id: 'coffee', icon: '☕', name: 'Coffee in Bed', balance: 1 },
  { id: 'foot-rub', icon: '🦶', name: 'Foot Rub', balance: 1 },
  { id: 'snuggle', icon: '🥰', name: 'Snuggle', balance: 3 },
]

const fakeEarnRequests = [
  {
    id: 1,
    rewardName: 'Hugs',
    quantity: 2,
    reason: 'Because I was adorable and made you laugh.',
  },
  {
    id: 2,
    rewardName: 'Coffee in Bed',
    quantity: 1,
    reason: 'For being very brave about Monday.',
  },
]

const fakeRedeemRequests = [
  {
    id: 1,
    rewardName: 'Foot Rub',
    quantity: 1,
    timing: 'Tonight, please',
  },
]

const fakeHistory = [
  '+2 Hugs approved',
  '-1 Coffee in Bed redeemed',
  '+1 Snuggle approved',
  '+1 Foot Rub approved',
]

function App() {
  const [pin, setPin] = useState('')
  const [userType, setUserType] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [rewards] = useState(initialRewards)

  function handleLogin(event) {
    event.preventDefault()

    if (pin === SHANE_PIN) {
      setUserType('shane')
      setActiveTab('home')
      return
    }

    if (pin === ADMIN_PIN) {
      setUserType('admin')
      setActiveTab('admin')
      return
    }

    alert('Wrong PIN, goofy.')
    setPin('')
  }

  function handleLogout() {
    setPin('')
    setUserType(null)
    setActiveTab('home')
  }

  if (!userType) {
    return (
      <main className="app login-screen">
        <section className="login-card">
          <div className="logo-bubble">💖</div>
          <h1>Googly Bank</h1>
          <p className="subtitle">Private banking for very important cuties.</p>
          <p className="version">{APP_VERSION}</p>

          <form onSubmit={handleLogin} className="pin-form">
            <label htmlFor="pin">Enter PIN</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="••••"
            />
            <button type="submit">Unlock</button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="app">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Googly Bank</p>
          <h1>{userType === 'admin' ? 'Admin Desk' : 'Hi Shane 💕'}</h1>
        </div>
        <button className="ghost-button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      {activeTab === 'home' && <Home rewards={rewards} />}
      {activeTab === 'request' && <RequestReward rewards={rewards} />}
      {activeTab === 'redeem' && <RedeemReward rewards={rewards} />}
      {activeTab === 'history' && <History />}
      {activeTab === 'admin' && <AdminDesk />}

      <nav className="bottom-nav">
        <button
          className={activeTab === 'home' ? 'active' : ''}
          onClick={() => setActiveTab('home')}
        >
          Home
        </button>

        {userType === 'shane' && (
          <>
            <button
              className={activeTab === 'request' ? 'active' : ''}
              onClick={() => setActiveTab('request')}
            >
              Request
            </button>
            <button
              className={activeTab === 'redeem' ? 'active' : ''}
              onClick={() => setActiveTab('redeem')}
            >
              Redeem
            </button>
          </>
        )}

        {userType === 'admin' && (
          <button
            className={activeTab === 'admin' ? 'active' : ''}
            onClick={() => setActiveTab('admin')}
          >
            Admin
          </button>
        )}

        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </nav>
    </main>
  )
}

function Home({ rewards }) {
  return (
    <section className="screen">
      <div className="balance-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Current</p>
            <h2>Rewards Balance</h2>
          </div>
          <span className="sparkle">✨</span>
        </div>

        <div className="reward-list">
          {rewards.map((reward) => (
            <div className="reward-row" key={reward.id}>
              <div className="reward-name">
                <span>{reward.icon}</span>
                <span>{reward.name}</span>
              </div>
              <strong>{reward.balance}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RequestReward({ rewards }) {
  return (
    <section className="screen">
      <div className="card">
        <h2>Request Reward</h2>
        <p className="subtitle">Ask for a deposit into your Googly Bank.</p>

        <label>Reward</label>
        <select defaultValue={rewards[0].id}>
          {rewards.map((reward) => (
            <option value={reward.id} key={reward.id}>
              {reward.icon} {reward.name}
            </option>
          ))}
        </select>

        <label>Quantity</label>
        <input type="number" min="1" defaultValue="1" />

        <label>Reason</label>
        <textarea placeholder="Because..." />

        <button onClick={() => alert('Fake request submitted 💕')}>
          Submit Request
        </button>
      </div>
    </section>
  )
}

function RedeemReward({ rewards }) {
  return (
    <section className="screen">
      <div className="card">
        <h2>Redeem Reward</h2>
        <p className="subtitle">Make a very reasonable withdrawal request.</p>

        <label>Reward</label>
        <select defaultValue={rewards[0].id}>
          {rewards.map((reward) => (
            <option value={reward.id} key={reward.id}>
              {reward.icon} {reward.name} — {reward.balance} available
            </option>
          ))}
        </select>

        <label>Quantity</label>
        <input type="number" min="1" defaultValue="1" />

        <label>When?</label>
        <select defaultValue="tonight">
          <option value="tonight">Tonight, please</option>
          <option value="this-week">This week</option>
          <option value="surprise">Surprise me</option>
        </select>

        <button onClick={() => alert('Fake redemption submitted 💕')}>
          Submit Redemption
        </button>
      </div>
    </section>
  )
}

function AdminDesk() {
  return (
    <section className="screen">
      <div className="card">
        <h2>Pending Reward Requests</h2>

        {fakeEarnRequests.map((request) => (
          <div className="request-card" key={request.id}>
            <strong>
              +{request.quantity} {request.rewardName}
            </strong>
            <p>{request.reason}</p>
            <div className="button-row">
              <button onClick={() => alert('Fake approved 💕')}>Approve</button>
              <button className="secondary" onClick={() => alert('Fake denied')}>
                Deny
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Pending Redemptions</h2>

        {fakeRedeemRequests.map((request) => (
          <div className="request-card" key={request.id}>
            <strong>
              -{request.quantity} {request.rewardName}
            </strong>
            <p>{request.timing}</p>
            <button onClick={() => alert('Fake marked delivered 💕')}>
              Mark Delivered
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function History() {
  return (
    <section className="screen">
      <div className="card">
        <h2>History</h2>

        <div className="history-list">
          {fakeHistory.map((item) => (
            <div className="history-item" key={item}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default App