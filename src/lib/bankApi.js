import { supabase } from './supabase'

export function mapLedgerTypeToHistoryType(entryType) {
  if (entryType === 'request_approved') return 'approved'
  if (entryType === 'request_denied') return 'denied'
  if (entryType === 'reward_delivered') return 'delivered'
  if (entryType === 'redemption_denied') return 'denied'
  if (entryType === 'redemption_requested') return 'requested'
  return 'submitted'
}

export function formatActor(actor) {
  if (actor === 'rohan') return 'Rohan'
  if (actor === 'shane') return 'Shane'
  return actor || 'Rohan'
}

export async function getBankState() {
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
    throw firstError
  }

  const rewardTypes = rewardTypesResult.data || []
  const rewardRequests = rewardRequestsResult.data || []
  const redemptionRequests = redemptionRequestsResult.data || []
  const ledgerEntries = ledgerResult.data || []

  const ledgerBalances = ledgerEntries.reduce((totals, entry) => {
    if (!entry.reward_type_id) return totals
    totals[entry.reward_type_id] =
      (totals[entry.reward_type_id] || 0) + Number(entry.balance_delta || 0)
    return totals
  }, {})

  const reservedBalances = redemptionRequests.reduce((totals, request) => {
    if (!request.reward_type_id) return totals
    totals[request.reward_type_id] =
      (totals[request.reward_type_id] || 0) + Number(request.quantity || 0)
    return totals
  }, {})

  const rewards = rewardTypes.map((reward) => {
    const earnedBalance = ledgerBalances[reward.id] || 0
    const reservedBalance = reservedBalances[reward.id] || 0

    return {
      id: reward.id,
      icon: reward.emoji,
      name: reward.name,
      balance: Math.max(0, earnedBalance - reservedBalance),
    }
  })

  const pendingApprovals = rewardRequests.map((request) => ({
    id: request.id,
    rewardId: request.reward_type_id,
    rewardName: request.reward_types?.name || 'Reward',
    icon: request.reward_types?.emoji || '♡',
    quantity: Number(request.quantity || 0),
    reason: request.reason,
    date: request.created_at.slice(0, 10),
  }))

  const pendingDeliveries = redemptionRequests.map((request) => ({
    id: request.id,
    rewardId: request.reward_type_id,
    rewardName: request.reward_types?.name || 'Reward',
    icon: request.reward_types?.emoji || '♡',
    quantity: Number(request.quantity || 0),
    note: request.note,
    date: request.created_at.slice(0, 10),
  }))

  const history = ledgerEntries.map((entry) => ({
    id: entry.id,
    type: mapLedgerTypeToHistoryType(entry.entry_type),
    rewardName: entry.reward_types?.name || 'Reward',
    icon: entry.reward_types?.emoji || '♡',
    quantity: Number(entry.quantity || 0),
    date: entry.created_at.slice(0, 10),
    actor: formatActor(entry.actor),
    note: entry.note,
  }))

  return {
    rewards,
    pendingApprovals,
    pendingDeliveries,
    history,
  }
}

export async function createRewardRequest({ rewardTypeId, quantity, reason }) {
  const cleanQuantity = Number(quantity)
  const cleanReason = reason || 'No reason given, but probably adorable.'

  const { data: request, error: requestError } = await supabase
    .from('reward_requests')
    .insert({
      reward_type_id: rewardTypeId,
      quantity: cleanQuantity,
      reason: cleanReason,
      status: 'pending',
      created_by: 'shane',
    })
    .select()
    .single()

  if (requestError) throw requestError

  const { error: ledgerError } = await supabase.from('ledger_entries').insert({
    entry_type: 'request_submitted',
    reward_type_id: rewardTypeId,
    quantity: cleanQuantity,
    balance_delta: 0,
    related_request_id: request.id,
    note: cleanReason,
    actor: 'shane',
  })

  if (ledgerError) throw ledgerError
}

export async function approveRewardRequest(request) {
  const { error: updateError } = await supabase
    .from('reward_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'rohan',
    })
    .eq('id', request.id)

  if (updateError) throw updateError

  const { error: ledgerError } = await supabase.from('ledger_entries').insert({
    entry_type: 'request_approved',
    reward_type_id: request.rewardId,
    quantity: request.quantity,
    balance_delta: request.quantity,
    related_request_id: request.id,
    note: request.reason,
    actor: 'rohan',
  })

  if (ledgerError) throw ledgerError
}

export async function denyRewardRequest(request) {
  const { error: updateError } = await supabase
    .from('reward_requests')
    .update({
      status: 'denied',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'rohan',
    })
    .eq('id', request.id)

  if (updateError) throw updateError

  const { error: ledgerError } = await supabase.from('ledger_entries').insert({
    entry_type: 'request_denied',
    reward_type_id: request.rewardId,
    quantity: request.quantity,
    balance_delta: 0,
    related_request_id: request.id,
    note: request.reason,
    actor: 'rohan',
  })

  if (ledgerError) throw ledgerError
}

export async function createRedemptionRequest({ rewardTypeId, quantity }) {
  const cleanQuantity = Number(quantity)

  const { data: request, error: requestError } = await supabase
    .from('redemption_requests')
    .insert({
      reward_type_id: rewardTypeId,
      quantity: cleanQuantity,
      note: 'Redemption requested by Shane.',
      status: 'pending',
      created_by: 'shane',
    })
    .select()
    .single()

  if (requestError) throw requestError

  const { error: ledgerError } = await supabase.from('ledger_entries').insert({
    entry_type: 'redemption_requested',
    reward_type_id: rewardTypeId,
    quantity: cleanQuantity,
    balance_delta: 0,
    related_request_id: request.id,
    note: 'Redemption requested by Shane.',
    actor: 'shane',
  })

  if (ledgerError) throw ledgerError
}

export async function markRewardDelivered(request, note = 'Reward delivered with love.') {
  const { error: updateError } = await supabase
    .from('redemption_requests')
    .update({
      status: 'delivered',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'rohan',
    })
    .eq('id', request.id)

  if (updateError) throw updateError

  const { error: ledgerError } = await supabase.from('ledger_entries').insert({
    entry_type: 'reward_delivered',
    reward_type_id: request.rewardId,
    quantity: request.quantity,
    balance_delta: -request.quantity,
    related_request_id: request.id,
    note,
    actor: 'rohan',
  })

  if (ledgerError) throw ledgerError
}

export async function createRewardType({ icon, name }) {
  const { error } = await supabase.from('reward_types').insert({
    name,
    emoji: icon,
    active: true,
  })

  if (error) throw error
}

