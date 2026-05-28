import {
  CommandInputError,
  parseExpenseInput,
  parseParticipantDisplayName,
  parseSettlementPaymentInput
} from './event-command-input'
import type { EventSnapshot } from './domain'
import type { EventRealtimeNotifier } from './event-realtime'
import { StoreError } from './store'
import type { AppStore } from './store'

export type SavedEventCommand =
  | {
      type: 'addParticipant'
      token: string
      body: unknown
    }
  | {
      type: 'renameParticipant'
      token: string
      participantId: string
      body: unknown
    }
  | {
      type: 'deleteParticipant'
      token: string
      participantId: string
    }
  | {
      type: 'createExpense'
      token: string
      body: unknown
    }
  | {
      type: 'updateExpense'
      token: string
      expenseId: string
      body: unknown
    }
  | {
      type: 'deleteExpense'
      token: string
      expenseId: string
    }
  | {
      type: 'createSettlementPayment'
      token: string
      body: unknown
    }
  | {
      type: 'updateSettlementPayment'
      token: string
      settlementPaymentId: string
      body: unknown
    }
  | {
      type: 'deleteSettlementPayment'
      token: string
      settlementPaymentId: string
    }

export type SavedEventCommandResult =
  | { ok: true; snapshot: EventSnapshot }
  | { ok: false; error: SavedEventCommandError }

export interface SavedEventCommandError {
  code: 'validation_error' | 'not_found'
  message: string
  status: number
}

export async function executeSavedEventCommand(
  store: AppStore,
  realtimeNotifier: EventRealtimeNotifier,
  command: SavedEventCommand
): Promise<SavedEventCommandResult> {
  try {
    const snapshot = await executeMutation(store, command)
    await notifyEventChanged(realtimeNotifier, command.token)
    return { ok: true, snapshot }
  } catch (error: unknown) {
    if (error instanceof StoreError) {
      return {
        ok: false,
        error: {
          code: error.status === 404 ? 'not_found' : 'validation_error',
          message: error.message,
          status: error.status
        }
      }
    }
    if (error instanceof CommandInputError) {
      return {
        ok: false,
        error: {
          code: 'validation_error',
          message: error.message,
          status: 400
        }
      }
    }
    throw error
  }
}

async function executeMutation(store: AppStore, command: SavedEventCommand): Promise<EventSnapshot> {
  switch (command.type) {
    case 'addParticipant':
      return store.addParticipant(command.token, parseParticipantDisplayName(command.body))
    case 'renameParticipant':
      return store.renameParticipant(
        command.token,
        command.participantId,
        parseParticipantDisplayName(command.body)
      )
    case 'deleteParticipant':
      return store.deleteParticipant(command.token, command.participantId)
    case 'createExpense': {
      const snapshot = await requireEventSnapshot(store, command.token)
      return store.createExpense(
        command.token,
        parseExpenseInput(command.body, snapshot.event.currency)
      )
    }
    case 'updateExpense': {
      const snapshot = await requireEventSnapshot(store, command.token)
      return store.updateExpense(
        command.token,
        command.expenseId,
        parseExpenseInput(command.body, snapshot.event.currency)
      )
    }
    case 'deleteExpense':
      return store.deleteExpense(command.token, command.expenseId)
    case 'createSettlementPayment': {
      const snapshot = await requireEventSnapshot(store, command.token)
      return store.createSettlementPayment(
        command.token,
        parseSettlementPaymentInput(command.body, snapshot.event.currency)
      )
    }
    case 'updateSettlementPayment': {
      const snapshot = await requireEventSnapshot(store, command.token)
      return store.updateSettlementPayment(
        command.token,
        command.settlementPaymentId,
        parseSettlementPaymentInput(command.body, snapshot.event.currency)
      )
    }
    case 'deleteSettlementPayment':
      return store.deleteSettlementPayment(command.token, command.settlementPaymentId)
    default:
      return assertNever(command)
  }
}

async function requireEventSnapshot(store: AppStore, token: string): Promise<EventSnapshot> {
  const snapshot = await store.getEventByToken(token)
  if (!snapshot) {
    throw new StoreError('Event not found', 404)
  }
  return snapshot
}

async function notifyEventChanged(realtimeNotifier: EventRealtimeNotifier, token: string): Promise<void> {
  try {
    await realtimeNotifier.eventChanged(token)
  } catch (error: unknown) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'event_realtime_notify_failed',
      token,
      error: error instanceof Error ? error.message : String(error)
    }))
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled saved Event command: ${JSON.stringify(value)}`)
}
