import { useEffect, useMemo, useState } from 'react'
import './styles.css'
import { supabase } from './lib/supabase'

const SHANE_PIN = '4522'
const ADMIN_PIN = '2205'
const APP_VERSION = 'v0.6'

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

    const [rewardTypesResult, rewardRequestsResult, redemptionRequestsResult, ledgerResult] = await Promise.all([
      supabase
        .from('reward_types')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true }),
      supabase
        .from('reward_requests')
        .select('*, reward_types(name, emoji)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('redemption_requests')
        .select('*, reward_types(name, emoji)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('ledger_entries')
        .select('*, reward_types(name, emoji)')
        .order('created_at', { ascending: false }),
    ])

    const firstError =
      rewardTypesResult.error ||
      rewardRequestsResult.error ||
      redemptionRequestsResult.error ||
      ledgerResult.error

    if (firstError) {
      console.error('Error loading Googly Bank data:', firstError)
      alert('Could not load Googly Bank data. Check the console.')
      setIsLoading(false)
      return
    }

    const rewardTypes = rewardTypesResult.data || []
    const rewardRequests = rewardRequestsResult.data || []
    const redemptionRequests = redemptionRequestsResult.data || []
    const ledgerEntries = ledgerResult.data || []

    const ledgerBalances = ledgerEntries.reduce((totals, entry) => {
      if (!entry.reward_type_id) return totals
      totals[entry.reward_type_id] = (totals[entry.reward_type_id] || 0) + Number(entry.balance_delta || 0)
      return totals
    }, {})

    const reservedBalances = redemptionRequests.reduce((totals, request) => {
      if (!request.reward_type_id) return totals
      totals[request.reward_type_id] = (totals[request.reward_type_id] || 0) + Number(request.quantity || 0)
      return totals
    }, {})

    const formattedRewards = rewardTypes.map((reward) => {
      const earnedBalance = ledgerBalances[reward.id] || 0
      const reservedBalance = reservedBalances[reward.id] || 0

      return {
        id: reward.id,
        icon: reward.emoji,
        name: reward.name,
        balance: Math.max(0, earnedBalance - reservedBalance),
      }
    })

    const formattedApprovals = rewardRequests.map((request) => ({
      id: request.id,
      rewardId: request.reward_type_id,
      rewardName: request.reward_types?.name || 'Reward',
      icon: request.reward_types?.emoji || '♡',
      quantity: Number(request.quantity || 0),
      reason: request.reason,
      date: request.created_at.slice(0, 10),
    }))

    const formattedDeliveries = redemptionRequests.map((request) => ({
      id: request.id,
      rewardId: request.reward_type_id,
      rewardName: request.reward_types?.name || 'Reward',
      icon: request.reward_types?.emoji || '♡',
      quantity: Number(request.quantity || 0),
      note: request.note,
      date: request.created_at.slice(0, 10),
    }))

    const formattedHistory = ledgerEntries.map((entry) => ({
      id: entry.id,
      type: mapLedgerTypeToHistoryType(entry.entry_type),
      rewardName: entry.reward_types?.name || 'Reward',
      icon: entry.reward_types?.emoji || '♡',
      quantity: Number(entry.quantity || 0),
      date: entry.created_at.slice(0, 10),
      actor: formatActor(entry.actor),
      note: entry.note,
    }))

    setRewards(formattedRewards)
    setPendingApprovals(formattedApprovals)
    setPendingDeliveries(formattedDeliveries)
    setHistory(formattedHistory)
    setIsLoading(false)
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

    const cleanQuantity = Number(quantity)
    const cleanReason = reason || 'No reason given, but probably adorable.'

    const { data: request, error: requestError } = await supabase
      .from('reward_requests')
      .insert({
        reward_type_id: rewardId,
        quantity: cleanQuantity,
        reason: cleanReason,
        status: 'pending',
        created_by: 'shane',
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error submitting reward request:', requestError)
      alert('Could not submit request.')
      return
    }

    const { error: ledgerError } = await supabase
      .from('ledger_entries')
      .insert({
        entry_type: 'request_submitted',
        reward_type_id: rewardId,
        quantity: cleanQuantity,
        balance_delta: 0,
        related_request_id: request.id,
        note: cleanReason,
        actor: 'shane',
      })

    if (ledgerError) {
      console.error('Error creating request ledger entry:', ledgerError)
      alert('Request was saved, but history was not updated.')
    }

    await loadBankData()
    setActiveTab('home')
  }

  async function approveRequest(request) {
    const { error: updateError } = await supabase
      .from('reward_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'rohan',
      })
      .eq('id', request.id)

    if (updateError) {
      console.error('Error approving request:', updateError)
      alert('Could not approve request.')
      return
    }

    const { error: ledgerError } = await supabase
      .from('ledger_entries')
      .insert({
        entry_type: 'request_approved',
        reward_type_id: request.rewardId,
        quantity: request.quantity,
        balance_delta: request.quantity,
        related_request_id: request.id,
        note: request.reason,
        actor: 'rohan',
      })

    if (ledgerError) {
      console.error('Error creating approval ledger entry:', ledgerError)
      alert('Request was approved, but history/balance was not updated.')
      return
    }

    await loadBankData()
  }

  async function denyRequest(request) {
    const { error: updateError } = await supabase
      .from('reward_requests')
      .update({
        status: 'denied',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'rohan',
      })
      .eq('id', request.id)

    if (updateError) {
      console.error('Error denying request:', updateError)
      alert('Could not deny request.')
      return
    }

    const { error: ledgerError } = await supabase
      .from('ledger_entries')
      .insert({
        entry_type: 'request_denied',
        reward_type_id: request.rewardId,
        quantity: request.quantity,
        balance_delta: 0,
        related_request_id: request.id,
        note: request.reason,
        actor: 'rohan',
      })

    if (ledgerError) {
      console.error('Error creating denial ledger entry:', ledgerError)
      alert('Request was denied, but history was not updated.')
    }

    await loadBankData()
  }

  async function addPendingDelivery(rewardId, quantity) {
    const reward = rewards.find((item) => item.id === rewardId)
    if (!reward) return

    const cleanQuantity = Number(quantity)

    if (cleanQuantity > reward.balance) {
      alert(`Only ${reward.balance} ${reward.name} available to redeem.`)
      return
    }

    const { data: request, error: requestError } = await supabase
      .from('redemption_requests')
      .insert({
        reward_type_id: rewardId,
        quantity: cleanQuantity,
        note: 'Redemption requested by Shane.',
        status: 'pending',
        created_by: 'shane',
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error submitting redemption request:', requestError)
      alert('Could not redeem reward.')
      return
    }

    const { error: ledgerError } = await supabase
      .from('ledger_entries')
      .insert({
        entry_type: 'redemption_requested',
        reward_type_id: rewardId,
        quantity: cleanQuantity,
        balance_delta: 0,
        related_request_id: request.id,
        note: 'Redemption requested by Shane.',
        actor: 'shane',
      })

    if (ledgerError) {
      console.error('Error creating redemption ledger entry:', ledgerError)
      alert('Redemption was saved, but history was not updated.')
    }

    await loadBankData()
    setActiveTab('home')
  }

  async function markDelivered(request, note = 'Reward delivered with love.') {
    const { error: updateError } = await supabase
      .from('redemption_requests')
      .update({
        status: 'delivered',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'rohan',
      })
      .eq('id', request.id)

    if (updateError) {
      console.error('Error marking delivered:', updateError)
      alert('Could not mark reward delivered.')
      return
    }

    const { error: ledgerError } = await supabase
      .from('ledger_entries')
      .insert({
        entry_type: 'reward_delivered',
        reward_type_id: request.rewardId,
        quantity: request.quantity,
        balance_delta: -request.quantity,
        related_request_id: request.id,
        note,
        actor: 'rohan',
      })

    if (ledgerError) {
      console.error('Error creating delivery ledger entry:', ledgerError)
      alert('Reward was marked delivered, but balance/history was not updated.')
      return
    }

    await loadBankData()
  }

  async function addReward(icon, name, balance) {
    const { data, error } = await supabase
      .from('reward_types')
      .insert({
        name,
        emoji: icon,
        active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding reward:', error)
      alert('Could not save reward.')
      return
    }

    setRewards([
      ...rewards,
      {
        id: data.id,
        icon: data.emoji,
        name: data.name,
        balance: 0,
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

function mapLedgerTypeToHistoryType(entryType) {
  if (entryType === 'request_approved') return 'approved'
  if (entryType === 'request_denied') return 'denied'
  if (entryType === 'reward_delivered') return 'delivered'
  if (entryType === 'redemption_denied') return 'denied'
  if (entryType === 'redemption_requested') return 'requested'
  return 'submitted'
}

function historyVerb(type) {
  if (type === 'approved') return 'Approved'
  if (type === 'delivered') return 'Rewarded'
  if (type === 'denied') return 'Denied'
  if (type === 'requested') return 'Requested'
  if (type === 'submitted') return 'Submitted'
  return 'Updated'
}

function formatActor(actor) {
  if (actor === 'rohan') return 'Rohan'
  if (actor === 'shane') return 'Shane'
  return actor || 'Rohan'
}

export default App
