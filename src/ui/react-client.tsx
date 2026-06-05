import {
  ArrowRight,
  Check,
  Copy,
  History,
  Link,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  Users,
  WalletCards,
  X
} from 'lucide-react'
import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

import type {
  Expense,
  EventSnapshot,
  Participant,
  SettlementPayment,
  SuggestedSettlement
} from '../domain'
import {
  REALTIME_FALLBACK_POLL_MS,
  eventRealtimeReconnectDelay,
  eventRealtimeRoutePath,
  parseEventRealtimeMessage
} from '../event-realtime-protocol'
import {
  composeExpenseDraft,
  formatDraftMoneyMinor,
  parseDraftMoneyMinor
} from './client-expense-draft'
import {
  composeEventPagePolicy,
  type EventHistoryItem,
  type EventPagePolicy
} from './client-event-page-policy'

interface ExpenseDraft {
  id: string | null
  description: string
  amount: string
  payerParticipantId: string
  includedParticipantIds: string[]
}

interface SettlementDraft {
  id: string | null
  open: boolean
  senderParticipantId: string
  recipientParticipantId: string
  amount: string
}

interface ParticipantCorrection {
  participantId: string
  displayName: string
}

type RealtimeState =
  | 'Live updates connecting'
  | 'Live updates on'
  | 'Live updates reconnecting, polling'
  | 'Live updates unavailable, polling'

const appIconPath = '/icon.svg'
const buttonTouchClassName = 'min-h-11 sm:min-h-0'
const draftReviewWarning = 'Event updated while you were editing. Review before saving.'

function emptyExpenseDraft(): ExpenseDraft {
  return {
    id: null,
    description: '',
    amount: '',
    payerParticipantId: '',
    includedParticipantIds: []
  }
}

function emptySettlementDraft(): SettlementDraft {
  return {
    id: null,
    open: false,
    senderParticipantId: '',
    recipientParticipantId: '',
    amount: ''
  }
}

function emptyParticipantCorrection(): ParticipantCorrection {
  return {
    participantId: '',
    displayName: ''
  }
}

function EventApp({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null)
  const [currentParticipantId, setCurrentParticipantId] = useState('')
  const [realtimeState, setRealtimeState] = useState<RealtimeState>('Live updates connecting')
  const [toast, setToast] = useState('')
  const [newParticipantName, setNewParticipantName] = useState('')
  const [participantCorrection, setParticipantCorrection] = useState<ParticipantCorrection>(emptyParticipantCorrection)
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(emptyExpenseDraft)
  const [settlementDraft, setSettlementDraft] = useState<SettlementDraft>(emptySettlementDraft)
  const [expenseError, setExpenseError] = useState('')
  const [settlementError, setSettlementError] = useState('')
  const [expenseUpdateWarning, setExpenseUpdateWarning] = useState('')
  const [settlementUpdateWarning, setSettlementUpdateWarning] = useState('')
  const [pendingPayParticipantId, setPendingPayParticipantId] = useState('')

  const snapshotRef = useRef<EventSnapshot | null>(null)
  const dirtyRef = useRef(false)
  const expenseDraftRef = useRef<ExpenseDraft>(expenseDraft)
  const settlementDraftRef = useRef<SettlementDraft>(settlementDraft)
  const pollingRef = useRef<number | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  const policy = useMemo(() => (
    snapshot ? composeEventPagePolicy(snapshot) : null
  ), [snapshot])
  const effectiveCurrentParticipantId = useMemo(() => (
    currentParticipantId || snapshot?.participants[0]?.id || ''
  ), [currentParticipantId, snapshot])

  const setTimedToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(''), 3500)
  }, [])

  const refresh = useCallback(async (quiet = false, message = '') => {
    const latest = await request<EventSnapshot>(`/api/events/${token}`)
    snapshotRef.current = latest
    setSnapshot(latest)
    if (!quiet && message) {
      setTimedToast(message)
    }
    if (quiet && message && dirtyRef.current) {
      if (hasDirtyExpenseDraft(expenseDraftRef.current)) {
        setExpenseUpdateWarning(draftReviewWarning)
      }
      if (hasDirtySettlementDraft(settlementDraftRef.current)) {
        setSettlementUpdateWarning(draftReviewWarning)
      }
      setTimedToast(message)
    }
  }, [setTimedToast, token])

  const startPolling = useCallback(() => {
    if (pollingRef.current !== null) return
    pollingRef.current = window.setInterval(() => {
      refresh(true, 'Event data refreshed. Draft fields stayed unchanged.').catch(() => undefined)
    }, REALTIME_FALLBACK_POLL_MS)
  }, [refresh])

  const stopPolling = useCallback(() => {
    if (pollingRef.current === null) return
    window.clearInterval(pollingRef.current)
    pollingRef.current = null
  }, [])

  useEffect(() => {
    refresh().catch((error: unknown) => {
      setTimedToast(errorMessage(error))
    })
  }, [refresh, setTimedToast])

  useEffect(() => {
    if (!snapshot) return

    const storedParticipantId = readStoredParticipantId(token, snapshot.participants)
    const fallbackParticipantId = snapshot.participants[0]?.id || ''
    const nextCurrentParticipantId = participantExists(snapshot.participants, currentParticipantId)
      ? currentParticipantId
      : storedParticipantId || fallbackParticipantId

    if (nextCurrentParticipantId !== currentParticipantId) {
      setCurrentParticipantId(nextCurrentParticipantId)
    }

    setExpenseDraft((draft) => reconcileExpenseDraft(draft, snapshot.participants, nextCurrentParticipantId))
    setSettlementDraft((draft) => reconcileSettlementDraft(draft, snapshot.participants))
  }, [currentParticipantId, snapshot, token])

  useEffect(() => {
    const realtimePath = eventRealtimeRoutePath(token)
    const wsUrl = realtimeUrl(realtimePath)
    let socket: WebSocket | null = null
    let reconnectTimer: number | null = null
    let reconnectAttempt = 0
    let stopped = false

    const connect = () => {
      if (stopped) return
      setRealtimeState(reconnectAttempt === 0 ? 'Live updates connecting' : 'Live updates reconnecting, polling')
      if (reconnectAttempt > 0) {
        startPolling()
      }

      socket = new WebSocket(wsUrl)
      socket.addEventListener('open', () => {
        reconnectAttempt = 0
        stopPolling()
        setRealtimeState('Live updates on')
      })
      socket.addEventListener('message', (event) => {
        const message = parseEventRealtimeMessage(event.data)
        if (message) {
          refresh(true, 'Event updated. Draft fields stayed unchanged.').catch(() => undefined)
        }
      })
      socket.addEventListener('close', () => {
        if (stopped) return
        reconnectAttempt += 1
        setRealtimeState('Live updates reconnecting, polling')
        startPolling()
        reconnectTimer = window.setTimeout(connect, eventRealtimeReconnectDelay(reconnectAttempt))
      })
      socket.addEventListener('error', () => {
        setRealtimeState('Live updates unavailable, polling')
        startPolling()
      })
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer)
      }
      socket?.close()
      stopPolling()
    }
  }, [refresh, startPolling, stopPolling, token])

  useEffect(() => {
    expenseDraftRef.current = expenseDraft
    settlementDraftRef.current = settlementDraft
    const dirty = Boolean(
      hasDirtyExpenseDraft(expenseDraft) ||
      hasDirtySettlementDraft(settlementDraft) ||
      newParticipantName.trim() ||
      participantCorrection.participantId
    )
    dirtyRef.current = dirty
  }, [expenseDraft, newParticipantName, participantCorrection, settlementDraft])

  useEffect(() => {
    const warnOnUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnOnUnload)
    return () => window.removeEventListener('beforeunload', warnOnUnload)
  }, [])

  useEffect(() => () => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  if (!snapshot || !policy) {
    return <LoadingPage realtimeState={realtimeState} />
  }

  const switchParticipant = (participantId: string) => {
    setCurrentParticipantId(participantId)
    window.localStorage.setItem(participantStorageKey(token), participantId)
    setExpenseDraft((draft) => ({
      ...draft,
      payerParticipantId: participantId,
      includedParticipantIds: includedParticipantsFor(draft.includedParticipantIds, participantId)
    }))
  }

  const showError = (error: unknown) => setTimedToast(errorMessage(error))

  const applySnapshot = (latest: EventSnapshot) => {
    snapshotRef.current = latest
    setSnapshot(latest)
  }

  const submitParticipant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const displayName = newParticipantName.trim()
    if (!displayName) return

    try {
      const previousIds = new Set(snapshot.participants.map((participant) => participant.id))
      const latest = await request<EventSnapshot>(`/api/events/${token}/participants`, {
        method: 'POST',
        body: JSON.stringify({ displayName })
      })
      const newParticipant = latest.participants.find((participant) => !previousIds.has(participant.id))
      applySnapshot(latest)
      setNewParticipantName('')
      if (newParticipant) {
        setExpenseDraft((draft) => ({
          ...draft,
          includedParticipantIds: [...new Set([...draft.includedParticipantIds, newParticipant.id])]
        }))
      }
      setTimedToast('Participant added')
    } catch (error: unknown) {
      showError(error)
    }
  }

  const submitParticipantCorrection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!participantCorrection.participantId || !participantCorrection.displayName.trim()) return
    try {
      const latest = await request<EventSnapshot>(
        `/api/events/${token}/participants/${participantCorrection.participantId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ displayName: participantCorrection.displayName })
        }
      )
      applySnapshot(latest)
      setParticipantCorrection(emptyParticipantCorrection())
      setTimedToast('Participant renamed')
    } catch (error: unknown) {
      showError(error)
    }
  }

  const deleteParticipant = async (participant: Participant) => {
    const deleteState = policy.participants.deleteById[participant.id]
    if (!deleteState?.canDelete) {
      setTimedToast(deleteState?.reason || 'Participant cannot be deleted.')
      return
    }
    if (!window.confirm(`Delete ${participant.displayName}?`)) return
    try {
      const latest = await request<EventSnapshot>(`/api/events/${token}/participants/${participant.id}`, {
        method: 'DELETE'
      })
      applySnapshot(latest)
      if (currentParticipantId === participant.id) {
        setCurrentParticipantId(latest.participants[0]?.id || '')
      }
      setTimedToast('Participant deleted')
    } catch (error: unknown) {
      showError(error)
    }
  }

  const submitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const draftComposition = composeExpenseDraft({
      amount: expenseDraft.amount,
      payerParticipantId: expenseDraft.payerParticipantId,
      participants: snapshot.participants,
      includedParticipantIds: expenseDraft.includedParticipantIds
    })
    const disabledReason = expenseFormDisabledReason(policy, expenseDraft, draftComposition.equalShares.length)
    if (disabledReason) {
      setExpenseError(disabledReason)
      setTimedToast(disabledReason)
      return
    }

    try {
      const url = expenseDraft.id
        ? `/api/events/${token}/expenses/${expenseDraft.id}`
        : `/api/events/${token}/expenses`
      const latest = await request<EventSnapshot>(url, {
        method: expenseDraft.id ? 'PATCH' : 'POST',
        body: JSON.stringify({
          description: expenseDraft.description,
          amount: expenseDraft.amount,
          payerParticipantId: expenseDraft.payerParticipantId,
          includedParticipantIds: expenseDraft.includedParticipantIds
        })
      })
      applySnapshot(latest)
      setExpenseError('')
      setExpenseDraft(reconcileExpenseDraft(emptyExpenseDraft(), latest.participants, effectiveCurrentParticipantId))
      setTimedToast(expenseDraft.id ? 'Expense updated' : 'Expense added')
    } catch (error: unknown) {
      setExpenseError(errorMessage(error))
      showError(error)
    }
  }

  const deleteExpense = async (expense: Expense) => {
    if (!window.confirm('Delete this expense from the Event history? Balances will update immediately.')) return
    try {
      const latest = await request<EventSnapshot>(`/api/events/${token}/expenses/${expense.id}`, {
        method: 'DELETE'
      })
      applySnapshot(latest)
      setTimedToast('Expense deleted')
    } catch (error: unknown) {
      showError(error)
    }
  }

  const editExpense = (expense: Expense) => {
    switchParticipant(expense.payerParticipantId)
    setExpenseDraft({
      id: expense.id,
      description: expense.description,
      amount: formatDraftMoneyMinor(expense.amountMinor),
      payerParticipantId: expense.payerParticipantId,
      includedParticipantIds: expense.shares.map((share) => share.participantId)
    })
    scrollIntoViewWithMotionPreference('[data-expense-form]')
  }

  const submitSettlementPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const disabledReason = settlementFormDisabledReason(policy, settlementDraft)
    if (disabledReason) {
      setSettlementError(disabledReason)
      setTimedToast(disabledReason)
      return
    }
    try {
      const url = settlementDraft.id
        ? `/api/events/${token}/settlement-payments/${settlementDraft.id}`
        : `/api/events/${token}/settlement-payments`
      const latest = await request<EventSnapshot>(url, {
        method: settlementDraft.id ? 'PATCH' : 'POST',
        body: JSON.stringify({
          senderParticipantId: settlementDraft.senderParticipantId,
          recipientParticipantId: settlementDraft.recipientParticipantId,
          amount: settlementDraft.amount
        })
      })
      applySnapshot(latest)
      setSettlementError('')
      setSettlementDraft(reconcileSettlementDraft(emptySettlementDraft(), latest.participants))
      setTimedToast(settlementDraft.id ? 'Payment updated' : 'Payment recorded')
    } catch (error: unknown) {
      setSettlementError(errorMessage(error))
      showError(error)
    }
  }

  const deleteSettlementPayment = async (payment: SettlementPayment) => {
    if (!window.confirm('Delete this outside payment record? Balances will update immediately.')) return
    try {
      const latest = await request<EventSnapshot>(`/api/events/${token}/settlement-payments/${payment.id}`, {
        method: 'DELETE'
      })
      applySnapshot(latest)
      setTimedToast('Payment deleted')
    } catch (error: unknown) {
      showError(error)
    }
  }

  const editSettlementPayment = (payment: SettlementPayment) => {
    setSettlementDraft({
      id: payment.id,
      open: true,
      senderParticipantId: payment.senderParticipantId,
      recipientParticipantId: payment.recipientParticipantId,
      amount: formatDraftMoneyMinor(payment.amountMinor)
    })
    scrollIntoViewWithMotionPreference('[data-settlement-form]')
  }

  const openManualSettlementForm = (suggestion?: SuggestedSettlement) => {
    setSettlementDraft((draft) => ({
      ...draft,
      open: true,
      id: null,
      senderParticipantId: suggestion?.senderParticipantId || draft.senderParticipantId || snapshot.participants[0]?.id || '',
      recipientParticipantId: suggestion?.recipientParticipantId || draft.recipientParticipantId || snapshot.participants[1]?.id || snapshot.participants[0]?.id || '',
      amount: suggestion ? formatDraftMoneyMinor(suggestion.amountMinor) : draft.amount
    }))
    window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('[data-settlement-form] input[name="amount"]')
      input?.focus()
    })
  }

  const recordSuggestedSettlement = async (senderParticipantId: string) => {
    const suggestions = snapshot.suggestedSettlements.filter(
      (suggestion) => suggestion.senderParticipantId === senderParticipantId
    )
    if (suggestions.length === 0) {
      setTimedToast('Nothing to pay')
      return
    }

    setPendingPayParticipantId(senderParticipantId)
    try {
      let latest = snapshot
      for (const suggestion of suggestions) {
        latest = await request<EventSnapshot>(`/api/events/${token}/settlement-payments`, {
          method: 'POST',
          body: JSON.stringify({
            senderParticipantId: suggestion.senderParticipantId,
            recipientParticipantId: suggestion.recipientParticipantId,
            amount: formatDraftMoneyMinor(suggestion.amountMinor)
          })
        })
      }
      applySnapshot(latest)
      setTimedToast('Suggested payment recorded')
    } catch (error: unknown) {
      showError(error)
    } finally {
      setPendingPayParticipantId('')
    }
  }

  const copyEventLink = async () => {
    try {
      await window.navigator.clipboard.writeText(window.location.href)
      setTimedToast('Event Link copied')
    } catch {
      setTimedToast('Copy failed')
    }
  }

  const followStartGuidance = () => {
    if (!policy.startGuidance.visible) return
    scrollIntoViewWithMotionPreference(policy.startGuidance.target)
    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(
        `${policy.startGuidance.target} input, ${policy.startGuidance.target} [role="combobox"], ${policy.startGuidance.target} button`
      )
      target?.focus()
    })
  }

  return (
    <EventPage
      copyEventLink={copyEventLink}
      currentParticipantId={effectiveCurrentParticipantId}
      deleteExpense={deleteExpense}
      deleteParticipant={deleteParticipant}
      deleteSettlementPayment={deleteSettlementPayment}
      editExpense={editExpense}
      editSettlementPayment={editSettlementPayment}
      expenseDraft={expenseDraft}
      expenseError={expenseError}
      expenseUpdateWarning={expenseUpdateWarning}
      followStartGuidance={followStartGuidance}
      newParticipantName={newParticipantName}
      openManualSettlementForm={openManualSettlementForm}
      participantCorrection={participantCorrection}
      pendingPayParticipantId={pendingPayParticipantId}
      policy={policy}
      realtimeState={realtimeState}
      recordSuggestedSettlement={recordSuggestedSettlement}
      setExpenseDraft={setExpenseDraft}
      setExpenseError={setExpenseError}
      setExpenseUpdateWarning={setExpenseUpdateWarning}
      setNewParticipantName={setNewParticipantName}
      setParticipantCorrection={setParticipantCorrection}
      setPendingPayParticipantId={setPendingPayParticipantId}
      setSettlementDraft={setSettlementDraft}
      setSettlementError={setSettlementError}
      setSettlementUpdateWarning={setSettlementUpdateWarning}
      settlementError={settlementError}
      settlementUpdateWarning={settlementUpdateWarning}
      settlementDraft={settlementDraft}
      snapshot={snapshot}
      submitExpense={submitExpense}
      submitParticipant={submitParticipant}
      submitParticipantCorrection={submitParticipantCorrection}
      submitSettlementPayment={submitSettlementPayment}
      switchParticipant={switchParticipant}
      toast={toast}
    />
  )
}

function LoadingPage({ realtimeState }: { realtimeState: RealtimeState }) {
  return (
    <div className="min-h-svh bg-muted/35 p-4 text-foreground sm:p-6">
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] max-w-6xl place-items-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Opening Event</CardTitle>
            <CardDescription data-realtime-state>{realtimeState}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="h-8 rounded-2xl bg-muted" />
            <div className="h-8 rounded-2xl bg-muted" />
            <div className="h-8 rounded-2xl bg-muted" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface EventPageProps {
  copyEventLink: () => void
  currentParticipantId: string
  deleteExpense: (expense: Expense) => void
  deleteParticipant: (participant: Participant) => void
  deleteSettlementPayment: (payment: SettlementPayment) => void
  editExpense: (expense: Expense) => void
  editSettlementPayment: (payment: SettlementPayment) => void
  expenseDraft: ExpenseDraft
  expenseError: string
  expenseUpdateWarning: string
  followStartGuidance: () => void
  newParticipantName: string
  openManualSettlementForm: (suggestion?: SuggestedSettlement) => void
  participantCorrection: ParticipantCorrection
  pendingPayParticipantId: string
  policy: EventPagePolicy
  realtimeState: RealtimeState
  recordSuggestedSettlement: (senderParticipantId: string) => void
  setExpenseDraft: React.Dispatch<React.SetStateAction<ExpenseDraft>>
  setExpenseError: (message: string) => void
  setExpenseUpdateWarning: (message: string) => void
  setNewParticipantName: (value: string) => void
  setParticipantCorrection: React.Dispatch<React.SetStateAction<ParticipantCorrection>>
  setPendingPayParticipantId: (participantId: string) => void
  setSettlementDraft: React.Dispatch<React.SetStateAction<SettlementDraft>>
  setSettlementError: (message: string) => void
  setSettlementUpdateWarning: (message: string) => void
  settlementError: string
  settlementUpdateWarning: string
  settlementDraft: SettlementDraft
  snapshot: EventSnapshot
  submitExpense: (event: FormEvent<HTMLFormElement>) => void
  submitParticipant: (event: FormEvent<HTMLFormElement>) => void
  submitParticipantCorrection: (event: FormEvent<HTMLFormElement>) => void
  submitSettlementPayment: (event: FormEvent<HTMLFormElement>) => void
  switchParticipant: (participantId: string) => void
  toast: string
}

function EventPage(props: EventPageProps) {
  const {
    copyEventLink,
    currentParticipantId,
    deleteExpense,
    deleteParticipant,
    deleteSettlementPayment,
    editExpense,
    editSettlementPayment,
    expenseDraft,
    expenseError,
    expenseUpdateWarning,
    followStartGuidance,
    newParticipantName,
    openManualSettlementForm,
    participantCorrection,
    pendingPayParticipantId,
    policy,
    realtimeState,
    recordSuggestedSettlement,
    setExpenseDraft,
    setExpenseError,
    setExpenseUpdateWarning,
    setNewParticipantName,
    setParticipantCorrection,
    setPendingPayParticipantId,
    setSettlementDraft,
    setSettlementError,
    setSettlementUpdateWarning,
    settlementError,
    settlementUpdateWarning,
    settlementDraft,
    snapshot,
    submitExpense,
    submitParticipant,
    submitParticipantCorrection,
    submitSettlementPayment,
    switchParticipant,
    toast
  } = props

  return (
    <div className="min-h-svh bg-muted/35 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <EventHeader
          copyEventLink={copyEventLink}
          currentParticipantId={currentParticipantId}
          policy={policy}
          realtimeState={realtimeState}
          snapshot={snapshot}
          switchParticipant={switchParticipant}
          toast={toast}
        />

        {policy.startGuidance.visible ? (
          <Alert className="lg:col-span-2" data-start-guidance>
            <ReceiptText />
            <AlertTitle data-start-title>{policy.startGuidance.title}</AlertTitle>
            <AlertDescription data-start-copy>{policy.startGuidance.copy}</AlertDescription>
            <div className="mt-3">
              <Button className={buttonTouchClassName} data-start-action onClick={followStartGuidance} type="button">
                <ArrowRight data-icon="inline-start" />
                {policy.startGuidance.actionLabel}
              </Button>
            </div>
          </Alert>
        ) : null}

        <section className="grid content-start gap-4">
          <ExpenseCard
            currentParticipantId={currentParticipantId}
            deleteParticipant={deleteParticipant}
            draft={expenseDraft}
            error={expenseError}
            updateWarning={expenseUpdateWarning}
            newParticipantName={newParticipantName}
            participantCorrection={participantCorrection}
            policy={policy}
            setDraft={setExpenseDraft}
            setError={setExpenseError}
            setUpdateWarning={setExpenseUpdateWarning}
            setNewParticipantName={setNewParticipantName}
            setParticipantCorrection={setParticipantCorrection}
            snapshot={snapshot}
            submitExpense={submitExpense}
            submitParticipant={submitParticipant}
            submitParticipantCorrection={submitParticipantCorrection}
          />
          <HistoryCard
            deleteExpense={deleteExpense}
            deleteSettlementPayment={deleteSettlementPayment}
            editExpense={editExpense}
            editSettlementPayment={editSettlementPayment}
            policy={policy}
            snapshot={snapshot}
          />
        </section>

        <aside className="grid content-start gap-4">
          <BalancesCard
            openManualSettlementForm={openManualSettlementForm}
            pendingPayParticipantId={pendingPayParticipantId}
            policy={policy}
            recordSuggestedSettlement={recordSuggestedSettlement}
            setPendingPayParticipantId={setPendingPayParticipantId}
            snapshot={snapshot}
          />
          <SettlementPanel
            draft={settlementDraft}
            error={settlementError}
            openManualSettlementForm={openManualSettlementForm}
            policy={policy}
            setDraft={setSettlementDraft}
            setError={setSettlementError}
            setUpdateWarning={setSettlementUpdateWarning}
            snapshot={snapshot}
            updateWarning={settlementUpdateWarning}
            submitSettlementPayment={submitSettlementPayment}
          />
        </aside>
      </div>
    </div>
  )
}

interface EventHeaderProps {
  copyEventLink: () => void
  currentParticipantId: string
  policy: EventPagePolicy
  realtimeState: RealtimeState
  snapshot: EventSnapshot
  switchParticipant: (participantId: string) => void
  toast: string
}

function EventHeader({
  copyEventLink,
  currentParticipantId,
  policy,
  realtimeState,
  snapshot,
  switchParticipant,
  toast
}: EventHeaderProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <AppBrandIcon />
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-medium sm:text-xl">{snapshot.event.title}</h1>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{snapshot.event.currency}</Badge>
              <span data-realtime-state>{realtimeState}</span>
              {toast ? <Badge variant="secondary">{toast}</Badge> : null}
            </CardDescription>
          </div>
        </div>
        <CardAction className="static col-auto row-auto grid gap-2 justify-self-stretch sm:justify-self-end">
          <Button
            className={cn('w-full sm:w-auto', buttonTouchClassName)}
            data-copy-link
            onClick={copyEventLink}
            type="button"
            variant="outline"
          >
            <Copy data-icon="inline-start" />
            Copy Event Link
          </Button>
        </CardAction>
      </CardHeader>
      {policy.currentParticipantDefaults.visible ? (
        <CardContent>
          <Field data-testid="expense-defaults">
            <FieldLabel htmlFor="current-participant">{policy.currentParticipantDefaults.label}</FieldLabel>
            <FieldContent>
              <ParticipantSelect
                id="current-participant"
                label={policy.currentParticipantDefaults.selectorLabel}
                onValueChange={switchParticipant}
                participants={snapshot.participants}
                value={currentParticipantId}
              />
              <FieldDescription>{policy.currentParticipantDefaults.switchLabel}</FieldDescription>
            </FieldContent>
          </Field>
        </CardContent>
      ) : null}
    </Card>
  )
}

function AppBrandIcon() {
  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
      <img alt="" aria-hidden="true" className="size-6" src={appIconPath} />
    </div>
  )
}

interface ExpenseCardProps {
  currentParticipantId: string
  deleteParticipant: (participant: Participant) => void
  draft: ExpenseDraft
  error: string
  updateWarning: string
  newParticipantName: string
  participantCorrection: ParticipantCorrection
  policy: EventPagePolicy
  setDraft: React.Dispatch<React.SetStateAction<ExpenseDraft>>
  setError: (message: string) => void
  setUpdateWarning: (message: string) => void
  setNewParticipantName: (value: string) => void
  setParticipantCorrection: React.Dispatch<React.SetStateAction<ParticipantCorrection>>
  snapshot: EventSnapshot
  submitExpense: (event: FormEvent<HTMLFormElement>) => void
  submitParticipant: (event: FormEvent<HTMLFormElement>) => void
  submitParticipantCorrection: (event: FormEvent<HTMLFormElement>) => void
}

function ExpenseCard({
  currentParticipantId,
  deleteParticipant,
  draft,
  error,
  updateWarning,
  newParticipantName,
  participantCorrection,
  policy,
  setDraft,
  setError,
  setUpdateWarning,
  setNewParticipantName,
  setParticipantCorrection,
  snapshot,
  submitExpense,
  submitParticipant,
  submitParticipantCorrection
}: ExpenseCardProps) {
  const composition = composeExpenseDraft({
    amount: draft.amount,
    payerParticipantId: draft.payerParticipantId,
    participants: snapshot.participants,
    includedParticipantIds: draft.includedParticipantIds
  })
  const disabledReason = expenseFormDisabledReason(policy, draft, composition.equalShares.length)

  const updateDraft = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => {
    setError('')
    setUpdateWarning('')
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const toggleIncludedParticipant = (participantId: string, checked: boolean) => {
    setDraft((current) => {
      const nextIds = checked
        ? [...new Set([...current.includedParticipantIds, participantId])]
        : current.includedParticipantIds.filter((id) => id !== participantId)
      return { ...current, includedParticipantIds: nextIds }
    })
  }

  const startRename = (participant: Participant) => {
    setParticipantCorrection({
      participantId: participant.id,
      displayName: participant.displayName
    })
  }

  return (
    <Card data-testid="add-expense-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText />
          <h2 className="font-heading text-base font-medium">Add Expense</h2>
        </CardTitle>
        <CardDescription>{snapshot.participants.length} Participants in this Event</CardDescription>
      </CardHeader>
      <CardContent>
        {policy.expenseForm.canRecord ? (
          <form className="grid gap-6" data-expense-form onSubmit={submitExpense}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="expense-description">Description</FieldLabel>
                <Input
                  id="expense-description"
                  name="description"
                  onChange={(event) => updateDraft('description', event.target.value)}
                  placeholder="Groceries"
                  value={draft.description}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
                  <Input
                  id="expense-amount"
                  inputMode="decimal"
                  name="amount"
                  onChange={(event) => updateDraft('amount', event.target.value)}
                  placeholder="0.00"
                  aria-describedby={error ? 'expense-error' : undefined}
                  aria-invalid={Boolean(error)}
                  value={draft.amount}
                />
                </Field>
                <Field>
                  <FieldLabel htmlFor="expense-payer">Paid by</FieldLabel>
                  <ParticipantSelect
                    id="expense-payer"
                    label="Paid by"
                    onValueChange={(participantId) => updateDraft('payerParticipantId', participantId)}
                    participants={snapshot.participants}
                    value={draft.payerParticipantId || currentParticipantId}
                  />
                </Field>
              </div>
            </FieldGroup>

            <FieldSet data-included-participants>
              <FieldLegend>Included Participants</FieldLegend>
              <FieldDescription>Shares are derived equally on the server from the selected Participants.</FieldDescription>
              <div className="grid gap-3">
                {snapshot.participants.map((participant) => {
                  const included = draft.includedParticipantIds.includes(participant.id)
                  const share = composition.equalShares.find((item) => item.participantId === participant.id)
                  return (
                    <Field
                      className="rounded-2xl border bg-background/70 p-3"
                      data-participant-id={participant.id}
                      data-testid="participant-row"
                      key={participant.id}
                      orientation="horizontal"
                    >
                      <Checkbox
                        aria-label={participant.displayName}
                        checked={included}
                        id={`included-${participant.id}`}
                        onCheckedChange={(checked) => toggleIncludedParticipant(participant.id, checked === true)}
                      />
                      <FieldContent>
                        <FieldLabel htmlFor={`included-${participant.id}`}>{participant.displayName}</FieldLabel>
                        <FieldDescription>
                          {share ? `${money(share.amountMinor, snapshot.event.currency)} share` : 'Not included'}
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  )
                })}
              </div>
              {composition.payerWarning ? <FieldError>{composition.payerWarning}</FieldError> : null}
            </FieldSet>

            {disabledReason ? <FieldError>{disabledReason}</FieldError> : null}
            {updateWarning ? (
              <Alert data-expense-update-warning>
                <AlertDescription>{updateWarning}</AlertDescription>
              </Alert>
            ) : null}
            {error ? <FieldError data-expense-error id="expense-error">{error}</FieldError> : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {draft.id ? (
                <Button
                  className={buttonTouchClassName}
                  onClick={() => setDraft(reconcileExpenseDraft(emptyExpenseDraft(), snapshot.participants, currentParticipantId))}
                  type="button"
                  variant="outline"
                >
                  <X data-icon="inline-start" />
                  Cancel
                </Button>
              ) : null}
              <Button className={buttonTouchClassName} disabled={Boolean(disabledReason)} type="submit">
                <Check data-icon="inline-start" />
                Save expense
              </Button>
            </div>
          </form>
        ) : (
          <Alert data-expense-form>
            <ReceiptText />
            <AlertTitle>{policy.expenseForm.onboardingTitle}</AlertTitle>
            <AlertDescription>{policy.expenseForm.onboardingCopy}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardContent>
        <FieldSet data-participants>
          <FieldLegend className="flex items-center gap-2">
            <Users />
            Participants
          </FieldLegend>
          <div className="grid gap-3">
            {snapshot.participants.map((participant) => (
              <ParticipantLine
                deleteParticipant={deleteParticipant}
                key={participant.id}
                participant={participant}
                participantCorrection={participantCorrection}
                policy={policy}
                setParticipantCorrection={setParticipantCorrection}
                startRename={startRename}
                submitParticipantCorrection={submitParticipantCorrection}
              />
            ))}
          </div>
          <form className="grid gap-2 sm:grid-cols-[1fr_auto]" data-participant-form onSubmit={submitParticipant}>
            <Field>
              <FieldLabel className="sr-only" htmlFor="new-participant-name">Display name</FieldLabel>
              <Input
                data-add-participant
                id="new-participant-name"
                name="displayName"
                onChange={(event) => setNewParticipantName(event.target.value)}
                placeholder="Add Participant"
                value={newParticipantName}
              />
            </Field>
            <Button className={buttonTouchClassName} type="submit">
              <Plus data-icon="inline-start" />
              Add Participant
            </Button>
          </form>
        </FieldSet>
      </CardContent>
    </Card>
  )
}

interface ParticipantLineProps {
  deleteParticipant: (participant: Participant) => void
  participant: Participant
  participantCorrection: ParticipantCorrection
  policy: EventPagePolicy
  setParticipantCorrection: React.Dispatch<React.SetStateAction<ParticipantCorrection>>
  startRename: (participant: Participant) => void
  submitParticipantCorrection: (event: FormEvent<HTMLFormElement>) => void
}

function ParticipantLine({
  deleteParticipant,
  participant,
  participantCorrection,
  policy,
  setParticipantCorrection,
  startRename,
  submitParticipantCorrection
}: ParticipantLineProps) {
  const deleteState = policy.participants.deleteById[participant.id]
  const editing = participantCorrection.participantId === participant.id

  if (editing) {
    return (
      <form
        className="grid gap-2 rounded-2xl border bg-background/70 p-3 sm:grid-cols-[1fr_auto_auto]"
        data-participant-id={participant.id}
        data-testid="participant-rename-form"
        onSubmit={submitParticipantCorrection}
      >
        <Field>
          <FieldLabel className="sr-only" htmlFor={`rename-${participant.id}`}>Participant display name</FieldLabel>
          <Input
            id={`rename-${participant.id}`}
            name="displayName"
            onChange={(event) => setParticipantCorrection((current) => ({
              ...current,
              displayName: event.target.value
            }))}
            value={participantCorrection.displayName}
          />
        </Field>
        <Button className={buttonTouchClassName} type="submit">
          <Check data-icon="inline-start" />
          Save
        </Button>
        <Button
          className={buttonTouchClassName}
          onClick={() => setParticipantCorrection(emptyParticipantCorrection())}
          type="button"
          variant="outline"
        >
          <X data-icon="inline-start" />
          Cancel
        </Button>
      </form>
    )
  }

  return (
    <div
      className="grid gap-2 rounded-2xl border bg-background/70 p-3 sm:grid-cols-[1fr_auto]"
      data-participant-id={participant.id}
      data-testid="participant-row"
    >
      <div className="min-w-0">
        <FieldTitle>{participant.displayName}</FieldTitle>
        <FieldDescription>{deleteState?.canDelete ? 'Can be removed before activity starts' : deleteState?.reason}</FieldDescription>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
      <Button
        aria-label={`Rename participant ${participant.displayName}`}
          className={buttonTouchClassName}
          onClick={() => startRename(participant)}
          type="button"
          variant="outline"
        >
          <Pencil data-icon="inline-start" />
          Rename
        </Button>
      <Button
        aria-label={`Delete participant ${participant.displayName}`}
          className={buttonTouchClassName}
          disabled={!deleteState?.canDelete}
          onClick={() => deleteParticipant(participant)}
          type="button"
          variant="destructive"
        >
          <Trash2 data-icon="inline-start" />
          Delete
        </Button>
      </div>
    </div>
  )
}

interface BalancesCardProps {
  openManualSettlementForm: (suggestion?: SuggestedSettlement) => void
  pendingPayParticipantId: string
  policy: EventPagePolicy
  recordSuggestedSettlement: (senderParticipantId: string) => void
  setPendingPayParticipantId: (participantId: string) => void
  snapshot: EventSnapshot
}

function BalancesCard({
  openManualSettlementForm,
  pendingPayParticipantId,
  policy,
  recordSuggestedSettlement,
  setPendingPayParticipantId,
  snapshot
}: BalancesCardProps) {
  return (
    <Card data-testid="balances-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletCards />
          <h2 className="font-heading text-base font-medium">Balances</h2>
        </CardTitle>
        <CardDescription>Who should receive or pay money back</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {snapshot.balances.map((balance) => {
          const participant = findParticipant(snapshot.participants, balance.participantId)
          const amount = money(balance.amountMinor, snapshot.event.currency)
          const outstanding = outstandingMinor(balance.amountMinor)
          const paySuggestions = snapshot.suggestedSettlements.filter(
            (suggestion) => suggestion.senderParticipantId === balance.participantId
          )
          return (
            <div
              className="grid gap-3 rounded-2xl border bg-background/70 p-3 sm:grid-cols-[1fr_auto]"
              data-participant-id={balance.participantId}
              data-testid="balance-row"
              key={balance.participantId}
            >
              <div>
                <FieldTitle>{participant.displayName}</FieldTitle>
                <FieldDescription>
                  {balance.amountMinor > 0 ? 'is owed' : balance.amountMinor < 0 ? 'owes' : 'is settled'}
                </FieldDescription>
              </div>
              <div className="grid gap-2 justify-items-start sm:justify-items-end">
                <Badge variant={balance.amountMinor === 0 ? 'secondary' : 'outline'}>{amount}</Badge>
                {outstanding > 0 && pendingPayParticipantId !== balance.participantId ? (
                  <Button
                    className={buttonTouchClassName}
                    aria-label={`Review payment for ${participant.displayName} owing ${money(outstanding, snapshot.event.currency)}`}
                    onClick={() => setPendingPayParticipantId(balance.participantId)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowRight data-icon="inline-start" />
                    Pay
                  </Button>
                ) : null}
                {outstanding > 0 && pendingPayParticipantId === balance.participantId ? (
                  <div className="grid gap-2 text-sm">
                    {paySuggestions.map((suggestion) => (
                      <div key={`${suggestion.senderParticipantId}-${suggestion.recipientParticipantId}`}>
                        {findParticipant(snapshot.participants, suggestion.senderParticipantId).displayName} pays{' '}
                        {findParticipant(snapshot.participants, suggestion.recipientParticipantId).displayName}{' '}
                        {money(suggestion.amountMinor, snapshot.event.currency)}
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className={buttonTouchClassName}
                        onClick={() => recordSuggestedSettlement(balance.participantId)}
                        type="button"
                      >
                        <Check data-icon="inline-start" />
                        Record payment
                      </Button>
                      <Button
                        className={buttonTouchClassName}
                        onClick={() => setPendingPayParticipantId('')}
                        type="button"
                        variant="outline"
                      >
                        <X data-icon="inline-start" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </CardContent>
      {snapshot.suggestedSettlements.length > 0 ? (
        <CardContent className="grid gap-3" data-testid="suggested-settlements">
          <FieldTitle>Suggested Settlements</FieldTitle>
          {snapshot.suggestedSettlements.map((suggestion) => (
            <div
              className="grid gap-2 rounded-2xl border bg-background/70 p-3"
              data-testid="suggested-settlement-row"
              key={`${suggestion.senderParticipantId}-${suggestion.recipientParticipantId}-${suggestion.amountMinor}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>{findParticipant(snapshot.participants, suggestion.senderParticipantId).displayName}</span>
                <ArrowRight />
                <span>{findParticipant(snapshot.participants, suggestion.recipientParticipantId).displayName}</span>
                <Badge variant="secondary">{money(suggestion.amountMinor, snapshot.event.currency)}</Badge>
              </div>
              <Button
                className={buttonTouchClassName}
                onClick={() => openManualSettlementForm(suggestion)}
                type="button"
                variant="outline"
              >
                <Pencil data-icon="inline-start" />
                Record exact payment
              </Button>
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  )
}

interface SettlementPanelProps {
  draft: SettlementDraft
  error: string
  openManualSettlementForm: () => void
  policy: EventPagePolicy
  setDraft: React.Dispatch<React.SetStateAction<SettlementDraft>>
  setError: (message: string) => void
  setUpdateWarning: (message: string) => void
  snapshot: EventSnapshot
  submitSettlementPayment: (event: FormEvent<HTMLFormElement>) => void
  updateWarning: string
}

function SettlementPanel({
  draft,
  error,
  openManualSettlementForm,
  policy,
  setDraft,
  setError,
  setUpdateWarning,
  snapshot,
  submitSettlementPayment,
  updateWarning
}: SettlementPanelProps) {
  if (!policy.taskRegions.recordSettlementPayment.visible) {
    return null
  }

  const disabledReason = settlementFormDisabledReason(policy, draft)
  const updateDraft = <K extends keyof SettlementDraft>(key: K, value: SettlementDraft[K]) => {
    setError('')
    setUpdateWarning('')
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <Card data-testid="record-settlement-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link />
          <h2 className="font-heading text-base font-medium">Record outside payment</h2>
        </CardTitle>
        <CardDescription>Record money that already moved outside SettleUp. This updates balances only.</CardDescription>
        <CardAction>
          {!draft.open ? (
            <Button className={buttonTouchClassName} onClick={openManualSettlementForm} type="button" variant="outline">
              <Plus data-icon="inline-start" />
              Record outside payment
            </Button>
          ) : null}
        </CardAction>
      </CardHeader>
      {draft.open ? (
        <CardContent>
          <form className="grid gap-6" data-settlement-form onSubmit={submitSettlementPayment}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="settlement-sender">Who paid</FieldLabel>
                  <ParticipantSelect
                    id="settlement-sender"
                    label="Who paid"
                    onValueChange={(participantId) => updateDraft('senderParticipantId', participantId)}
                    participants={snapshot.participants}
                    value={draft.senderParticipantId}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settlement-recipient">Who received</FieldLabel>
                  <ParticipantSelect
                    id="settlement-recipient"
                    label="Who received"
                    onValueChange={(participantId) => updateDraft('recipientParticipantId', participantId)}
                    participants={snapshot.participants}
                    value={draft.recipientParticipantId}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="settlement-amount">Amount</FieldLabel>
                <Input
                  aria-describedby={error ? 'settlement-error' : undefined}
                  aria-invalid={Boolean(error)}
                  id="settlement-amount"
                  inputMode="decimal"
                  name="amount"
                  onChange={(event) => updateDraft('amount', event.target.value)}
                  placeholder="0.00"
                  value={draft.amount}
                />
              </Field>
              <FieldDescription data-settlement-preview>
                {settlementPreview(snapshot, draft)}
              </FieldDescription>
              {disabledReason ? <FieldError>{disabledReason}</FieldError> : null}
              {updateWarning ? (
                <Alert data-settlement-update-warning>
                  <AlertDescription>{updateWarning}</AlertDescription>
                </Alert>
              ) : null}
              {error ? <FieldError data-settlement-error id="settlement-error">{error}</FieldError> : null}
            </FieldGroup>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                className={buttonTouchClassName}
                data-cancel-settlement
                onClick={() => setDraft(reconcileSettlementDraft(emptySettlementDraft(), snapshot.participants))}
                type="button"
                variant="outline"
              >
                <X data-icon="inline-start" />
                Cancel
              </Button>
              <Button className={buttonTouchClassName} type="submit">
                <Check data-icon="inline-start" />
                {draft.id ? 'Save payment' : 'Record payment'}
              </Button>
            </div>
          </form>
        </CardContent>
      ) : null}
    </Card>
  )
}

interface HistoryCardProps {
  deleteExpense: (expense: Expense) => void
  deleteSettlementPayment: (payment: SettlementPayment) => void
  editExpense: (expense: Expense) => void
  editSettlementPayment: (payment: SettlementPayment) => void
  policy: EventPagePolicy
  snapshot: EventSnapshot
}

function HistoryCard({
  deleteExpense,
  deleteSettlementPayment,
  editExpense,
  editSettlementPayment,
  policy,
  snapshot
}: HistoryCardProps) {
  if (!policy.eventHistory.visible) {
    return null
  }

  return (
    <Card data-history data-testid="event-history-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History />
          <h2 className="font-heading text-base font-medium">Event History</h2>
        </CardTitle>
        <CardDescription>Newest first</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {policy.eventHistory.items.length === 0 ? (
          <Alert>
            <ReceiptText />
            <AlertTitle>No activity yet</AlertTitle>
            <AlertDescription>Expenses and outside payments will appear here.</AlertDescription>
          </Alert>
        ) : (
          policy.eventHistory.items.map((item) => (
            <HistoryRecord
              deleteExpense={deleteExpense}
              deleteSettlementPayment={deleteSettlementPayment}
              editExpense={editExpense}
              editSettlementPayment={editSettlementPayment}
              item={item}
              key={`${item.kind}-${item.record.id}`}
              snapshot={snapshot}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

interface HistoryRecordProps {
  deleteExpense: (expense: Expense) => void
  deleteSettlementPayment: (payment: SettlementPayment) => void
  editExpense: (expense: Expense) => void
  editSettlementPayment: (payment: SettlementPayment) => void
  item: EventHistoryItem
  snapshot: EventSnapshot
}

function HistoryRecord({
  deleteExpense,
  deleteSettlementPayment,
  editExpense,
  editSettlementPayment,
  item,
  snapshot
}: HistoryRecordProps) {
  if (item.kind === 'expense') {
    const expense = item.record as Expense
    const payer = findParticipant(snapshot.participants, expense.payerParticipantId)
    return (
      <div
        className="grid gap-3 rounded-2xl border bg-background/70 p-3 sm:grid-cols-[1fr_auto]"
        data-record-kind="expense"
        data-testid="history-record"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FieldTitle>{expense.description}</FieldTitle>
            <Badge variant="secondary">Expense</Badge>
          </div>
          <FieldDescription>
            {payer.displayName} paid {money(expense.amountMinor, snapshot.event.currency)}
          </FieldDescription>
          <FieldDescription>Split between {historyShareSummary(expense, snapshot)}</FieldDescription>
        </div>
      <RecordActions
          deleteLabel={`Delete expense ${expense.description} ${money(expense.amountMinor, snapshot.event.currency)}`}
          editLabel={`Edit expense ${expense.description} ${money(expense.amountMinor, snapshot.event.currency)}`}
          onDelete={() => deleteExpense(expense)}
          onEdit={() => editExpense(expense)}
        />
      </div>
    )
  }

  const payment = item.record as SettlementPayment
  return (
    <div
      className="grid gap-3 rounded-2xl border bg-background/70 p-3 sm:grid-cols-[1fr_auto]"
      data-record-kind="settlement-payment"
      data-testid="history-record"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <FieldTitle>Recorded payment outside SettleUp</FieldTitle>
          <Badge variant="secondary">Payment</Badge>
        </div>
        <FieldDescription>
          {findParticipant(snapshot.participants, payment.senderParticipantId).displayName} paid{' '}
          {findParticipant(snapshot.participants, payment.recipientParticipantId).displayName}{' '}
          {money(payment.amountMinor, snapshot.event.currency)}
        </FieldDescription>
      </div>
      <RecordActions
        deleteLabel={`Delete payment ${money(payment.amountMinor, snapshot.event.currency)}`}
        editLabel={`Edit payment ${money(payment.amountMinor, snapshot.event.currency)}`}
        onDelete={() => deleteSettlementPayment(payment)}
        onEdit={() => editSettlementPayment(payment)}
      />
    </div>
  )
}

interface RecordActionsProps {
  deleteLabel: string
  editLabel: string
  onDelete: () => void
  onEdit: () => void
}

function RecordActions({ deleteLabel, editLabel, onDelete, onEdit }: RecordActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <Button aria-label={editLabel} className={buttonTouchClassName} onClick={onEdit} type="button" variant="outline">
        <Pencil data-icon="inline-start" />
        Edit
      </Button>
      <Button aria-label={deleteLabel} className={buttonTouchClassName} onClick={onDelete} type="button" variant="destructive">
        <Trash2 data-icon="inline-start" />
        Delete
      </Button>
    </div>
  )
}

interface ParticipantSelectProps {
  id: string
  label: string
  onValueChange: (participantId: string) => void
  participants: readonly Participant[]
  value: string
}

function ParticipantSelect({
  id,
  label,
  onValueChange,
  participants,
  value
}: ParticipantSelectProps) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger aria-label={label} id={id}>
        <SelectValue placeholder="Choose Participant" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {participants.map((participant) => (
            <SelectItem key={participant.id} value={participant.id}>
              {participant.displayName}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function participantStorageKey(token: string): string {
  return `settleup:participant:${token}`
}

function readStoredParticipantId(token: string, participants: readonly Participant[]): string {
  const storedParticipantId = window.localStorage.getItem(participantStorageKey(token)) || ''
  return participantExists(participants, storedParticipantId) ? storedParticipantId : ''
}

function participantExists(participants: readonly Participant[], participantId: string): boolean {
  return participants.some((participant) => participant.id === participantId)
}

function reconcileExpenseDraft(
  draft: ExpenseDraft,
  participants: readonly Participant[],
  currentParticipantId: string
): ExpenseDraft {
  const participantIds = new Set(participants.map((participant) => participant.id))
  const payerParticipantId = participantIds.has(draft.payerParticipantId)
    ? draft.payerParticipantId
    : currentParticipantId || participants[0]?.id || ''
  const includedParticipantIds = draft.includedParticipantIds.length > 0
    ? draft.includedParticipantIds.filter((participantId) => participantIds.has(participantId))
    : participants.map((participant) => participant.id)

  return {
    ...draft,
    payerParticipantId,
    includedParticipantIds
  }
}

function reconcileSettlementDraft(
  draft: SettlementDraft,
  participants: readonly Participant[]
): SettlementDraft {
  const participantIds = new Set(participants.map((participant) => participant.id))
  const senderParticipantId = participantIds.has(draft.senderParticipantId)
    ? draft.senderParticipantId
    : participants[0]?.id || ''
  const recipientParticipantId = participantIds.has(draft.recipientParticipantId)
    ? draft.recipientParticipantId
    : participants.find((participant) => participant.id !== senderParticipantId)?.id || senderParticipantId

  return {
    ...draft,
    senderParticipantId,
    recipientParticipantId
  }
}

function hasDirtyExpenseDraft(draft: ExpenseDraft): boolean {
  return Boolean(draft.id || draft.description.trim() || draft.amount.trim())
}

function hasDirtySettlementDraft(draft: SettlementDraft): boolean {
  return Boolean(draft.id || draft.open || draft.amount.trim())
}

function includedParticipantsFor(existingIds: readonly string[], participantId: string): string[] {
  return [...new Set([...existingIds, participantId])]
}

function expenseFormDisabledReason(
  policy: EventPagePolicy,
  draft: ExpenseDraft,
  equalShareCount: number
): string {
  if (!policy.expenseForm.canRecord) {
    return policy.expenseForm.disabledReason
  }
  if (!draft.description.trim()) {
    return 'Enter an expense description.'
  }
  if (parseDraftMoneyMinor(draft.amount) === null) {
    return 'Enter a positive amount.'
  }
  if (!draft.payerParticipantId) {
    return 'Choose who paid.'
  }
  if (draft.includedParticipantIds.length === 0 || equalShareCount === 0) {
    return 'Choose at least one Participant to split this expense.'
  }
  return ''
}

function settlementFormDisabledReason(policy: EventPagePolicy, draft: SettlementDraft): string {
  if (!policy.settlementPaymentForm.canRecord) {
    return policy.settlementPaymentForm.disabledReason
  }
  if (!draft.senderParticipantId) {
    return 'Choose who paid.'
  }
  if (!draft.recipientParticipantId) {
    return 'Choose who received.'
  }
  if (draft.senderParticipantId === draft.recipientParticipantId) {
    return 'Choose two different Participants.'
  }
  if (parseDraftMoneyMinor(draft.amount) === null) {
    return 'Amount must be a positive decimal amount'
  }
  return ''
}

function settlementPreview(snapshot: EventSnapshot, draft: SettlementDraft): string {
  const amountMinor = parseDraftMoneyMinor(draft.amount)
  if (!draft.senderParticipantId || !draft.recipientParticipantId || amountMinor === null) {
    return 'Payment preview will appear after all fields are filled.'
  }
  return `${findParticipant(snapshot.participants, draft.senderParticipantId).displayName} paid ${findParticipant(snapshot.participants, draft.recipientParticipantId).displayName} ${money(amountMinor, snapshot.event.currency)} outside SettleUp.`
}

function findParticipant(participants: readonly Participant[], participantId: string): Participant {
  return participants.find((participant) => participant.id === participantId) || {
    id: participantId,
    displayName: 'Unknown Participant',
    order: 0,
    createdAt: ''
  }
}

function historyShareSummary(expense: Expense, snapshot: EventSnapshot): string {
  return expense.shares
    .map((share) => {
      const participant = findParticipant(snapshot.participants, share.participantId)
      return `${participant.displayName} ${money(share.amountMinor, snapshot.event.currency)}`
    })
    .join(', ')
}

function outstandingMinor(amountMinor: number): number {
  return amountMinor < 0 ? -amountMinor : 0
}

function money(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    currency,
    style: 'currency'
  }).format(amountMinor / 100)
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options.headers
    }
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json() as unknown
    : await response.text()

  if (!response.ok) {
    throw new Error(errorMessageFromPayload(payload, response.statusText))
  }

  return payload as T
}

function errorMessageFromPayload(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
    return payload.message
  }
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = payload.error
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      return error.message
    }
  }
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }
  return fallback || 'Request failed'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function realtimeUrl(path: string): string {
  const url = new URL(path, window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

function scrollIntoViewWithMotionPreference(selector: string): void {
  const target = document.querySelector(selector)
  if (!target) return
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start'
  })
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const appElement = document.getElementById('app')
const token = appElement?.dataset.token

if (appElement && token) {
  createRoot(appElement).render(<EventApp token={token} />)
}
