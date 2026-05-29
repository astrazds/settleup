/** @jsxImportSource react */
import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import type {
  EventSnapshot,
  Expense,
  Participant,
  SettlementPayment
} from '../domain'
import {
  EVENT_REALTIME_FALLBACK_POLL_MS,
  eventRealtimeReconnectDelay,
  eventRealtimeRoutePath,
  parseEventRealtimeMessage
} from '../event-realtime-protocol'
import {
  composeEventPagePolicy,
  eventHistoryItems,
  participantDeleteState,
  type EventPagePolicy
} from './client-event-page-policy'
import {
  composeExpenseDraft,
  formatDraftMoneyMinor,
  parseDraftMoneyMinor
} from './client-expense-draft'
import {
  newParticipantId,
  shouldShowDraftUpdateWarning
} from './client-state'

type RequestMethod = 'POST' | 'PATCH' | 'DELETE'

interface ExpenseDraftState {
  expenseId: string
  description: string
  amount: string
  payerParticipantId: string
  includedParticipantIds: string[]
  dirty: boolean
  updateWarning: string
  error: string
}

interface SettlementDraftState {
  settlementPaymentId: string
  senderParticipantId: string
  recipientParticipantId: string
  amount: string
  open: boolean
  dirty: boolean
  updateWarning: string
  error: string
}

interface ParticipantCorrectionState {
  mode: 'idle' | 'rename' | 'confirmDelete'
  participantId: string
  displayName: string
  error: string
  saving: boolean
}

interface ToastState {
  message: string
  visible: boolean
}

const appElement = document.querySelector<HTMLElement>('#app')
const token = appElement?.dataset.token

if (appElement && token) {
  createRoot(appElement).render(<EventApp token={token} />)
}

function EventApp({ token }: { token: string }): React.ReactElement {
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null)
  const [currentParticipantId, setCurrentParticipantId] = useState(() =>
    localStorage.getItem(participantStorageKey(token)) || ''
  )
  const [selectedDefaultId, setSelectedDefaultId] = useState('')
  const [realtimeState, setRealtimeState] = useState('Live updates connecting')
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false })
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraftState>(emptyExpenseDraft())
  const [settlementDraft, setSettlementDraft] = useState<SettlementDraftState>(emptySettlementDraft())
  const [participantCorrection, setParticipantCorrection] = useState<ParticipantCorrectionState>(emptyParticipantCorrection())
  const [pendingPayParticipantId, setPendingPayParticipantId] = useState('')

  const snapshotRef = useRef<EventSnapshot | null>(null)
  const expenseDirtyRef = useRef(false)
  const settlementDirtyRef = useRef(false)
  const toastHideRef = useRef<number | null>(null)
  const fallbackPollingRef = useRef<number | null>(null)
  const realtimeSocketRef = useRef<WebSocket | null>(null)
  const realtimeReconnectRef = useRef<number | null>(null)
  const realtimeReconnectAttemptRef = useRef(0)

  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    expenseDirtyRef.current = expenseDraft.dirty
  }, [expenseDraft.dirty])

  useEffect(() => {
    settlementDirtyRef.current = settlementDraft.dirty
  }, [settlementDraft.dirty])

  const showToast = useCallback((message: string): void => {
    if (toastHideRef.current) {
      window.clearTimeout(toastHideRef.current)
    }
    setToast({ message, visible: true })
    toastHideRef.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }))
    }, 2200)
  }, [])

  const refresh = useCallback(async (preserveDrafts: boolean, completeMessage?: string): Promise<void> => {
    const previousEventUpdatedAt = snapshotRef.current?.event.updatedAt || null
    if (preserveDrafts) {
      showToast('Refreshing Event data...')
    }

    const response = await fetch(`/api/events/${token}`)
    if (!response.ok) {
      setSnapshot(null)
      return
    }

    const nextSnapshot = await response.json() as EventSnapshot
    setSnapshot(nextSnapshot)
    setCurrentParticipantId((current) =>
      current && nextSnapshot.participants.some((participant) => participant.id === current) ? current : ''
    )

    if (preserveDrafts) {
      showToast(completeMessage || 'Event data refreshed. Draft fields stayed unchanged.')
    }
    if (shouldShowDraftUpdateWarning({
      preserveDrafts,
      previousEventUpdatedAt,
      nextEventUpdatedAt: nextSnapshot.event.updatedAt,
      hasActiveDraft: expenseDirtyRef.current || settlementDirtyRef.current
    })) {
      if (expenseDirtyRef.current) {
        setExpenseDraft((draft) => ({
          ...draft,
          updateWarning: 'Event updated while you were editing. Review before saving.'
        }))
      }
      if (settlementDirtyRef.current) {
        setSettlementDraft((draft) => ({
          ...draft,
          updateWarning: 'Event updated while you were editing. Review before saving.'
        }))
      }
    }
  }, [showToast, token])

  const stopFallbackPolling = useCallback((): void => {
    if (!fallbackPollingRef.current) return
    window.clearInterval(fallbackPollingRef.current)
    fallbackPollingRef.current = null
  }, [])

  const startFallbackPolling = useCallback((): void => {
    if (fallbackPollingRef.current) return
    fallbackPollingRef.current = window.setInterval(() => {
      void refresh(true)
    }, EVENT_REALTIME_FALLBACK_POLL_MS)
  }, [refresh])

  const connectRealtime = useCallback((): void => {
    if (realtimeReconnectRef.current) {
      window.clearTimeout(realtimeReconnectRef.current)
    }
    setRealtimeState('Live updates connecting')
    const socket = new WebSocket(realtimeUrl(token))
    realtimeSocketRef.current = socket

    socket.addEventListener('open', () => {
      if (realtimeSocketRef.current !== socket) return
      realtimeReconnectAttemptRef.current = 0
      stopFallbackPolling()
      setRealtimeState('Live updates on')
    })

    socket.addEventListener('message', (event) => {
      if (parseEventRealtimeMessage(event.data)) {
        void refresh(true, 'Event updated. Draft fields stayed unchanged.')
      }
    })

    socket.addEventListener('close', () => {
      if (realtimeSocketRef.current !== socket) return
      setRealtimeState('Live updates reconnecting, polling')
      startFallbackPolling()
      realtimeReconnectAttemptRef.current += 1
      realtimeReconnectRef.current = window.setTimeout(
        connectRealtime,
        eventRealtimeReconnectDelay(realtimeReconnectAttemptRef.current)
      )
    })

    socket.addEventListener('error', () => {
      socket.close()
    })
  }, [refresh, startFallbackPolling, stopFallbackPolling, token])

  useEffect(() => {
    void refresh(false)
    if ('WebSocket' in window) {
      connectRealtime()
    } else {
      setRealtimeState('Live updates unavailable, polling')
      startFallbackPolling()
    }

    return () => {
      if (realtimeSocketRef.current) {
        realtimeSocketRef.current.close(1000, 'Page closing')
      }
      if (realtimeReconnectRef.current) {
        window.clearTimeout(realtimeReconnectRef.current)
      }
      stopFallbackPolling()
      if (toastHideRef.current) {
        window.clearTimeout(toastHideRef.current)
      }
    }
  }, [connectRealtime, refresh, startFallbackPolling, stopFallbackPolling])

  const effectiveCurrentParticipantId = useMemo(() => {
    if (!snapshot) return ''
    if (currentParticipantId && snapshot.participants.some((participant) => participant.id === currentParticipantId)) {
      return currentParticipantId
    }
    return snapshot.participants[0]?.id || ''
  }, [currentParticipantId, snapshot])

  useEffect(() => {
    if (!snapshot || !effectiveCurrentParticipantId) return
    setSelectedDefaultId(effectiveCurrentParticipantId)
    if (!currentParticipantId) {
      localStorage.setItem(participantStorageKey(token), effectiveCurrentParticipantId)
      setCurrentParticipantId(effectiveCurrentParticipantId)
    }
  }, [currentParticipantId, effectiveCurrentParticipantId, snapshot, token])

  useEffect(() => {
    if (!snapshot) return
    setExpenseDraft((draft) => {
      if (draft.dirty || draft.expenseId) return draft
      return {
        ...draft,
        payerParticipantId: effectiveCurrentParticipantId,
        includedParticipantIds: snapshot.participants.map((participant) => participant.id)
      }
    })
    setSettlementDraft((draft) => {
      if (draft.dirty || draft.settlementPaymentId) return draft
      return {
        ...draft,
        senderParticipantId: draft.senderParticipantId || snapshot.participants[0]?.id || '',
        recipientParticipantId: draft.recipientParticipantId || snapshot.participants[1]?.id || snapshot.participants[0]?.id || ''
      }
    })
  }, [effectiveCurrentParticipantId, snapshot])

  if (!snapshot) {
    return (
      <section className="loading-panel">
        <p className="eyebrow">SettleUp</p>
        <h1>Event not found</h1>
        <p>This Event Link does not work.</p>
      </section>
    )
  }

  const policy = composeEventPagePolicy(snapshot)
  const setDirtyExpenseDraft = (update: Partial<ExpenseDraftState>): void => {
    setExpenseDraft((draft) => ({
      ...draft,
      ...update,
      dirty: true,
      updateWarning: update.updateWarning ?? ''
    }))
  }
  const setDirtySettlementDraft = (update: Partial<SettlementDraftState>): void => {
    setSettlementDraft((draft) => ({
      ...draft,
      ...update,
      dirty: true,
      updateWarning: update.updateWarning ?? ''
    }))
  }

  const copyEventLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(window.location.href)
    showToast('Event Link copied')
  }

  const switchParticipant = (nextParticipantId: string): void => {
    if (!nextParticipantId) return
    setCurrentParticipantId(nextParticipantId)
    setSelectedDefaultId(nextParticipantId)
    localStorage.setItem(participantStorageKey(token), nextParticipantId)
    setExpenseDraft((draft) => ({
      ...draft,
      payerParticipantId: nextParticipantId,
      includedParticipantIds: Array.from(new Set([...draft.includedParticipantIds, nextParticipantId]))
    }))
  }

  const submitParticipant = async (displayName: string): Promise<void> => {
    if (!displayName.trim()) return
    const previousSnapshot = snapshot
    const nextSnapshot = await request<EventSnapshot>(`/api/events/${token}/participants`, 'POST', {
      displayName
    })
    const addedParticipantId = newParticipantId(previousSnapshot, nextSnapshot)
    setSnapshot(nextSnapshot)
    if (addedParticipantId) {
      setExpenseDraft((draft) => ({
        ...draft,
        includedParticipantIds: Array.from(new Set([...draft.includedParticipantIds, addedParticipantId]))
      }))
    }
  }

  const submitExpense = async (): Promise<void> => {
    const expenseAmountMinor = parseDraftMoneyMinor(expenseDraft.amount)
    if (expenseAmountMinor === null || expenseAmountMinor <= 0) {
      setExpenseDraft((draft) => ({ ...draft, error: 'Amount must be a positive decimal amount' }))
      return
    }
    const includedParticipants = includedParticipantsFor(snapshot.participants, expenseDraft.includedParticipantIds)
    if (includedParticipants.length === 0) {
      setExpenseDraft((draft) => ({ ...draft, error: 'Choose at least one Participant to split between' }))
      return
    }
    const equalDraft = composeExpenseDraft({
      amount: expenseDraft.amount,
      payerParticipantId: expenseDraft.payerParticipantId || effectiveCurrentParticipantId,
      participants: snapshot.participants,
      includedParticipantIds: expenseDraft.includedParticipantIds
    })
    if (equalDraft.equalShares.some((share) => share.amountMinor <= 0)) {
      setExpenseDraft((draft) => ({
        ...draft,
        error: 'Amount is too small to split equally across the selected Participants'
      }))
      return
    }

    try {
      const payload = {
        description: expenseDraft.description,
        amount: expenseDraft.amount,
        payerParticipantId: expenseDraft.payerParticipantId || effectiveCurrentParticipantId,
        includedParticipantIds: includedParticipants.map((participant) => participant.id)
      }
      if (expenseDraft.expenseId) {
        await request(`/api/events/${token}/expenses/${expenseDraft.expenseId}`, 'PATCH', payload)
      } else {
        await request(`/api/events/${token}/expenses`, 'POST', payload)
      }
      setExpenseDraft(emptyExpenseDraft())
      await refresh(false)
    } catch (error) {
      setExpenseDraft((draft) => ({ ...draft, error: errorMessage(error) }))
    }
  }

  const submitSettlementPayment = async (): Promise<void> => {
    try {
      const payload = {
        senderParticipantId: settlementDraft.senderParticipantId,
        recipientParticipantId: settlementDraft.recipientParticipantId,
        amount: settlementDraft.amount
      }
      if (settlementDraft.settlementPaymentId) {
        await request(
          `/api/events/${token}/settlement-payments/${settlementDraft.settlementPaymentId}`,
          'PATCH',
          payload
        )
      } else {
        await request(`/api/events/${token}/settlement-payments`, 'POST', payload)
      }
      setSettlementDraft(emptySettlementDraft())
      await refresh(false)
    } catch (error) {
      setSettlementDraft((draft) => ({ ...draft, error: errorMessage(error) }))
    }
  }

  const startParticipantRename = (participant: Participant): void => {
    setParticipantCorrection({
      mode: 'rename',
      participantId: participant.id,
      displayName: participant.displayName,
      error: '',
      saving: false
    })
  }

  const startParticipantDelete = (participant: Participant): void => {
    setParticipantCorrection({
      mode: 'confirmDelete',
      participantId: participant.id,
      displayName: participant.displayName,
      error: '',
      saving: false
    })
  }

  const setParticipantRenameValue = (displayName: string): void => {
    setParticipantCorrection((state) => ({
      ...state,
      displayName,
      error: ''
    }))
  }

  const cancelParticipantRename = (): void => {
    setParticipantCorrection(emptyParticipantCorrection())
  }

  const saveParticipantRename = async (): Promise<void> => {
    const participantId = participantCorrection.participantId
    const displayName = participantCorrection.displayName.trim()
    if (!participantId) return
    if (!displayName) {
      setParticipantCorrection((state) => ({
        ...state,
        error: 'Participant name is required.'
      }))
      return
    }
    setParticipantCorrection((state) => ({
      ...state,
      saving: true,
      error: ''
    }))
    try {
      const nextSnapshot = await request<EventSnapshot>(`/api/events/${token}/participants/${participantId}`, 'PATCH', { displayName })
      setSnapshot(nextSnapshot)
      setParticipantCorrection((state) => state.participantId === participantId ? emptyParticipantCorrection() : state)
    } catch (error) {
      setParticipantCorrection((state) => state.participantId === participantId
        ? {
            ...state,
            saving: false,
            error: errorMessage(error)
          }
        : state)
    }
  }

  const deleteParticipant = async (participantId: string): Promise<void> => {
    setParticipantCorrection((state) => state.participantId === participantId
      ? { ...state, saving: true, error: '' }
      : state)
    try {
      await request(`/api/events/${token}/participants/${participantId}`, 'DELETE')
      await refresh(false)
      setParticipantCorrection((state) => state.participantId === participantId ? emptyParticipantCorrection() : state)
    } catch (error) {
      setParticipantCorrection({
        mode: 'idle',
        participantId,
        displayName: '',
        error: errorMessage(error),
        saving: false
      })
    }
  }

  const editExpense = (expense: Expense): void => {
    setCurrentParticipantId(expense.payerParticipantId)
    localStorage.setItem(participantStorageKey(token), expense.payerParticipantId)
    setSelectedDefaultId(expense.payerParticipantId)
    setExpenseDraft({
      expenseId: expense.id,
      description: expense.description,
      amount: formatDraftMoneyMinor(expense.amountMinor),
      payerParticipantId: expense.payerParticipantId,
      includedParticipantIds: expense.shares.map((share) => share.participantId),
      dirty: true,
      updateWarning: '',
      error: ''
    })
    scrollIntoViewWithMotionPreference(document.querySelector('[data-expense-form]'), 'start')
  }

  const deleteExpense = async (expenseId: string): Promise<void> => {
    if (!window.confirm('Delete this expense from the Event history? Balances will update immediately.')) return
    await request(`/api/events/${token}/expenses/${expenseId}`, 'DELETE')
    await refresh(false)
  }

  const editPayment = (payment: SettlementPayment): void => {
    setSettlementDraft({
      settlementPaymentId: payment.id,
      senderParticipantId: payment.senderParticipantId,
      recipientParticipantId: payment.recipientParticipantId,
      amount: formatDraftMoneyMinor(payment.amountMinor),
      open: true,
      dirty: true,
      updateWarning: '',
      error: ''
    })
    scrollIntoViewWithMotionPreference(document.querySelector('[data-settlement-form]'), 'start')
  }

  const deletePayment = async (paymentId: string): Promise<void> => {
    if (!window.confirm('Delete this outside payment record? Balances will update immediately.')) return
    await request(`/api/events/${token}/settlement-payments/${paymentId}`, 'DELETE')
    await refresh(false)
  }

  const recordSuggestedSettlement = async (senderParticipantId: string): Promise<void> => {
    const payments = snapshot.suggestedSettlements.filter((suggestion) =>
      suggestion.senderParticipantId === senderParticipantId
    )
    if (payments.length === 0) {
      showToast('Nothing to pay')
      return
    }
    try {
      for (const payment of payments) {
        await request(`/api/events/${token}/settlement-payments`, 'POST', {
          senderParticipantId: payment.senderParticipantId,
          recipientParticipantId: payment.recipientParticipantId,
          amount: formatDraftMoneyMinor(payment.amountMinor)
        })
      }
      setPendingPayParticipantId('')
      await refresh(false)
    } catch (error) {
      window.alert(errorMessage(error))
    }
  }

  const openManualSettlementForm = (): void => {
    setSettlementDraft((draft) => ({
      ...draft,
      open: true,
      senderParticipantId: draft.senderParticipantId || snapshot.participants[0]?.id || '',
      recipientParticipantId: draft.recipientParticipantId || snapshot.participants[1]?.id || snapshot.participants[0]?.id || ''
    }))
    window.setTimeout(() => {
      const form = document.querySelector('[data-settlement-form]')
      scrollIntoViewWithMotionPreference(form, 'nearest')
      form?.querySelector<HTMLInputElement>('[name="amount"]')?.focus({ preventScroll: true })
    }, 0)
  }

  const cancelSettlementPaymentDraft = (): void => {
    setSettlementDraft(emptySettlementDraft())
  }

  const followStartGuidance = (): void => {
    const target = policy.startGuidance.target ? document.querySelector(policy.startGuidance.target) : null
    scrollIntoViewWithMotionPreference(target, 'start')
    target?.querySelector<HTMLElement>('input, select, button')?.focus({ preventScroll: true })
  }

  const expenseDraftComposition = composeExpenseDraft({
    amount: expenseDraft.amount,
    payerParticipantId: expenseDraft.payerParticipantId || effectiveCurrentParticipantId,
    participants: snapshot.participants,
    includedParticipantIds: expenseDraft.includedParticipantIds
  })
  const expensePayer = findParticipant(snapshot.participants, expenseDraft.payerParticipantId || effectiveCurrentParticipantId)
  const expenseSaveDisabled =
    expenseDraftComposition.includedParticipants.length === 0 ||
    expenseDraftComposition.equalShares.some((share) => share.amountMinor <= 0)
  const expenseSaveDisabledReason = expenseSaveDisabled
    ? expenseFormDisabledReason(expenseDraft, expenseDraftComposition)
    : ''
  const currentParticipantName = findParticipant(snapshot.participants, effectiveCurrentParticipantId).displayName

  return (
    <>
      <header className="app-top">
        <div>
          <div className="brand">
            <span className="mark" aria-hidden="true"><span /><span /></span>
            <span>SettleUp</span>
          </div>
          <div className="event-title-line">
            <h1 data-event-title>{snapshot.event.title}</h1>
            <button
              className="icon-button"
              data-copy-link
              type="button"
              aria-label="Copy Event Link"
              title="Copy Event Link"
              onClick={() => void copyEventLink()}
            >
              <span className="copy-icon" aria-hidden="true" />
            </button>
          </div>
          <p className="subtle"><span data-event-currency>{snapshot.event.currency}</span>, anyone with this link can edit.</p>
        </div>
        <div className="top-tools">
          <span className="chip chip-current" data-realtime-state>{realtimeState}</span>
        </div>
      </header>
      <div className="toast-region" aria-live="polite" aria-atomic="true" data-toast-region>
        <p className="toast-message" data-toast-message hidden={!toast.visible}>{toast.message}</p>
      </div>
      <section className="start-panel" data-start-guidance hidden={!policy.startGuidance.visible}>
        <div>
          <strong data-start-title>{policy.startGuidance.title}</strong>
          <p className="subtle" data-start-copy>{policy.startGuidance.copy}</p>
        </div>
        <button
          type="button"
          data-start-action
          aria-label={policy.startGuidance.actionLabel}
          onClick={followStartGuidance}
        >
          {policy.startGuidance.action}
        </button>
      </section>
      <div className="app-grid">
        <section className="section balances-section" data-testid="balances-panel">
          <div className="section-head">
            <h2>Balances</h2>
            <span className="amount amount-positive" data-outstanding>
              {outstandingMinor(snapshot) > 0 ? `Outstanding ${money(outstandingMinor(snapshot), snapshot.event.currency)}` : ''}
            </span>
          </div>
          <Balances
            snapshot={snapshot}
            pendingPayParticipantId={pendingPayParticipantId}
            onReviewPayBalance={setPendingPayParticipantId}
            onConfirmPayBalance={(participantId) => void recordSuggestedSettlement(participantId)}
            onCancelPayBalance={() => setPendingPayParticipantId('')}
          />
          {policy.taskRegions.recordSettlementPayment.visible ? (
            <div
              className="settlement-dock"
              data-testid="record-settlement-panel"
              data-settlement-section
              data-settlement-form-section
            >
              <div className="manual-settlement">
                <button
                  className="secondary"
                  type="button"
                  data-manual-settlement
                  disabled={!policy.settlementPaymentForm.canRecord}
                  hidden={settlementDraft.open || settlementDraft.dirty || Boolean(settlementDraft.settlementPaymentId)}
                  onClick={openManualSettlementForm}
                >
                  Record outside payment
                </button>
                <p className="control-note" data-settlement-unavailable hidden={policy.settlementPaymentForm.canRecord}>
                  {policy.settlementPaymentForm.disabledReason}
                </p>
              </div>
              <SettlementForm
                draft={settlementDraft}
                participants={snapshot.participants}
                currency={snapshot.event.currency}
                canRecord={policy.settlementPaymentForm.canRecord}
                onChange={setDirtySettlementDraft}
                onSubmit={() => void submitSettlementPayment()}
                onCancel={cancelSettlementPaymentDraft}
              />
            </div>
          ) : null}
        </section>

        <section className="section" data-testid="add-expense-panel">
          <div className="section-head">
            <div>
              <h2>Add Expense</h2>
              {policy.currentParticipantDefaults.visible ? (
                <p className="actor-summary">Paid by <strong dir="auto">{currentParticipantName}</strong></p>
              ) : null}
            </div>
            {policy.currentParticipantDefaults.visible ? (
              <div className="expense-defaults" data-testid="expense-defaults">
                <span>{policy.currentParticipantDefaults.label}</span>
                <select
                  data-current-participant
                  aria-label={policy.currentParticipantDefaults.selectorLabel}
                  value={selectedDefaultId || effectiveCurrentParticipantId}
                  onChange={(event) => switchParticipant(event.currentTarget.value)}
                >
                  {snapshot.participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>{participant.displayName}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <ExpenseForm
            draft={expenseDraft}
            participants={snapshot.participants}
            expensePolicy={policy.expenseForm}
            payerName={expensePayer.displayName}
            saveDisabled={expenseSaveDisabled}
            saveDisabledReason={expenseSaveDisabledReason}
            payerWarning={expenseDraftComposition.payerWarning || ''}
            onChange={setDirtyExpenseDraft}
            onIncludedChange={(participantId, checked) => {
              setDirtyExpenseDraft({
                includedParticipantIds: checked
                  ? Array.from(new Set([...expenseDraft.includedParticipantIds, participantId]))
                  : expenseDraft.includedParticipantIds.filter((id) => id !== participantId)
              })
            }}
            onSubmit={() => void submitExpense()}
            onAddParticipant={(displayName) => void submitParticipant(displayName)}
            participantCorrection={participantCorrection}
            onStartParticipantRename={startParticipantRename}
            onParticipantRenameChange={setParticipantRenameValue}
            onSaveParticipantRename={() => void saveParticipantRename()}
            onCancelParticipantRename={cancelParticipantRename}
            onStartParticipantDelete={startParticipantDelete}
            onDeleteParticipant={(participantId) => void deleteParticipant(participantId)}
            snapshot={snapshot}
          />
        </section>

        <section className="section" data-testid="event-history-panel">
          <div className="section-head"><h2>Event History</h2></div>
          <History
            snapshot={snapshot}
            onEditExpense={editExpense}
            onDeleteExpense={(expenseId) => void deleteExpense(expenseId)}
            onEditPayment={editPayment}
            onDeletePayment={(paymentId) => void deletePayment(paymentId)}
          />
        </section>
      </div>
    </>
  )
}

function Balances({
  snapshot,
  pendingPayParticipantId,
  onReviewPayBalance,
  onConfirmPayBalance,
  onCancelPayBalance
}: {
  snapshot: EventSnapshot
  pendingPayParticipantId: string
  onReviewPayBalance: (participantId: string) => void
  onConfirmPayBalance: (participantId: string) => void
  onCancelPayBalance: () => void
}): React.ReactElement {
  return (
    <div data-balances>
      {snapshot.balances.map((balance) => {
        const participant = findParticipant(snapshot.participants, balance.participantId)
        const suggestions = snapshot.suggestedSettlements.filter((suggestion) =>
          suggestion.senderParticipantId === participant.id
        )
        const preview = suggestions.map((suggestion) => {
          const recipient = findParticipant(snapshot.participants, suggestion.recipientParticipantId)
          return `${participant.displayName} pays ${recipient.displayName} ${money(suggestion.amountMinor, snapshot.event.currency)}`
        }).join(', ')
        const amountClass = balance.amountMinor > 0
          ? 'amount-positive'
          : balance.amountMinor < 0 ? 'amount-negative' : 'amount-zero'
        const rowClass = balance.amountMinor > 0 ? ' row-positive' : balance.amountMinor < 0 ? ' row-negative' : ''
        const phrase = balance.amountMinor > 0
          ? `is owed ${money(balance.amountMinor, snapshot.event.currency)}`
          : balance.amountMinor < 0 ? `owes ${money(Math.abs(balance.amountMinor), snapshot.event.currency)}` : 'is settled'
        const isPayReviewing = pendingPayParticipantId === participant.id
        return (
          <div className={`ledger-row balance-row${rowClass}${isPayReviewing ? ' row-reviewing' : ''}`} key={balance.participantId}>
            <div>
              <strong>{participant.displayName}</strong>
              {isPayReviewing ? (
                <p className="control-note pay-preview" data-pay-preview>{preview || 'No suggested payment to record.'}</p>
              ) : null}
            </div>
            {isPayReviewing ? (
              <span className="row-actions balance-actions balance-review-actions">
                <button
                  type="button"
                  data-confirm-pay-balance={participant.id}
                  onClick={() => onConfirmPayBalance(participant.id)}
                >
                  Record payment
                </button>
                <button className="secondary" type="button" onClick={onCancelPayBalance}>Cancel</button>
              </span>
            ) : (
              <span className="row-actions balance-actions">
                {balance.amountMinor < 0 ? (
                  <button
                    className="secondary"
                    type="button"
                    data-pay-balance={participant.id}
                    aria-label={`Review payment for ${participant.displayName} owing ${money(Math.abs(balance.amountMinor), snapshot.event.currency)}`}
                    onClick={() => onReviewPayBalance(participant.id)}
                  >
                    Pay
                  </button>
                ) : null}
                <span className={`amount ${amountClass}`}>{phrase}</span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ExpenseForm({
  draft,
  participants,
  expensePolicy,
  payerName,
  saveDisabled,
  saveDisabledReason,
  payerWarning,
  onChange,
  onIncludedChange,
  onSubmit,
  onAddParticipant,
  participantCorrection,
  onStartParticipantRename,
  onParticipantRenameChange,
  onSaveParticipantRename,
  onCancelParticipantRename,
  onStartParticipantDelete,
  onDeleteParticipant,
  snapshot
}: {
  draft: ExpenseDraftState
  participants: Participant[]
  expensePolicy: EventPagePolicy['expenseForm']
  payerName: string
  saveDisabled: boolean
  saveDisabledReason: string
  payerWarning: string
  onChange: (update: Partial<ExpenseDraftState>) => void
  onIncludedChange: (participantId: string, checked: boolean) => void
  onSubmit: () => void
  onAddParticipant: (displayName: string) => void
  participantCorrection: ParticipantCorrectionState
  onStartParticipantRename: (participant: Participant) => void
  onParticipantRenameChange: (displayName: string) => void
  onSaveParticipantRename: () => void
  onCancelParticipantRename: () => void
  onStartParticipantDelete: (participant: Participant) => void
  onDeleteParticipant: (participantId: string) => void
  snapshot: EventSnapshot
}): React.ReactElement {
  const [newParticipantName, setNewParticipantName] = useState('')
  const expenseErrorId = 'expense-error'
  const expenseErrorTarget = expenseFormErrorTarget(draft.error)
  const expenseFieldsetDescription = [
    expenseErrorTarget === 'participants' ? expenseErrorId : '',
    payerWarning ? 'expense-payer-warning' : ''
  ].filter(Boolean).join(' ') || undefined

  const submitParticipant = (): void => {
    const displayName = newParticipantName.trim()
    if (!displayName) return
    onAddParticipant(displayName)
    setNewParticipantName('')
  }
  const participantAddRow = (
    <div className="embedded-block participant-manager" data-participant-form>
      <div className="inline-form compact-form participant-add-row">
        <label>
          <span className="sr-only">Display name</span>
          <input
            type="text"
            name="displayName"
            placeholder="Name"
            value={newParticipantName}
            onChange={(event) => setNewParticipantName(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              submitParticipant()
            }}
          />
        </label>
        <button type="button" aria-label="Add Participant" data-add-participant onClick={submitParticipant}>
          Add
        </button>
      </div>
    </div>
  )

  if (!expensePolicy.canRecord) {
    return (
      <form
        className="inline-form"
        data-expense-form
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
        }}
      >
        <div className="expense-onboarding" data-expense-onboarding>
          <strong>{expensePolicy.onboardingTitle}</strong>
          <p>{expensePolicy.onboardingCopy}</p>
        </div>
        {participantAddRow}
      </form>
    )
  }

  return (
    <form
      className="inline-form"
      data-expense-form
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <p className="control-note payer-note" data-payer-note>Paid by {payerName}.</p>
      <div className="form-grid expense-entry-row">
        <label>
          <span>Description</span>
          <input
            type="text"
            name="description"
            required
            placeholder="Dinner"
            value={draft.description}
            aria-invalid={expenseErrorTarget === 'description' ? 'true' : undefined}
            aria-describedby={expenseErrorTarget === 'description' ? expenseErrorId : undefined}
            onChange={(event) => onChange({ description: event.currentTarget.value, error: '' })}
          />
        </label>
        <label>
          <span>Amount</span>
          <input
            type="text"
            name="amount"
            inputMode="decimal"
            required
            placeholder="80.00"
            value={draft.amount}
            aria-invalid={expenseErrorTarget === 'amount' ? 'true' : undefined}
            aria-describedby={expenseErrorTarget === 'amount' ? expenseErrorId : undefined}
            onChange={(event) => onChange({ amount: event.currentTarget.value, error: '' })}
          />
        </label>
        <button
          type="submit"
          disabled={saveDisabled}
          aria-describedby={saveDisabledReason ? 'save-expense-unavailable' : undefined}
        >
          Save expense
        </button>
      </div>
      <p
        className="control-note save-disabled-note"
        id="save-expense-unavailable"
        data-save-expense-unavailable
        hidden={!saveDisabledReason}
      >
        {saveDisabledReason}
      </p>
      <input type="hidden" name="expenseId" value={draft.expenseId} readOnly />
      <input type="hidden" name="payerParticipantId" value={draft.payerParticipantId} readOnly />
      <fieldset
        className="included-panel"
        aria-invalid={expenseErrorTarget === 'participants' ? 'true' : undefined}
        aria-describedby={expenseFieldsetDescription}
      >
        <legend>Split between</legend>
        <div data-included-participants data-participants className="included-list">
          {participants.map((participant) => {
            const deleteState = participantDeleteState(snapshot, participant.id)
            const referenced = !deleteState.canDelete && deleteState.reason === 'Referenced Participants cannot be deleted.'
            const included = draft.includedParticipantIds.includes(participant.id)
            const isRenaming = participantCorrection.mode === 'rename' && participantCorrection.participantId === participant.id
            const isDeleting = participantCorrection.mode === 'confirmDelete' && participantCorrection.participantId === participant.id
            const rowError = participantCorrection.participantId === participant.id ? participantCorrection.error : ''
            const errorId = `participant-correction-error-${participant.id}`
            return (
              <div className={`ledger-row participant-row${isRenaming || isDeleting ? ' participant-row-editing' : ''}`} key={participant.id}>
                <label className="participant-split">
                  <input
                    type="checkbox"
                    name="includedParticipantId"
                    aria-label={`Split with ${participant.displayName}`}
                    value={participant.id}
                    checked={included}
                    onChange={(event) => onIncludedChange(participant.id, event.currentTarget.checked)}
                  />
                </label>
                <div className="participant-summary">
                  {isRenaming ? (
                    <label className="participant-rename-label">
                      <span>Participant name</span>
                      <input
                        type="text"
                        name="participantDisplayName"
                        required
                        autoComplete="off"
                        dir="auto"
                        value={participantCorrection.displayName}
                        aria-invalid={rowError ? 'true' : undefined}
                        aria-describedby={rowError ? errorId : undefined}
                        autoFocus
                        onChange={(event) => onParticipantRenameChange(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            onSaveParticipantRename()
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault()
                            onCancelParticipantRename()
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <>
                      <strong dir="auto">{participant.displayName}</strong>
                      <span className="participant-meta">
                        <span className={included ? 'participant-inclusion included' : 'participant-inclusion'}>
                          {included ? 'Included in split' : 'Not in split'}
                        </span>
                        {referenced ? <span className="participant-reference">used in records</span> : null}
                      </span>
                    </>
                  )}
                </div>
                <span className="row-actions participant-actions">
                  {isRenaming ? (
                    <>
                      <button
                        type="button"
                        aria-label={`Save name for ${participant.displayName}`}
                        disabled={participantCorrection.saving || !participantCorrection.displayName.trim()}
                        onClick={onSaveParticipantRename}
                      >
                        {participantCorrection.saving ? 'Saving...' : 'Save name'}
                      </button>
                      <button
                        className="secondary"
                        type="button"
                        aria-label={`Cancel renaming ${participant.displayName}`}
                        disabled={participantCorrection.saving}
                        onClick={onCancelParticipantRename}
                      >
                        Cancel
                      </button>
                    </>
                  ) : isDeleting ? (
                    <>
                      <span className="control-note participant-confirmation">Delete <strong dir="auto">{participant.displayName}</strong>?</span>
                      <button
                        className="danger"
                        type="button"
                        aria-label={`Confirm delete participant ${participant.displayName}`}
                        disabled={participantCorrection.saving}
                        onClick={() => onDeleteParticipant(participant.id)}
                      >
                        {participantCorrection.saving ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        className="secondary"
                        type="button"
                        aria-label={`Cancel deleting ${participant.displayName}`}
                        disabled={participantCorrection.saving}
                        onClick={onCancelParticipantRename}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="secondary"
                        type="button"
                        data-rename-participant={participant.id}
                        aria-label={`Rename participant ${participant.displayName}`}
                        onClick={() => onStartParticipantRename(participant)}
                      >
                        Rename
                      </button>
                      {deleteState.canDelete ? (
                        <button
                          className="danger"
                          type="button"
                          data-delete-participant={participant.id}
                          aria-label={`Delete participant ${participant.displayName}`}
                          onClick={() => onStartParticipantDelete(participant)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </>
                  )}
                </span>
                {rowError ? (
                  <p className="error participant-correction-error" id={errorId} role="alert">
                    {rowError}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
        <p className="control-note" id="expense-payer-warning" data-payer-warning hidden={!payerWarning}>{payerWarning}</p>
        {participantAddRow}
      </fieldset>
      <p className="control-note draft-warning" data-expense-update-warning aria-live="polite">{draft.updateWarning}</p>
      <p
        className="error"
        id={expenseErrorId}
        data-expense-error
        role="alert"
        hidden={!draft.error}
      >
        {draft.error}
      </p>
    </form>
  )
}

function SettlementForm({
  draft,
  participants,
  currency,
  canRecord,
  onChange,
  onSubmit,
  onCancel
}: {
  draft: SettlementDraftState
  participants: Participant[]
  currency: string
  canRecord: boolean
  onChange: (update: Partial<SettlementDraftState>) => void
  onSubmit: () => void
  onCancel: () => void
}): React.ReactElement {
  const sender = findParticipant(participants, draft.senderParticipantId)
  const recipient = findParticipant(participants, draft.recipientParticipantId)
  const amountMinor = parseDraftMoneyMinor(draft.amount)
  const hasPaymentAmount = amountMinor !== null && amountMinor > 0
  const settlementErrorId = 'settlement-error'
  const settlementErrorTarget = settlementFormErrorTarget(draft.error)
  const preview = hasPaymentAmount
    ? `${sender.displayName} paid ${recipient.displayName} ${money(amountMinor, currency)} outside SettleUp.`
    : `${sender.displayName} paid ${recipient.displayName} outside SettleUp. Enter an amount to finish the record.`

  return (
    <form
      className="inline-form settlement-form"
      data-settlement-form
      hidden={!draft.open && !draft.dirty && !draft.settlementPaymentId}
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <input type="hidden" name="settlementPaymentId" value={draft.settlementPaymentId} readOnly />
      <p className="control-note settlement-intent">
        Record money that already moved outside SettleUp. This updates balances only.
      </p>
      <div className="settlement-party-row">
        <label>
          <span>Who paid</span>
          <select
            name="senderParticipantId"
            data-participant-select
            value={draft.senderParticipantId}
            aria-invalid={settlementErrorTarget === 'participants' ? 'true' : undefined}
            aria-describedby={settlementErrorTarget === 'participants' ? settlementErrorId : undefined}
            onChange={(event) => onChange({ senderParticipantId: event.currentTarget.value, error: '' })}
          >
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>{participant.displayName}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Who received</span>
          <select
            name="recipientParticipantId"
            data-participant-select
            value={draft.recipientParticipantId}
            aria-invalid={settlementErrorTarget === 'participants' ? 'true' : undefined}
            aria-describedby={settlementErrorTarget === 'participants' ? settlementErrorId : undefined}
            onChange={(event) => onChange({ recipientParticipantId: event.currentTarget.value, error: '' })}
          >
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>{participant.displayName}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="settlement-action-row">
        <label>
          <span className="sr-only">Amount</span>
          <input
            type="text"
            name="amount"
            inputMode="decimal"
            aria-label="Amount"
            placeholder="24.00"
            value={draft.amount}
            aria-invalid={settlementErrorTarget === 'amount' ? 'true' : undefined}
            aria-describedby={settlementErrorTarget === 'amount' ? settlementErrorId : undefined}
            onChange={(event) => onChange({ amount: event.currentTarget.value, error: '' })}
          />
        </label>
        <button type="submit" disabled={!canRecord}>Record payment</button>
        <button className="secondary" type="button" data-cancel-settlement onClick={onCancel}>Cancel</button>
      </div>
      <p className="settlement-preview" data-settlement-preview aria-live="polite">{preview}</p>
      <p className="control-note draft-warning" data-settlement-update-warning aria-live="polite">{draft.updateWarning}</p>
      <p
        className="error"
        id={settlementErrorId}
        data-settlement-error
        role="alert"
        hidden={!draft.error}
      >
        {draft.error}
      </p>
    </form>
  )
}

function History({
  snapshot,
  onEditExpense,
  onDeleteExpense,
  onEditPayment,
  onDeletePayment
}: {
  snapshot: EventSnapshot
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (expenseId: string) => void
  onEditPayment: (payment: SettlementPayment) => void
  onDeletePayment: (paymentId: string) => void
}): React.ReactElement {
  const items = eventHistoryItems(snapshot)
  if (items.length === 0) {
    return <div data-history><p className="empty">No Event history yet. Expenses and payments will appear here.</p></div>
  }

  return (
    <div data-history>
      {items.map((item) => {
        if (item.kind === 'expense') {
          const expense = item.record as Expense
          const payer = findParticipant(snapshot.participants, expense.payerParticipantId)
          const shares = historyShareSummary(snapshot.participants, expense.shares, snapshot.event.currency)
          const expenseActionLabel = `${expense.description}, ${money(expense.amountMinor, snapshot.event.currency)}`
          return (
            <div className="ledger-row record-row history-record" key={`expense-${expense.id}`}>
              <div className="history-main">
                <div className="history-title-line">
                  <span className="history-kind">Expense</span>
                  <h3 dir="auto">{expense.description}</h3>
                </div>
                <p className="history-summary">
                  <strong dir="auto">{payer.displayName}</strong> paid {money(expense.amountMinor, snapshot.event.currency)}
                </p>
                <p className="history-detail">
                  <span>Split between</span> {shares}
                </p>
              </div>
              <div className="history-side">
                <span className="amount">{money(expense.amountMinor, snapshot.event.currency)}</span>
                <span className="row-actions history-actions">
                  <button
                    className="secondary"
                    type="button"
                    data-edit-expense={expense.id}
                    aria-label={`Edit expense ${expenseActionLabel}`}
                    onClick={() => onEditExpense(expense)}
                  >
                    Edit
                  </button>
                  <button
                    className="danger"
                    type="button"
                    data-delete-expense={expense.id}
                    aria-label={`Delete expense ${expenseActionLabel}`}
                    onClick={() => onDeleteExpense(expense.id)}
                  >
                    Delete
                  </button>
                </span>
              </div>
            </div>
          )
        }
        const payment = item.record as SettlementPayment
        const sender = findParticipant(snapshot.participants, payment.senderParticipantId)
        const recipient = findParticipant(snapshot.participants, payment.recipientParticipantId)
        const paymentActionLabel = `${sender.displayName} paid ${recipient.displayName}, ${money(payment.amountMinor, snapshot.event.currency)}`
        return (
          <div className="ledger-row record-row history-record row-positive" key={`payment-${payment.id}`}>
            <div className="history-main">
              <div className="history-title-line">
                <span className="history-kind">Payment</span>
                <strong><span dir="auto">{sender.displayName}</span> paid <span dir="auto">{recipient.displayName}</span></strong>
              </div>
              <p className="history-summary">Recorded payment outside SettleUp</p>
            </div>
            <div className="history-side">
              <span className="amount amount-positive">{money(payment.amountMinor, snapshot.event.currency)}</span>
              <span className="row-actions history-actions">
                <button
                  className="secondary"
                  type="button"
                  data-edit-payment={payment.id}
                  aria-label={`Edit payment ${paymentActionLabel}`}
                  onClick={() => onEditPayment(payment)}
                >
                  Edit
                </button>
                <button
                  className="danger"
                  type="button"
                  data-delete-payment={payment.id}
                  aria-label={`Delete payment ${paymentActionLabel}`}
                  onClick={() => onDeletePayment(payment.id)}
                >
                  Delete
                </button>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function emptyExpenseDraft(): ExpenseDraftState {
  return {
    expenseId: '',
    description: '',
    amount: '',
    payerParticipantId: '',
    includedParticipantIds: [],
    dirty: false,
    updateWarning: '',
    error: ''
  }
}

function emptySettlementDraft(): SettlementDraftState {
  return {
    settlementPaymentId: '',
    senderParticipantId: '',
    recipientParticipantId: '',
    amount: '',
    open: false,
    dirty: false,
    updateWarning: '',
    error: ''
  }
}

function emptyParticipantCorrection(): ParticipantCorrectionState {
  return {
    mode: 'idle',
    participantId: '',
    displayName: '',
    error: '',
    saving: false
  }
}

function participantStorageKey(token: string): string {
  return `settleup:participant:${token}`
}

function realtimeUrl(token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${eventRealtimeRoutePath(token)}`
}

function scrollIntoViewWithMotionPreference(element: Element | null, block: ScrollLogicalPosition): void {
  if (!element) return
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block
  })
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function includedParticipantsFor(participants: Participant[], includedParticipantIds: string[]): Participant[] {
  const includedIds = new Set(includedParticipantIds)
  return participants.filter((participant) => includedIds.has(participant.id))
}

function findParticipant(participants: Participant[], id: string): Participant {
  return participants.find((participant) => participant.id === id) || {
    id,
    displayName: 'Unknown Participant',
    order: 0,
    createdAt: ''
  }
}

function historyShareSummary(participants: Participant[], shares: Expense['shares'], currency: string): string {
  return shares.map((share) => {
    const participant = findParticipant(participants, share.participantId)
    return `${participant.displayName} ${money(share.amountMinor, currency)}`
  }).join(', ')
}

function money(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency
  }).format(amountMinor / 100)
}

function outstandingMinor(snapshot: EventSnapshot): number {
  return snapshot.balances.reduce((total, balance) => total + Math.max(balance.amountMinor, 0), 0)
}

function expenseFormDisabledReason(draft: ExpenseDraftState, draftComposition: ReturnType<typeof composeExpenseDraft>): string {
  if (draftComposition.includedParticipants.length === 0) {
    return 'Choose at least one Participant to split this expense.'
  }
  if (!draft.amount.trim()) {
    return 'Enter an amount before saving.'
  }
  if (draftComposition.equalShares.some((share) => share.amountMinor <= 0)) {
    return 'Enter an amount large enough to split between the selected Participants.'
  }
  return ''
}

async function request<T = unknown>(path: string, method: RequestMethod, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: 'Request failed' } })) as {
      error?: { message?: string }
    }
    throw new Error(payload.error?.message || 'Request failed')
  }
  return response.json().catch(() => null) as Promise<T>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed'
}

function expenseFormErrorTarget(error: string): 'description' | 'amount' | 'participants' | 'form' {
  const normalized = error.toLowerCase()
  if (!normalized) return 'form'
  if (normalized.includes('description')) return 'description'
  if (normalized.includes('amount') || normalized.includes('decimal') || normalized.includes('positive')) return 'amount'
  if (normalized.includes('split') || normalized.includes('participant')) return 'participants'
  return 'form'
}

function settlementFormErrorTarget(error: string): 'amount' | 'participants' | 'form' {
  const normalized = error.toLowerCase()
  if (!normalized) return 'form'
  if (normalized.includes('amount') || normalized.includes('decimal') || normalized.includes('positive')) return 'amount'
  if (
    normalized.includes('participant') ||
    normalized.includes('sender') ||
    normalized.includes('recipient') ||
    normalized.includes('paid') ||
    normalized.includes('received')
  ) {
    return 'participants'
  }
  return 'form'
}
