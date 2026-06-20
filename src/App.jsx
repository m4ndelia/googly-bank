import { useEffect, useMemo, useState } from 'react'
import './styles.css'
import {
  getBankState,
  createRewardRequest,
  approveRewardRequest,
  denyRewardRequest,
  createRedemptionRequest,
  markRewardDelivered,
  createRewardType,
} from './lib/bankApi'

const SHANE_PIN = '4522'
const ADMIN_PIN = '2205'
const APP_VERSION = 'v0.7'

function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

function App() {
  const [pin, setPin] = useState('')
  const [userType, setUserType] = useState(null)
  const [activeTab, setActiveTab] = useState('home')
  const [rewards, setRewards] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [pendingDeliveries, setPendingDeliveries] = useState([])
  const [history, setHistory] = useState([])
  const [historyMonth, setHistoryMonth] = useState(getTodayString().slice(0, 7))
  const [isLoading, setIsLoading] = useState(true)

async function loadBankData() {
  setIsLoading(true)

  try {
    const state = await getBankState()

    setRewards(state.rewards)
    setPendingApprovals(state.pendingApprovals)
    setPendingDeliveries(state.pendingDeliveries)
    setHistory(state.history)
  } catch (error) {
    console.error('Error loading Googly Bank data:', error)
    alert('Could not load Googly Bank data. Check the console.')
  } finally {
    setIsLoading(false)
  }
}

  useEffect(() => {
    loadBankData()
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [activeTab, userType])

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

  async function addPendingApproval(rewardId, quantity, reason) {
    const reward = rewards.find((item) => item.id === rewardId)
    if (!reward) return

    try {
      await createRewardRequest({
        rewardTypeId: rewardId,
        quantity,
        reason,
      })
      await loadBankData()
      setActiveTab('home')
    } catch (error) {
      console.error('Error submitting reward request:', error)
      alert('Could not submit request.')
    }
  }

  async function approveRequest(request) {
    try {
      await approveRewardRequest(request)
      await loadBankData()
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Could not approve request.')
    }
  }

  async function denyRequest(request) {
    try {
      await denyRewardRequest(request)
      await loadBankData()
    } catch (error) {
      console.error('Error denying request:', error)
      alert('Could not deny request.')
    }
  }

  async function addPendingDelivery(rewardId, quantity) {
    const reward = rewards.find((item) => item.id === rewardId)
    if (!reward) return

    const cleanQuantity = Number(quantity)

    if (cleanQuantity > reward.balance) {
      alert(`Only ${reward.balance} ${reward.name} available to redeem.`)
      return
    }

    try {
      await createRedemptionRequest({
        rewardTypeId: rewardId,
        quantity: cleanQuantity,
      })
      await loadBankData()
      setActiveTab('home')
    } catch (error) {
      console.error('Error submitting redemption request:', error)
      alert('Could not redeem reward.')
    }
  }

  async function markDelivered(request, note = 'Reward delivered with love.') {
    try {
      await markRewardDelivered(request, note)
      await loadBankData()
    } catch (error) {
      console.error('Error marking delivered:', error)
      alert('Could not mark reward delivered.')
    }
  }

  async function addReward(icon, name) {
    try {
      await createRewardType({ icon, name })
      await loadBankData()
    } catch (error) {
      console.error('Error adding reward:', error)
      alert('Could not save reward.')
    }
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

      {isLoading && <div className="empty-state">Loading Googly Bank...</div>}

      {!isLoading && activeTab === 'home' && (
        <Home
          rewards={rewards}
          pendingApprovals={pendingApprovals}
          pendingDeliveries={pendingDeliveries}
          setActiveTab={setActiveTab}
        />
      )}

      {!isLoading && activeTab === 'request' && (
        <RequestReward rewards={rewards} onSubmit={addPendingApproval} />
      )}

      {!isLoading && activeTab === 'redeem' && (
        <RedeemReward rewards={rewards} onSubmit={addPendingDelivery} />
      )}

      {!isLoading && activeTab === 'history' && (
        <History
          history={history}
          historyMonth={historyMonth}
          setHistoryMonth={setHistoryMonth}
        />
      )}

      {!isLoading && activeTab === 'admin' && (
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
          <h1>{userType === 'admin' ? 'Action Center' : `${getGreeting()}, Googs ❤️`}</h1>
        </div>
      </div>

      <button className="icon-button" onClick={onLogout} aria-label="Log out">
        ↩
      </button>
    </header>
  )
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function Home({ rewards, pendingApprovals, pendingDeliveries, setActiveTab }) {
  const [expandedPending, setExpandedPending] = useState(null)

  return (
    <section className="screen">
      <section className="hero-copy">
        <p>You’re owed some good things today.</p>
      </section>

      <div className="balance-card">
        <div className="section-label">Available balance</div>

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
          isOpen={expandedPending === 'approvals'}
          onClick={() => setExpandedPending(expandedPending === 'approvals' ? null : 'approvals')}
        />

        {expandedPending === 'approvals' && (
          <PendingDetails items={pendingApprovals} empty="No reward requests pending." />
        )}

        <PendingPill
          icon="🎁"
          label={`${pendingDeliveries.length} reward${pendingDeliveries.length === 1 ? '' : 's'} awaiting delivery`}
          isOpen={expandedPending === 'deliveries'}
          onClick={() => setExpandedPending(expandedPending === 'deliveries' ? null : 'deliveries')}
        />

        {expandedPending === 'deliveries' && (
          <PendingDetails items={pendingDeliveries} empty="No redemptions pending." />
        )}
      </div>

      <div className="home-actions">
        <button onClick={() => setActiveTab('request')}>Request Something <span>›</span></button>
        <button className="outline-button" onClick={() => setActiveTab('redeem')}>Redeem a Reward <span>›</span></button>
      </div>
    </section>
  )
}

function PendingPill({ icon, label, isOpen, onClick }) {
  return (
    <button className="pending-pill" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
      <span className="chevron">{isOpen ? '⌃' : '›'}</span>
    </button>
  )
}

function PendingDetails({ items, empty }) {
  if (items.length === 0) {
    return <div className="pending-details empty-mini">{empty}</div>
  }

  return (
    <div className="pending-details">
      {items.map((item) => (
        <div className="pending-detail-row" key={item.id}>
          <strong>{item.icon} {item.rewardName} × {item.quantity}</strong>
          {item.reason && <p>“{item.reason}”</p>}
          {item.note && <p>“{item.note}”</p>}
        </div>
      ))}
    </div>
  )
}

function RequestReward({ rewards, onSubmit }) {
  const [rewardId, setRewardId] = useState(rewards[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!rewardId && rewards.length > 0) {
      setRewardId(rewards[0].id)
    }
  }, [rewardId, rewards])

  function handleSubmit(event) {
    event.preventDefault()
    if (!rewardId) return
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
                <p className="available-copy">Available: {reward.balance}</p>
                <button onClick={() => handleRedeem(reward.id)}>Redeem</button>
              </div>
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

  function handleAddReward(event) {
    event.preventDefault()
    if (!newName.trim()) return
    onAddReward(newIcon, newName.trim())
    setNewIcon('💖')
    setNewName('')
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
  if (type === 'requested') return 'Requested'
  if (type === 'submitted') return 'Submitted'
  return 'Updated'
}

export default App
