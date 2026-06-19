import { useMemo, useState } from 'react'
import './styles.css'

const SHANE_PIN = '4522'
const ADMIN_PIN = '2205'
const APP_VERSION = 'v0.4'

const today = '2026-06-19'

const startingRewards = [
  { id: 'hugs', icon: '🤗', name: 'Hugs', balance: 4 },
  { id: 'head-massage', icon: '💆', name: 'Head Massage', balance: 2 },
  { id: 'coffee', icon: '☕', name: 'Coffee in Bed', balance: 1 },
  { id: 'foot-rub', icon: '🦶', name: 'Foot Rub', balance: 1 },
  { id: 'snuggle', icon: '🥰', name: 'Snuggle', balance: 3 },
]

const startingHistory = [
  {
    id: 1,
    type: 'approved',
    rewardName: 'Hugs',
    icon: '🤗',
    quantity: 2,
    date: '2026-05-05',
    actor: 'Rohan',
    note: 'Because you deserve extra squeezes.',
  },
  {
    id: 2,
    type: 'delivered',
    rewardName: 'Coffee in Bed',
    icon: '☕',
    quantity: 1,
    date: '2026-05-11',
    actor: 'Rohan',
    note: 'Sunday morning delivery.',
  },
  {
    id: 3,
    type: 'approved',
    rewardName: 'Snuggle',
    icon: '🥰',
    quantity: 1,
    date: '2026-06-04',
    actor: 'Rohan',
    note: 'Because you were very cute.',
  },
  {
    id: 4,
    type: 'delivered',
    rewardName: 'Foot Rub',
    icon: '🦶',
    quantity: 1,
    date: '2026-06-12',
    actor: 'Rohan',
    note: 'Delivered with excellence.',
  },
]

function App() {
  const [pin, setPin] = useState('')
  const [userType, setUserType] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [rewards, setRewards] = useState(startingRewards)
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [pendingDeliveries, setPendingDeliveries] = useState([])
  const [history, setHistory] = useState(startingHistory)
  const [historyMonth, setHistoryMonth] = useState('2026-06')

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

  function addPendingApproval(rewardId, quantity, reason) {
    const reward = rewards.find((item) => item.id === rewardId)

    setPendingApprovals([
      ...pendingApprovals,
      {
        id: Date.now(),
        rewardId,
        rewardName: reward.name,
        icon: reward.icon,
        quantity: Number(quantity),
        reason,
        date: today,
      },
    ])

    setActiveTab('home')
  }

  function approveRequest(request) {
    setRewards(
      rewards.map((reward) =>
        reward.id === request.rewardId
          ? { ...reward, balance: reward.balance + request.quantity }
          : reward
      )
    )

    setPendingApprovals(pendingApprovals.filter((item) => item.id !== request.id))

    setHistory([
      ...history,
      {
        id: Date.now(),
        type: 'approved',
        rewardName: request.rewardName,
        icon: request.icon,
        quantity: request.quantity,
        date: today,
        actor: 'Rohan',
        note: request.reason,
      },
    ])
  }

  function denyRequest(request) {
    setPendingApprovals(pendingApprovals.filter((item) => item.id !== request.id))

    setHistory([
      ...history,
      {
        id: Date.now(),
        type: 'denied',
        rewardName: request.rewardName,
        icon: request.icon,
        quantity: request.quantity,
        date: today,
        actor: 'Rohan',
        note: request.reason,
      },
    ])
  }

  function addPendingDelivery(rewardId, quantity) {
    const reward = rewards.find((item) => item.id === rewardId)

    setPendingDeliveries([
      ...pendingDeliveries,
      {
        id: Date.now(),
        rewardId,
        rewardName: reward.name,
        icon: reward.icon,
        quantity: Number(quantity),
        date: today,
      },
    ])

    setActiveTab('home')
  }

  function markDelivered(request, note = 'Reward delivered with love.') {
    setRewards(
      rewards.map((reward) =>
        reward.id === request.rewardId
          ? { ...reward, balance: Math.max(0, reward.balance - request.quantity) }
          : reward
      )
    )

    setPendingDeliveries(pendingDeliveries.filter((item) => item.id !== request.id))

    setHistory([
      ...history,
      {
        id: Date.now(),
        type: 'delivered',
        rewardName: request.rewardName,
        icon: request.icon,
        quantity: request.quantity,
        date: today,
        actor: 'Rohan',
        note,
      },
    ])
  }

  function addReward(icon, name, balance) {
    setRewards([
      ...rewards,
      {
        id: `${name.toLowerCase().replaceAll(' ', '-')}-${Date.now()}`,
        icon,
        name,
        balance: Number(balance),
      },
    ])
  }

  if (!userType) {
    return (
      <main className="app login-screen">
        <section className="login-card">
          <img className="login-heart" src="/googly-heart-semi-3d.png" alt="Googly Bank heart" />

          <div className="brand-lockup login-brand">
            <h1>Googly Bank</h1>
          </div>

          <p className="accent-copy">Good things you’ve earned.</p>
          <p className="accent-copy second-line">Good things you’re owed.</p>

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
    <main className={`app ${userType === 'admin' ? 'admin-app' : ''}`}>
      <AppHeader userType={userType} onLogout={handleLogout} />

      {activeTab === 'home' && (
        <Home
          rewards={rewards}
          pendingApprovals={pendingApprovals}
          pendingDeliveries={pendingDeliveries}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'request' && (
        <RequestReward rewards={rewards} onSubmit={addPendingApproval} />
      )}

      {activeTab === 'redeem' && (
        <RedeemReward rewards={rewards} onSubmit={addPendingDelivery} />
      )}

      {activeTab === 'history' && (
        <History
          history={history}
          historyMonth={historyMonth}
          setHistoryMonth={setHistoryMonth}
        />
      )}

      {activeTab === 'admin' && (
        <AdminDesk
          pendingApprovals={pendingApprovals}
          pendingDeliveries={pendingDeliveries}
          onApprove={approveRequest}
          onDeny={denyRequest}
          onDelivered={markDelivered}
          onAddReward={addReward}
        />
      )}

      <BottomNav userType={userType} activeTab={activeTab} setActiveTab={setActiveTab} />
    </main>
  )
}

function AppHeader({ userType, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <img className="header-heart" src="/googly-heart-semi-3d.png" alt="" />
        <div>
          <p className="eyebrow">{userType === 'admin' ? 'Admin' : 'Googly Bank'}</p>
          <h1>{userType === 'admin' ? 'Action Center' : 'Good evening, Googs ❤️'}</h1>
        </div>
      </div>

      <button className="icon-button" onClick={onLogout} aria-label="Log out">
        ⌁
      </button>
    </header>
  )
}

function Home({ rewards, pendingApprovals, pendingDeliveries, setActiveTab }) {
  return (
    <section className="screen">
      <section className="hero-copy">
        <p>You’re owed some good things today.</p>
      </section>

      <div className="balance-card">
        <div className="section-label">You have</div>

        <div className="reward-list">
          {rewards.map((reward) => (
            <div className="reward-row" key={reward.id}>
              <div className="reward-name">
                <span className="emoji">{reward.icon}</span>
                <span>{reward.name}</span>
              </div>
              <strong>{reward.balance}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="pending-stack">
        <PendingPill
          icon="⏳"
          label={`${pendingApprovals.length} request${pendingApprovals.length === 1 ? '' : 's'} awaiting approval`}
        />
        <PendingPill
          icon="🎁"
          label={`${pendingDeliveries.length} reward${pendingDeliveries.length === 1 ? '' : 's'} awaiting delivery`}
        />
      </div>

      <div className="home-actions">
        <button onClick={() => setActiveTab('request')}>Request Something <span>›</span></button>
        <button className="outline-button" onClick={() => setActiveTab('redeem')}>Redeem a Reward <span>›</span></button>
      </div>

      <RecentActivity approvals={pendingApprovals} deliveries={pendingDeliveries} />
    </section>
  )
}

function PendingPill({ icon, label }) {
  return (
    <div className="pending-pill">
      <span>{icon}</span>
      <strong>{label}</strong>
      <span className="chevron">›</span>
    </div>
  )
}

function RecentActivity({ approvals, deliveries }) {
  const latest = [...approvals, ...deliveries].slice(-2).reverse()

  return (
    <section className="recent-activity">
      <div className="mini-section-header">
        <h2>Recent Activity</h2>
        <button className="text-button">View all</button>
      </div>

      {latest.length === 0 ? (
        <div className="activity-card muted-card">
          <p>No new activity yet.</p>
        </div>
      ) : (
        latest.map((item) => (
          <div className="activity-card" key={item.id}>
            <div>
              <strong>{item.icon} Requested: {item.rewardName} × {item.quantity}</strong>
              {item.reason && <p>“{item.reason}”</p>}
            </div>
            <span>{formatShortDate(item.date)}</span>
          </div>
        ))
      )}
    </section>
  )
}

function RequestReward({ rewards, onSubmit }) {
  const [rewardId, setRewardId] = useState(rewards[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(rewardId, quantity, reason || 'No reason given, but probably adorable.')
    setQuantity(1)
    setReason('')
  }

  return (
    <section className="screen">
      <ScreenTitle title="Request Something" />

      <form className="form-card" onSubmit={handleSubmit}>
        <label className="section-label">What would you like?</label>

        <div className="choice-list">
          {rewards.map((reward) => (
            <button
              type="button"
              key={reward.id}
              className={`choice-row ${rewardId === reward.id ? 'selected' : ''}`}
              onClick={() => setRewardId(reward.id)}
            >
              <span>
                <span className="emoji">{reward.icon}</span>
                {reward.name}
              </span>
              <span className="radio-dot">{rewardId === reward.id ? '✓' : ''}</span>
            </button>
          ))}
        </div>

        <label className="section-label">Quantity</label>
        <div className="quantity-control">
          <button type="button" onClick={() => setQuantity(Math.max(1, Number(quantity) - 1))}>−</button>
          <strong>{quantity}</strong>
          <button type="button" onClick={() => setQuantity(Number(quantity) + 1)}>+</button>
        </div>

        <label className="section-label">Why are you requesting this?</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Tell Rohan why you’d love this..."
          maxLength="200"
        />
        <div className="char-count">{reason.length}/200</div>

        <button type="submit">Submit Request</button>
      </form>
    </section>
  )
}

function RedeemReward({ rewards, onSubmit }) {
  const availableRewards = rewards.filter((reward) => reward.balance > 0)

  function handleRedeem(rewardId) {
    onSubmit(rewardId, 1)
  }

  return (
    <section className="screen">
      <ScreenTitle title="Redeem a Reward" />

      <div className="section-label">Available Now</div>

      {availableRewards.length === 0 ? (
        <div className="empty-state">No rewards available to redeem yet.</div>
      ) : (
        <div className="redeem-list">
          {availableRewards.map((reward) => (
            <article className="redeem-card" key={reward.id}>
              <div className="redeem-icon">{reward.icon}</div>
              <div className="redeem-info">
                <h2>{reward.name}</h2>
                <p>Available</p>
                <button onClick={() => handleRedeem(reward.id)}>Redeem</button>
              </div>
              <strong>{reward.balance}</strong>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
function AdminDesk({ pendingApprovals, pendingDeliveries, onApprove, onDeny, onDelivered, onAddReward }) {
  const [adminView, setAdminView] = useState('requests')
  const [newIcon, setNewIcon] = useState('💖')
  const [newName, setNewName] = useState('')
  const [newBalance, setNewBalance] = useState(1)

  function handleAddReward(event) {
    event.preventDefault()
    if (!newName.trim()) return
    onAddReward(newIcon, newName.trim(), newBalance)
    setNewIcon('💖')
    setNewName('')
    setNewBalance(1)
  }

  return (
    <section className="screen admin-screen">
      <div className="admin-tabs">
        <button className={adminView === 'requests' ? 'active' : ''} onClick={() => setAdminView('requests')}>
          Requests <span>{pendingApprovals.length}</span>
        </button>
        <button className={adminView === 'redemptions' ? 'active' : ''} onClick={() => setAdminView('redemptions')}>
          Redemptions <span>{pendingDeliveries.length}</span>
        </button>
        <button className={adminView === 'rewards' ? 'active' : ''} onClick={() => setAdminView('rewards')}>
          Rewards
        </button>
      </div>

      {adminView === 'requests' && (
        <div className="admin-inbox">
          <h2>Pending Approval</h2>
          {pendingApprovals.length === 0 ? (
            <div className="empty-state">Nothing waiting for approval.</div>
          ) : (
            pendingApprovals.map((request) => (
              <article className="admin-card" key={request.id}>
                <div className="admin-card-top">
                  <strong>{request.icon} {request.rewardName} × {request.quantity}</strong>
                  <span>{formatShortDate(request.date)}</span>
                </div>
                <p>Requested by Shane</p>
                <blockquote>“{request.reason}”</blockquote>
                <div className="button-row">
                  <button onClick={() => onApprove(request)}>Approve</button>
                  <button className="outline-button" onClick={() => onDeny(request)}>Deny</button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {adminView === 'redemptions' && (
        <div className="admin-inbox">
          <h2>Awaiting Delivery</h2>
          {pendingDeliveries.length === 0 ? (
            <div className="empty-state">Nothing waiting for delivery.</div>
          ) : (
            pendingDeliveries.map((request) => (
              <article className="admin-card" key={request.id}>
                <div className="admin-card-top">
                  <strong>{request.icon} {request.rewardName} × {request.quantity}</strong>
                  <span>{formatShortDate(request.date)}</span>
                </div>
                <p>Redeemed by Shane</p>
                <button onClick={() => onDelivered(request)}>Mark Delivered 🎁</button>
              </article>
            ))
          )}
        </div>
      )}

      {adminView === 'rewards' && (
        <form className="form-card" onSubmit={handleAddReward}>
          <h2>Add Reward Type</h2>

          <label className="section-label">Icon</label>
          <input value={newIcon} onChange={(event) => setNewIcon(event.target.value)} />

          <label className="section-label">Name</label>
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Back scratch" />

          <label className="section-label">Starting Balance</label>
          <input type="number" min="0" value={newBalance} onChange={(event) => setNewBalance(event.target.value)} />

          <button type="submit">Add Reward</button>
        </form>
      )}
    </section>
  )
}

function History({ history, historyMonth, setHistoryMonth }) {
  const monthlyHistory = useMemo(
    () => history.filter((item) => item.date.startsWith(historyMonth)),
    [history, historyMonth]
  )

  const monthLabel = new Date(`${historyMonth}-01T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  function moveMonth(direction) {
    const current = new Date(`${historyMonth}-01T12:00:00`)
    current.setMonth(current.getMonth() + direction)
    setHistoryMonth(current.toISOString().slice(0, 7))
  }

  return (
    <section className="screen">
      <ScreenTitle title="History" />

      <div className="statement-header">
        <button className="icon-button" onClick={() => moveMonth(-1)}>‹</button>
        <h2>{monthLabel}</h2>
        <button className="icon-button" onClick={() => moveMonth(1)}>›</button>
      </div>

      <div className="statement-list">
        {monthlyHistory.length === 0 ? (
          <div className="empty-state">No history for this month.</div>
        ) : (
          monthlyHistory.map((item) => (
            <article className={`statement-card ${item.type}`} key={item.id}>
              <div className="timeline-dot" />
              <div>
                <div className="statement-top">
                  <strong>{item.icon} {item.rewardName} × {item.quantity}</strong>
                  <span>{formatShortDate(item.date)}</span>
                </div>
                <p>{historyVerb(item.type)} by {item.actor || 'Rohan'}</p>
                {item.note && <blockquote>“{item.note}”</blockquote>}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function ScreenTitle({ title }) {
  return (
    <div className="screen-title">
      <h1>{title}</h1>
      <div className="title-rule"><span>♡</span></div>
    </div>
  )
}

function BottomNav({ userType, activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>
        <span>⌂</span>Home
      </button>

      {userType === 'shane' && (
        <button className={activeTab === 'redeem' ? 'active' : ''} onClick={() => setActiveTab('redeem')}>
          <span>♡</span>Bank
        </button>
      )}

      {userType === 'admin' && (
        <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>
          <span>▦</span>Admin
        </button>
      )}

      <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
        <span>▤</span>History
      </button>
    </nav>
  )
}

function formatShortDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function historyVerb(type) {
  if (type === 'approved') return 'Approved'
  if (type === 'delivered') return 'Rewarded'
  if (type === 'denied') return 'Denied'
  return 'Updated'
}

export default App