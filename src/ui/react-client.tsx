/** @jsxImportSource react */
import {
  CheckIcon,
  CircleDollarSignIcon,
  CopyIcon,
  CreditCardIcon,
  HistoryIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  Trash2Icon,
  UsersRoundIcon,
  WalletCardsIcon,
  XIcon
} from 'lucide-react'
import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  EventSnapshot,
  Expense,
  Participant,
  SettlementPayment
} from '../domain'
import {
  REALTIME_FALLBACK_POLL_MS,
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
import { cn } from '@/lib/utils'

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

const selectClassName = 'h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm disabled:cursor-not-allowed disabled:opacity-50'
const checkboxClassName = 'size-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
const moneyClassName = 'font-mono text-sm font-semibold tabular-nums'

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
    }, REALTIME_FALLBACK_POLL_MS)
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
      <div className="mx-auto grid min-h-svh w-full max-w-5xl place-items-center">
        <Card className="w-full max-w-md rounded-lg shadow-none">
          <CardHeader>
            <CardTitle>Event not found</CardTitle>
            <CardDescription>This Event Link does not work.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      </div>
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-4 text-card-foreground sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="grid size-6 gap-1" aria-hidden="true">
              <span className="ml-auto block h-1.5 w-4 rounded-sm bg-primary" />
              <span className="block h-1.5 w-4 rounded-sm bg-primary" />
            </span>
            <span>SettleUp</span>
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <h1 className="min-w-0 [overflow-wrap:anywhere] text-2xl font-semibold leading-tight tracking-normal" data-event-title>
              {snapshot.event.title}
            </h1>
            <Button
              variant="outline"
              size="icon"
              data-copy-link
              type="button"
              aria-label="Copy Event Link"
              title="Copy Event Link"
              onClick={() => void copyEventLink()}
            >
              <CopyIcon data-icon="inline-start" />
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span data-event-currency>{snapshot.event.currency}</span>, anyone with this link can edit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Badge variant="secondary" className="gap-1.5" data-realtime-state>
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            {realtimeState}
          </Badge>
        </div>
      </header>
      <div className="fixed bottom-4 left-4 right-4 z-20 sm:left-auto sm:right-5 sm:top-5 sm:bottom-auto sm:w-80" aria-live="polite" aria-atomic="true" data-toast-region>
        <Alert className="shadow-sm" data-toast-message hidden={!toast.visible}>
          <AlertTitle>SettleUp</AlertTitle>
          <AlertDescription>{toast.message}</AlertDescription>
        </Alert>
      </div>
      <Alert data-start-guidance hidden={!policy.startGuidance.visible}>
        <ReceiptTextIcon />
        <AlertTitle data-start-title>{policy.startGuidance.title}</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span data-start-copy>{policy.startGuidance.copy}</span>
          <Button
            type="button"
            data-start-action
            aria-label={policy.startGuidance.actionLabel}
            onClick={followStartGuidance}
          >
            <PlusIcon data-icon="inline-start" />
            {policy.startGuidance.action}
          </Button>
        </AlertDescription>
      </Alert>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Card className="rounded-lg py-0 shadow-none" as="section" data-testid="balances-panel">
          <CardHeader className="border-b py-4">
            <CardTitle>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <WalletCardsIcon aria-hidden="true" />
                Balances
              </h2>
            </CardTitle>
            <CardAction>
              <span className={cn(moneyClassName, 'text-primary')} data-outstanding>
                {outstandingMinor(snapshot) > 0 ? `Outstanding ${money(outstandingMinor(snapshot), snapshot.event.currency)}` : ''}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 py-0">
          <Balances
            snapshot={snapshot}
            pendingPayParticipantId={pendingPayParticipantId}
            onReviewPayBalance={setPendingPayParticipantId}
            onConfirmPayBalance={(participantId) => void recordSuggestedSettlement(participantId)}
            onCancelPayBalance={() => setPendingPayParticipantId('')}
          />
          </CardContent>
          {policy.taskRegions.recordSettlementPayment.visible ? (
            <div
              className="border-t bg-muted/35"
              data-testid="record-settlement-panel"
              data-settlement-section
              data-settlement-form-section
            >
              <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  type="button"
                  data-manual-settlement
                  disabled={!policy.settlementPaymentForm.canRecord}
                  hidden={settlementDraft.open || settlementDraft.dirty || Boolean(settlementDraft.settlementPaymentId)}
                  onClick={openManualSettlementForm}
                >
                  <CreditCardIcon data-icon="inline-start" />
                  Record outside payment
                </Button>
                <p className="text-sm text-muted-foreground" data-settlement-unavailable hidden={policy.settlementPaymentForm.canRecord}>
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
        </Card>

        <Card className="rounded-lg py-0 shadow-none" as="section" data-testid="add-expense-panel">
          <CardHeader className="border-b py-4">
            <div className="min-w-0">
              <CardTitle>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <ReceiptTextIcon aria-hidden="true" />
                  Add Expense
                </h2>
              </CardTitle>
              {policy.currentParticipantDefaults.visible ? (
                <CardDescription className="mt-1">Paid by <strong className="text-foreground" dir="auto">{currentParticipantName}</strong></CardDescription>
              ) : null}
            </div>
            {policy.currentParticipantDefaults.visible ? (
              <CardAction className="flex min-w-0 flex-col gap-1 text-sm sm:min-w-48" data-testid="expense-defaults">
                <span className="font-medium text-muted-foreground">{policy.currentParticipantDefaults.label}</span>
                <select
                  className={selectClassName}
                  data-current-participant
                  aria-label={policy.currentParticipantDefaults.selectorLabel}
                  value={selectedDefaultId || effectiveCurrentParticipantId}
                  onChange={(event) => switchParticipant(event.currentTarget.value)}
                >
                  {snapshot.participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>{participant.displayName}</option>
                  ))}
                </select>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="px-0 py-0">
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
          </CardContent>
        </Card>

        <Card className="rounded-lg py-0 shadow-none lg:col-span-2" as="section" data-testid="event-history-panel">
          <CardHeader className="border-b py-4">
            <CardTitle>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <HistoryIcon aria-hidden="true" />
                Event History
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 py-0">
          <History
            snapshot={snapshot}
            onEditExpense={editExpense}
            onDeleteExpense={(expenseId) => void deleteExpense(expenseId)}
            onEditPayment={editPayment}
            onDeletePayment={(paymentId) => void deletePayment(paymentId)}
          />
          </CardContent>
        </Card>
      </div>
    </div>
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
    <div className="divide-y" data-balances>
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
          ? 'text-primary'
          : balance.amountMinor < 0 ? 'text-destructive' : 'text-muted-foreground'
        const rowClass = balance.amountMinor > 0
          ? 'bg-primary/5'
          : balance.amountMinor < 0 ? 'bg-destructive/5' : ''
        const phrase = balance.amountMinor > 0
          ? `is owed ${money(balance.amountMinor, snapshot.event.currency)}`
          : balance.amountMinor < 0 ? `owes ${money(Math.abs(balance.amountMinor), snapshot.event.currency)}` : 'is settled'
        const isPayReviewing = pendingPayParticipantId === participant.id
        return (
          <div
            className={cn(
              'ledger-row balance-row grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
              rowClass,
              isPayReviewing && 'row-reviewing bg-muted'
            )}
            key={balance.participantId}
          >
            <div className="min-w-0">
              <strong className="block min-w-0 [overflow-wrap:anywhere]" dir="auto">{participant.displayName}</strong>
              {isPayReviewing ? (
                <p className="mt-1 text-sm font-medium text-muted-foreground" data-pay-preview>{preview || 'No suggested payment to record.'}</p>
              ) : null}
            </div>
            {isPayReviewing ? (
              <span className="row-actions balance-actions balance-review-actions flex flex-wrap gap-2 sm:justify-end">
                <Button
                  type="button"
                  data-confirm-pay-balance={participant.id}
                  onClick={() => onConfirmPayBalance(participant.id)}
                >
                  <CheckIcon data-icon="inline-start" />
                  Record payment
                </Button>
                <Button variant="outline" type="button" onClick={onCancelPayBalance}>
                  <XIcon data-icon="inline-start" />
                  Cancel
                </Button>
              </span>
            ) : (
              <span className="row-actions balance-actions flex flex-wrap items-center gap-2 sm:justify-end">
                {balance.amountMinor < 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    data-pay-balance={participant.id}
                    aria-label={`Review payment for ${participant.displayName} owing ${money(Math.abs(balance.amountMinor), snapshot.event.currency)}`}
                    onClick={() => onReviewPayBalance(participant.id)}
                  >
                    <CreditCardIcon data-icon="inline-start" />
                    Pay
                  </Button>
                ) : null}
                <span className={cn(moneyClassName, amountClass)}>{phrase}</span>
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
    <div className="participant-manager border-t p-4" data-participant-form>
      <Field className="gap-2">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <FieldLabel htmlFor="new-participant-name" className="sr-only">Display name</FieldLabel>
          <Input
            id="new-participant-name"
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
          <Button type="button" aria-label="Add Participant" data-add-participant onClick={submitParticipant}>
            <PlusIcon data-icon="inline-start" />
            Add
          </Button>
        </div>
      </Field>
    </div>
  )

  if (!expensePolicy.canRecord) {
    return (
      <form
        className="flex flex-col"
        data-expense-form
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
        }}
      >
        <div className="p-4">
          <Alert data-expense-onboarding>
            <UsersRoundIcon />
            <AlertTitle>{expensePolicy.onboardingTitle}</AlertTitle>
            <AlertDescription>{expensePolicy.onboardingCopy}</AlertDescription>
          </Alert>
        </div>
        {participantAddRow}
      </form>
    )
  }

  return (
    <form
      className="flex flex-col"
      data-expense-form
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="flex flex-col gap-4 p-4">
        <FieldDescription className="payer-note" data-payer-note>Paid by {payerName}.</FieldDescription>
        <FieldGroup className="gap-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)_auto] sm:items-end">
            <Field data-invalid={expenseErrorTarget === 'description' ? true : undefined}>
              <FieldLabel htmlFor="expense-description">Description</FieldLabel>
              <Input
                id="expense-description"
                type="text"
                name="description"
                required
                placeholder="Dinner"
                value={draft.description}
                aria-invalid={expenseErrorTarget === 'description' ? true : undefined}
                aria-describedby={expenseErrorTarget === 'description' ? expenseErrorId : undefined}
                onChange={(event) => onChange({ description: event.currentTarget.value, error: '' })}
              />
            </Field>
            <Field data-invalid={expenseErrorTarget === 'amount' ? true : undefined}>
              <FieldLabel htmlFor="expense-amount">Amount</FieldLabel>
              <Input
                id="expense-amount"
                type="text"
                name="amount"
                inputMode="decimal"
                required
                placeholder="80.00"
                value={draft.amount}
                aria-invalid={expenseErrorTarget === 'amount' ? true : undefined}
                aria-describedby={expenseErrorTarget === 'amount' ? expenseErrorId : undefined}
                onChange={(event) => onChange({ amount: event.currentTarget.value, error: '' })}
              />
            </Field>
            <Button
              type="submit"
              disabled={saveDisabled}
              aria-describedby={saveDisabledReason ? 'save-expense-unavailable' : undefined}
            >
              <ReceiptTextIcon data-icon="inline-start" />
              Save expense
            </Button>
          </div>
          <FieldDescription
            id="save-expense-unavailable"
            data-save-expense-unavailable
            hidden={!saveDisabledReason}
          >
            {saveDisabledReason}
          </FieldDescription>
        </FieldGroup>
      </div>
      <input type="hidden" name="expenseId" value={draft.expenseId} readOnly />
      <input type="hidden" name="payerParticipantId" value={draft.payerParticipantId} readOnly />
      <FieldSet
        className="gap-0 border-t px-4 pt-4"
        aria-invalid={expenseErrorTarget === 'participants' ? true : undefined}
        aria-describedby={expenseFieldsetDescription}
      >
        <FieldLegend>Split between</FieldLegend>
        <div data-included-participants data-participants className="included-list divide-y">
          {participants.map((participant) => {
            const deleteState = participantDeleteState(snapshot, participant.id)
            const referenced = !deleteState.canDelete && deleteState.reason === 'Referenced Participants cannot be deleted.'
            const included = draft.includedParticipantIds.includes(participant.id)
            const isRenaming = participantCorrection.mode === 'rename' && participantCorrection.participantId === participant.id
            const isDeleting = participantCorrection.mode === 'confirmDelete' && participantCorrection.participantId === participant.id
            const rowError = participantCorrection.participantId === participant.id ? participantCorrection.error : ''
            const errorId = `participant-correction-error-${participant.id}`
            return (
              <div className={cn('ledger-row participant-row grid gap-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center', (isRenaming || isDeleting) && 'participant-row-editing items-end')} key={participant.id}>
                <label className="participant-split flex min-h-11 items-center justify-center">
                  <input
                    className={checkboxClassName}
                    type="checkbox"
                    name="includedParticipantId"
                    aria-label={`Split with ${participant.displayName}`}
                    value={participant.id}
                    checked={included}
                    onChange={(event) => onIncludedChange(participant.id, event.currentTarget.checked)}
                  />
                </label>
                <div className="participant-summary min-w-0">
                  {isRenaming ? (
                    <Field data-invalid={rowError ? true : undefined} className="gap-1">
                      <FieldLabel htmlFor={`participant-name-${participant.id}`}>Participant name</FieldLabel>
                      <Input
                        id={`participant-name-${participant.id}`}
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
                    </Field>
                  ) : (
                    <>
                      <strong className="block min-w-0 [overflow-wrap:anywhere]" dir="auto">{participant.displayName}</strong>
                      <span className="participant-meta mt-1 flex flex-wrap gap-1.5 text-xs font-medium text-muted-foreground">
                        <Badge variant={included ? 'default' : 'secondary'} className="rounded-sm">
                          {included ? 'Included in split' : 'Not in split'}
                        </Badge>
                        {referenced ? <Badge variant="outline" className="rounded-sm">used in records</Badge> : null}
                      </span>
                    </>
                  )}
                </div>
                <span className="row-actions participant-actions flex flex-wrap gap-2 sm:justify-end">
                  {isRenaming ? (
                    <>
                      <Button
                        type="button"
                        aria-label={`Save name for ${participant.displayName}`}
                        disabled={participantCorrection.saving || !participantCorrection.displayName.trim()}
                        onClick={onSaveParticipantRename}
                      >
                        <CheckIcon data-icon="inline-start" />
                        {participantCorrection.saving ? 'Saving...' : 'Save name'}
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        aria-label={`Cancel renaming ${participant.displayName}`}
                        disabled={participantCorrection.saving}
                        onClick={onCancelParticipantRename}
                      >
                        <XIcon data-icon="inline-start" />
                        Cancel
                      </Button>
                    </>
                  ) : isDeleting ? (
                    <>
                      <span className="text-sm font-medium text-destructive">Delete <strong dir="auto">{participant.displayName}</strong>?</span>
                      <Button
                        variant="destructive"
                        type="button"
                        aria-label={`Confirm delete participant ${participant.displayName}`}
                        disabled={participantCorrection.saving}
                        onClick={() => onDeleteParticipant(participant.id)}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        {participantCorrection.saving ? 'Deleting...' : 'Delete'}
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        aria-label={`Cancel deleting ${participant.displayName}`}
                        disabled={participantCorrection.saving}
                        onClick={onCancelParticipantRename}
                      >
                        <XIcon data-icon="inline-start" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        data-rename-participant={participant.id}
                        aria-label={`Rename participant ${participant.displayName}`}
                        onClick={() => onStartParticipantRename(participant)}
                      >
                        <PencilIcon data-icon="inline-start" />
                        Rename
                      </Button>
                      {deleteState.canDelete ? (
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          data-delete-participant={participant.id}
                          aria-label={`Delete participant ${participant.displayName}`}
                          onClick={() => onStartParticipantDelete(participant)}
                        >
                          <Trash2Icon data-icon="inline-start" />
                          Delete
                        </Button>
                      ) : null}
                    </>
                  )}
                </span>
                {rowError ? (
                  <p className="participant-correction-error text-sm text-destructive sm:col-start-2 sm:col-end-4" id={errorId} role="alert">
                    {rowError}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
        <FieldDescription id="expense-payer-warning" data-payer-warning hidden={!payerWarning}>{payerWarning}</FieldDescription>
        {participantAddRow}
      </FieldSet>
      <p className="px-4 pb-2 text-sm text-muted-foreground" data-expense-update-warning aria-live="polite">{draft.updateWarning}</p>
      <p
        className="mx-4 mb-4 rounded-md border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive"
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
      className="settlement-form flex flex-col gap-4 border-t p-4"
      data-settlement-form
      hidden={!draft.open && !draft.dirty && !draft.settlementPaymentId}
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <input type="hidden" name="settlementPaymentId" value={draft.settlementPaymentId} readOnly />
      <Alert>
        <CircleDollarSignIcon />
        <AlertTitle>Outside payment</AlertTitle>
        <AlertDescription>
          Record money that already moved outside SettleUp. This updates balances only.
        </AlertDescription>
      </Alert>
      <FieldGroup className="gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={settlementErrorTarget === 'participants' ? true : undefined}>
            <FieldLabel htmlFor="settlement-sender">Who paid</FieldLabel>
            <select
              id="settlement-sender"
              className={selectClassName}
              name="senderParticipantId"
              data-participant-select
              value={draft.senderParticipantId}
              aria-invalid={settlementErrorTarget === 'participants' ? true : undefined}
              aria-describedby={settlementErrorTarget === 'participants' ? settlementErrorId : undefined}
              onChange={(event) => onChange({ senderParticipantId: event.currentTarget.value, error: '' })}
            >
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>{participant.displayName}</option>
              ))}
            </select>
          </Field>
          <Field data-invalid={settlementErrorTarget === 'participants' ? true : undefined}>
            <FieldLabel htmlFor="settlement-recipient">Who received</FieldLabel>
            <select
              id="settlement-recipient"
              className={selectClassName}
              name="recipientParticipantId"
              data-participant-select
              value={draft.recipientParticipantId}
              aria-invalid={settlementErrorTarget === 'participants' ? true : undefined}
              aria-describedby={settlementErrorTarget === 'participants' ? settlementErrorId : undefined}
              onChange={(event) => onChange({ recipientParticipantId: event.currentTarget.value, error: '' })}
            >
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>{participant.displayName}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <Field data-invalid={settlementErrorTarget === 'amount' ? true : undefined}>
            <FieldLabel htmlFor="settlement-amount" className="sr-only">Amount</FieldLabel>
            <Input
              id="settlement-amount"
              type="text"
              name="amount"
              inputMode="decimal"
              aria-label="Amount"
              placeholder="24.00"
              value={draft.amount}
              aria-invalid={settlementErrorTarget === 'amount' ? true : undefined}
              aria-describedby={settlementErrorTarget === 'amount' ? settlementErrorId : undefined}
              onChange={(event) => onChange({ amount: event.currentTarget.value, error: '' })}
            />
          </Field>
          <Button type="submit" disabled={!canRecord}>
            <CheckIcon data-icon="inline-start" />
            Record payment
          </Button>
          <Button variant="outline" type="button" data-cancel-settlement onClick={onCancel}>
            <XIcon data-icon="inline-start" />
            Cancel
          </Button>
        </div>
      </FieldGroup>
      <p className="rounded-md border bg-card px-3 py-2 text-sm font-medium text-muted-foreground" data-settlement-preview aria-live="polite">{preview}</p>
      <p className="text-sm text-muted-foreground" data-settlement-update-warning aria-live="polite">{draft.updateWarning}</p>
      <p
        className="rounded-md border border-destructive/40 bg-card px-3 py-2 text-sm text-destructive"
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
    return (
      <div data-history className="p-4">
        <Alert>
          <HistoryIcon />
          <AlertTitle>No Event history yet</AlertTitle>
          <AlertDescription>Expenses and payments will appear here.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div data-history className="divide-y">
      {items.map((item) => {
        if (item.kind === 'expense') {
          const expense = item.record as Expense
          const payer = findParticipant(snapshot.participants, expense.payerParticipantId)
          const shares = historyShareSummary(snapshot.participants, expense.shares, snapshot.event.currency)
          const expenseActionLabel = `${expense.description}, ${money(expense.amountMinor, snapshot.event.currency)}`
          return (
            <div className="ledger-row record-row history-record grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" key={`expense-${expense.id}`}>
              <div className="history-main min-w-0">
                <div className="history-title-line flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-sm">Expense</Badge>
                  <h3 className="min-w-0 [overflow-wrap:anywhere] text-base font-semibold" dir="auto">{expense.description}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  <strong dir="auto">{payer.displayName}</strong> paid {money(expense.amountMinor, snapshot.event.currency)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  <span>Split between</span> {shares}
                </p>
              </div>
              <div className="history-side flex flex-col gap-3 sm:items-end">
                <span className={moneyClassName}>{money(expense.amountMinor, snapshot.event.currency)}</span>
                <span className="row-actions history-actions grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    data-edit-expense={expense.id}
                    aria-label={`Edit expense ${expenseActionLabel}`}
                    onClick={() => onEditExpense(expense)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    data-delete-expense={expense.id}
                    aria-label={`Delete expense ${expenseActionLabel}`}
                    onClick={() => onDeleteExpense(expense.id)}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    Delete
                  </Button>
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
          <div className="ledger-row record-row history-record row-positive grid gap-4 bg-primary/5 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" key={`payment-${payment.id}`}>
            <div className="history-main min-w-0">
              <div className="history-title-line flex flex-wrap items-center gap-2">
                <Badge className="rounded-sm">Payment</Badge>
                <strong className="min-w-0 [overflow-wrap:anywhere]"><span dir="auto">{sender.displayName}</span> paid <span dir="auto">{recipient.displayName}</span></strong>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Recorded payment outside SettleUp</p>
            </div>
            <div className="history-side flex flex-col gap-3 sm:items-end">
              <span className={cn(moneyClassName, 'amount-positive text-primary')}>{money(payment.amountMinor, snapshot.event.currency)}</span>
              <span className="row-actions history-actions grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  data-edit-payment={payment.id}
                  aria-label={`Edit payment ${paymentActionLabel}`}
                  onClick={() => onEditPayment(payment)}
                >
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  data-delete-payment={payment.id}
                  aria-label={`Delete payment ${paymentActionLabel}`}
                  onClick={() => onDeletePayment(payment.id)}
                >
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </Button>
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
