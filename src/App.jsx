import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Home,
  ReceiptText,
  Split,
  WalletCards,
} from "lucide-react";
import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  addParticipant,
  createEvent,
  createExpense,
  createPayment,
  deleteExpense,
  deletePayment,
  getEvent,
  updateExpense,
} from "./client/api.ts";
import {
  ActionButton,
  Avatar,
  DecorativeIcon,
  FieldError,
  InlineStatus,
  SectionHeader,
  SelectShell,
} from "./components/design-system.jsx";
import {
  BalanceRow,
  ExpenseIcon,
  PaymentConfirmation,
  RemoveConfirmation,
  SettlementPrompt,
  UndoToast,
} from "./components/event-ui.jsx";
import { minorToDecimal, parseDecimalMoneyToMinor } from "./shared/domain.ts";

const demoParticipants = [
  { id: "andrejs", name: "Andrejs", initials: "AN", color: "green" },
  { id: "mia", name: "Mia", initials: "MI", color: "blue" },
  { id: "sam", name: "Sam", initials: "SA", color: "violet" },
  { id: "priya", name: "Priya", initials: "PR", color: "orange" },
];

const demoExpenses = [
  {
    description: "Groceries",
    amountMinor: 12480,
    payerName: "Andrejs",
    includedNames: ["Andrejs", "Mia", "Sam"],
  },
  {
    description: "Fuel",
    amountMinor: 6000,
    payerName: "Sam",
    includedNames: ["Andrejs", "Mia", "Sam", "Priya"],
  },
  {
    description: "Dinner",
    amountMinor: 6260,
    payerName: "Mia",
    includedNames: ["Andrejs", "Mia", "Sam", "Priya"],
  },
];

function isOpenBalance(valueMinor) {
  return Math.abs(valueMinor) > 0;
}

function validateExpense({ description, amount, includedIds }) {
  const errors = {};

  if (!description.trim()) {
    errors.description = "Please enter what this expense was for.";
  }

  try {
    parseDecimalMoneyToMinor(amount);
  } catch {
    errors.amount = "Enter an amount greater than $0.00.";
  }

  if (includedIds.length === 0) {
    errors.included = "Choose at least one participant to split this expense.";
  }

  return errors;
}

function formatNameList(items) {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0].name;
  }

  return `${items.slice(0, -1).map((item) => item.name).join(", ")} and ${items.at(-1).name}`;
}

function getScrollBehavior() {
  if (typeof window === "undefined") {
    return "auto";
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function scrollFieldIntoView(element) {
  element?.scrollIntoView({ block: "center", behavior: getScrollBehavior() });
}

function getEventTokenFromPath() {
  const match = /^\/e\/([^/]+)$/.exec(window.location.pathname);
  return match?.[1] ?? "";
}

function formatEventDate(value) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toUiExpense(expense) {
  return {
    id: expense.id,
    description: expense.description,
    amount: minorToDecimal(expense.amountMinor),
    amountMinor: expense.amountMinor,
    payerId: expense.payerId,
    includedIds: expense.shares.map((share) => share.participantId),
    date: expense.updatedAt === expense.createdAt ? formatEventDate(expense.createdAt) : "Updated today",
    icon: "groceries",
  };
}

function toUiPayment(payment) {
  return {
    id: payment.id,
    from: payment.from,
    to: payment.to,
    amount: minorToDecimal(payment.amountMinor),
    amountMinor: payment.amountMinor,
    date: formatEventDate(payment.createdAt),
  };
}

async function createDemoEvent() {
  const created = await createEvent({
    title: "Beach house weekend",
    currency: "AUD",
    firstParticipantName: demoParticipants[0].name,
  });

  let nextSnapshot = created.snapshot;

  for (const participant of demoParticipants.slice(1)) {
    nextSnapshot = await addParticipant(created.token, { name: participant.name });
  }

  for (const expense of demoExpenses) {
    const payer = nextSnapshot.participants.find((participant) => participant.name === expense.payerName);
    const includedParticipantIds = nextSnapshot.participants
      .filter((participant) => expense.includedNames.includes(participant.name))
      .map((participant) => participant.id);

    if (!payer) {
      throw new Error(`Could not create demo expense ${expense.description}.`);
    }

    nextSnapshot = await createExpense(created.token, {
      description: expense.description,
      amountMinor: expense.amountMinor,
      payerId: payer.id,
      includedParticipantIds,
    });
  }

  return nextSnapshot;
}

export function App() {
  const [snapshot, setSnapshot] = useState(null);
  const [eventToken, setEventToken] = useState("");
  const [appStatus, setAppStatus] = useState({ type: "loading", message: "Loading event" });
  const [currentParticipant, setCurrentParticipant] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [includedIds, setIncludedIds] = useState([]);
  const [savedMessage, setSavedMessage] = useState("Add details");
  const [copyStatus, setCopyStatus] = useState("Copy link");
  const [copyFallbackVisible, setCopyFallbackVisible] = useState(false);
  const [lastSettlementId, setLastSettlementId] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState("");
  const [pendingRemovalId, setPendingRemovalId] = useState("");
  const [recentlyRemovedExpense, setRecentlyRemovedExpense] = useState(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [splitControlsOpen, setSplitControlsOpen] = useState(false);
  const [settleModeOpen, setSettleModeOpen] = useState(false);
  const [settlementBlockNotice, setSettlementBlockNotice] = useState(false);
  const settlementStatusRef = useRef(null);
  const eventLinkRef = useRef(null);
  const descriptionRef = useRef(null);
  const amountRef = useRef(null);
  const includedRef = useRef(null);
  const firstIncludedInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialEvent() {
      try {
        const pathToken = getEventTokenFromPath();
        const nextSnapshot = pathToken
          ? await getEvent(pathToken)
          : await createDemoEvent();

        if (cancelled) {
          return;
        }

        setSnapshot(nextSnapshot);
        setEventToken(nextSnapshot.event.token);
        setAppStatus({ type: "ready", message: "Ready" });

        if (!pathToken) {
          window.history.replaceState(null, "", `/e/${nextSnapshot.event.token}`);
        }
      } catch (error) {
        if (!cancelled) {
          setAppStatus({
            type: "error",
            message: error instanceof Error ? error.message : "Could not load this event.",
          });
        }
      }
    }

    loadInitialEvent();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!eventToken) {
      return undefined;
    }

    let cancelled = false;

    async function refreshEvent() {
      try {
        const nextSnapshot = await getEvent(eventToken);
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch (error) {
        if (!cancelled) {
          setAppStatus({
            type: "error",
            message: error instanceof Error ? error.message : "Could not refresh this event.",
          });
        }
      }
    }

    const source = new EventSource(`/api/events/${eventToken}/stream`);
    source.addEventListener("changed", () => {
      refreshEvent();
    });
    source.onerror = () => {
      source.close();
    };

    const poll = window.setInterval(refreshEvent, 15000);

    return () => {
      cancelled = true;
      source.close();
      window.clearInterval(poll);
    };
  }, [eventToken]);

  const participants = snapshot?.participants ?? [];
  const expenses = useMemo(() => snapshot?.expenses.map(toUiExpense) ?? [], [snapshot]);
  const payments = useMemo(() => snapshot?.payments.map(toUiPayment) ?? [], [snapshot]);
  const balances = useMemo(() => {
    return Object.fromEntries(
      (snapshot?.balances ?? []).map((balance) => [
        balance.participantId,
        {
          paid: balance.paidMinor,
          owed: balance.owedMinor,
          net: balance.netMinor,
        },
      ]),
    );
  }, [snapshot]);
  const settlementSuggestion = useMemo(() => {
    if (!snapshot?.settlementSuggestion) {
      return null;
    }

    const from = participants.find((participant) => participant.id === snapshot.settlementSuggestion.from);
    const to = participants.find((participant) => participant.id === snapshot.settlementSuggestion.to);

    if (!from || !to) {
      return null;
    }

    return {
      from,
      to,
      amountMinor: snapshot.settlementSuggestion.amountMinor,
      amount: minorToDecimal(snapshot.settlementSuggestion.amountMinor),
    };
  }, [participants, snapshot]);
  const current = participants.find((item) => item.id === currentParticipant) ?? participants[0];
  const currentBalance = current ? balances[current.id]?.net ?? 0 : 0;
  const selectedCount = includedIds.length;
  const draftAmountMinor = (() => {
    try {
      return amount.trim() ? parseDecimalMoneyToMinor(amount) : 0;
    } catch {
      return 0;
    }
  })();
  const perPersonMinor = selectedCount && draftAmountMinor ? Math.round(draftAmountMinor / selectedCount) : 0;
  const lastSettlement = payments.find((payment) => payment.id === lastSettlementId);
  const lastSettlementFrom = lastSettlement
    ? participants.find((item) => item.id === lastSettlement.from)
    : null;
  const lastSettlementTo = lastSettlement
    ? participants.find((item) => item.id === lastSettlement.to)
    : null;
  const mostRelevantOpenBalance = useMemo(() => {
    const currentRow = balances[currentParticipant];
    if (current && currentRow && isOpenBalance(currentRow.net)) {
      return { participant: current, row: currentRow };
    }

    return participants
      .map((participant) => ({ participant, row: balances[participant.id] }))
      .filter(({ row }) => isOpenBalance(row.net))
      .sort((a, b) => Math.abs(b.row.net) - Math.abs(a.row.net))[0];
  }, [balances, current, currentParticipant]);
  const currentIsSettled = !isOpenBalance(currentBalance);
  const currencyCode = snapshot?.event.currency ?? "AUD";
  const eventUrl = snapshot ? `${window.location.origin}/e/${snapshot.event.token}` : "";
  const eventCreatedBy = participants[0]?.name ?? "Participant";
  const eventRecordCount = payments.length + expenses.length;
  const currentBalanceLabel = currentIsSettled
    ? "You're settled"
    : currentBalance > 0
      ? `You get back ${money(Math.abs(currentBalance))}`
      : `You pay ${money(Math.abs(currentBalance))}`;
  const currentBalanceTone = currentIsSettled ? "settled" : currentBalance > 0 ? "positive" : "negative";
  const currentValidation = validateExpense({ description, amount, includedIds });
  const canSave = Object.keys(currentValidation).length === 0;
  const visibleErrors = attemptedSubmit ? currentValidation : {};
  const needsReview = attemptedSubmit && !canSave;
  const hasRecentSave = savedMessage === "Saved just now" || savedMessage === "Updated just now";
  const saveStatus = hasRecentSave ? savedMessage : canSave ? "Ready to save" : needsReview ? "Review fields" : "Add details";
  const saveButtonLabel = needsReview ? "Review fields" : editingExpenseId ? "Update expense" : "Save expense";
  const allParticipantIds = participants.map((participant) => participant.id);
  const splitWithEveryone = selectedCount === participants.length;
  const excludedParticipants = participants.filter((participant) => !includedIds.includes(participant.id));
  const splitSummary = splitWithEveryone
    ? "Split with everyone"
    : selectedCount === 0
      ? "No split participants selected"
      : excludedParticipants.length <= selectedCount
        ? `Everyone except ${formatNameList(excludedParticipants)}`
        : `Split with ${formatNameList(participants.filter((participant) => includedIds.includes(participant.id)))}`;
  const payer = participants.find((participant) => participant.id === payerId);
  const payerSummaryLabel =
    payer && payerId === currentParticipant ? `Payer defaults to ${payer.name}` : `Paid by ${payer?.name ?? current?.name}`;
  const hasExpenseDraft = Boolean(
    description.trim() ||
      amount.trim() ||
      editingExpenseId ||
      payerId !== currentParticipant ||
      !splitWithEveryone,
  );
  const shouldBlockSettlement = hasExpenseDraft || needsReview;
  const captureJustFinished = savedMessage === "Saved just now" || savedMessage === "Updated just now";
  const showSettlementTools = Boolean(
    settlementSuggestion && !shouldBlockSettlement && (captureJustFinished || lastSettlement || settleModeOpen),
  );
  const settlementExplainer = settlementSuggestion
    ? `${settlementSuggestion.from.name} should send ${money(settlementSuggestion.amountMinor)} to ${settlementSuggestion.to.name}. This only marks the event as paid; it does not transfer money.`
    : "No one needs to pay right now.";
  useEffect(() => {
    if (!snapshot || participants.length === 0) {
      return;
    }

    const storageKey = `settleup:${snapshot.event.token}:participant`;
    const rememberedParticipant = window.localStorage.getItem(storageKey);
    const fallbackParticipant = participants.find((participant) => participant.id === rememberedParticipant)?.id
      ?? participants[0].id;
    const participantIds = participants.map((participant) => participant.id);

    setCurrentParticipant((currentId) => participantIds.includes(currentId) ? currentId : fallbackParticipant);
    setPayerId((currentId) => participantIds.includes(currentId) ? currentId : fallbackParticipant);
    setIncludedIds((currentIds) => currentIds.length > 0
      ? currentIds.filter((participantId) => participantIds.includes(participantId))
      : participantIds);
  }, [participants, snapshot]);

  useEffect(() => {
    if (!snapshot || !currentParticipant) {
      return;
    }

    window.localStorage.setItem(`settleup:${snapshot.event.token}:participant`, currentParticipant);
  }, [currentParticipant, snapshot]);

  function money(amountMinor) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currencyCode,
    }).format(minorToDecimal(amountMinor));
  }

  if (appStatus.type === "loading" || !snapshot || !current || participants.length === 0) {
    return (
      <main className="app-shell">
        <section className="workspace" aria-label="SettleUp event workspace">
          <div className="event-hero">
            <div className="event-copy">
              <h1>SettleUp</h1>
              <p className="event-privacy">{appStatus.message}</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (appStatus.type === "error") {
    return (
      <main className="app-shell">
        <section className="workspace" aria-label="SettleUp event workspace">
          <div className="event-hero">
            <div className="event-copy">
              <h1>SettleUp</h1>
              <p className="event-privacy">{appStatus.message}</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  function changeCurrentParticipant(nextParticipantId) {
    const previousParticipantId = currentParticipant;
    setCurrentParticipant(nextParticipantId);
    setPayerId((currentPayerId) =>
      currentPayerId === previousParticipantId ? nextParticipantId : currentPayerId,
    );
  }

  function focusFirstError(errors) {
    if (errors.description) {
      descriptionRef.current?.focus();
      scrollFieldIntoView(descriptionRef.current);
      return;
    }

    if (errors.amount) {
      amountRef.current?.focus();
      scrollFieldIntoView(amountRef.current);
      return;
    }

    if (errors.included) {
      setSplitControlsOpen(true);
      window.setTimeout(() => {
        firstIncludedInputRef.current?.focus();
        scrollFieldIntoView(includedRef.current);
      }, 0);
    }
  }

  async function copyEventLink() {
    if (copyFallbackVisible) {
      eventLinkRef.current?.focus();
      eventLinkRef.current?.select();
      return;
    }

    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopyStatus("Copied");
      setCopyFallbackVisible(false);
    } catch {
      setCopyStatus("Select link");
      setCopyFallbackVisible(true);
      window.setTimeout(() => {
        eventLinkRef.current?.focus();
        eventLinkRef.current?.select();
      }, 0);
    }
  }

  function reviewExpenseFields() {
    setAttemptedSubmit(true);
    focusFirstError(currentValidation);
  }

  async function recordSuggestedPayment() {
    if (!settlementSuggestion) {
      return;
    }

    if (shouldBlockSettlement) {
      setSettlementBlockNotice(true);
      setSettleModeOpen(false);
      scrollFieldIntoView(descriptionRef.current);
      return;
    }

    try {
      const nextSnapshot = await createPayment(eventToken, {
        from: settlementSuggestion.from.id,
        to: settlementSuggestion.to.id,
        amountMinor: settlementSuggestion.amountMinor,
      });
      setSnapshot(nextSnapshot);
      setLastSettlementId(nextSnapshot.payments[0]?.id ?? "");
      setSettleModeOpen(true);
      window.setTimeout(() => {
        settlementStatusRef.current?.focus();
      }, 0);
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Could not record payment");
    }
  }

  async function undoSettlement(paymentId) {
    try {
      setSnapshot(await deletePayment(eventToken, paymentId));
      setLastSettlementId("");
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Could not undo payment");
    }
  }

  function toggleIncluded(id) {
    setSavedMessage("Add details");
    setSettlementBlockNotice(false);
    setIncludedIds((selected) =>
      selected.includes(id)
        ? selected.filter((participantId) => participantId !== id)
        : [...selected, id],
    );
  }

  async function saveExpense(event) {
    event.preventDefault();
    setAttemptedSubmit(true);
    const nextErrors = validateExpense({ description, amount, includedIds });

    if (Object.keys(nextErrors).length > 0) {
      setSavedMessage("Review required fields");
      focusFirstError(nextErrors);
      return;
    }

    const nextExpense = {
      description: description.trim(),
      amountMinor: parseDecimalMoneyToMinor(amount),
      payerId,
      includedParticipantIds: includedIds,
    };

    try {
      const nextSnapshot = editingExpenseId
        ? await updateExpense(eventToken, editingExpenseId, nextExpense)
        : await createExpense(eventToken, nextExpense);
      setSnapshot(nextSnapshot);
      setDescription("");
      setAmount("");
      setSavedMessage(editingExpenseId ? "Updated just now" : "Saved just now");
      setEditingExpenseId("");
      setAttemptedSubmit(false);
      setSettlementBlockNotice(false);
      setSplitControlsOpen(false);
      descriptionRef.current?.focus();
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Could not save expense");
    }
  }

  function editExpense(expense) {
    setEditingExpenseId(expense.id);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setPayerId(expense.payerId);
    setIncludedIds(expense.includedIds);
    setAttemptedSubmit(false);
    setSplitControlsOpen(true);
    setSavedMessage("Editing expense");
    setSettlementBlockNotice(false);
    descriptionRef.current?.focus();
    scrollFieldIntoView(descriptionRef.current);
  }

  function cancelExpenseEdit() {
    setEditingExpenseId("");
    setDescription("");
    setAmount("");
    setSavedMessage("Add details");
    setAttemptedSubmit(false);
    setSettlementBlockNotice(false);
    setSplitControlsOpen(false);
  }

  function openSettlementMode() {
    if (!settlementSuggestion) {
      return;
    }

    if (shouldBlockSettlement) {
      setSettlementBlockNotice(true);
      setSettleModeOpen(false);
      scrollFieldIntoView(descriptionRef.current);
      return;
    }

    setSettlementBlockNotice(false);
    setSettleModeOpen(true);
  }

  function discardExpenseDraftAndSettle() {
    if (!settlementSuggestion) {
      return;
    }

    setEditingExpenseId("");
    setDescription("");
    setAmount("");
    setPayerId(currentParticipant);
    setIncludedIds(allParticipantIds);
    setSavedMessage("Add details");
    setAttemptedSubmit(false);
    setSplitControlsOpen(false);
    setSettlementBlockNotice(false);
    setSettleModeOpen(true);
  }

  function requestExpenseRemoval(expenseId) {
    setPendingRemovalId((currentId) => (currentId === expenseId ? "" : expenseId));
  }

  async function removeExpense(expense) {
    setRecentlyRemovedExpense(expense);
    setPendingRemovalId("");
    try {
      setSnapshot(await deleteExpense(eventToken, expense.id));
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Could not remove expense");
      setRecentlyRemovedExpense(null);
    }
    if (editingExpenseId === expense.id) {
      cancelExpenseEdit();
    }
  }

  async function undoRemoveExpense() {
    if (!recentlyRemovedExpense) {
      return;
    }

    try {
      setSnapshot(await createExpense(eventToken, {
        description: recentlyRemovedExpense.description,
        amountMinor: recentlyRemovedExpense.amountMinor,
        payerId: recentlyRemovedExpense.payerId,
        includedParticipantIds: recentlyRemovedExpense.includedIds,
      }));
      setRecentlyRemovedExpense(null);
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Could not restore expense");
    }
  }

  function renderBalanceRows() {
    const openRows = participants
      .map((participant) => ({
        participant,
        row: balances[participant.id],
      }))
      .filter(({ row }) => isOpenBalance(row.net));

    if (openRows.length === 0) {
      return (
        <BalanceRow
          label="Everyone is settled"
          description="No one needs to pay anything for this event."
        />
      );
    }

    return openRows.map(({ participant, row }) => {
      const positive = row.net > 0;
      return (
        <BalanceRow
          key={participant.id}
          participant={participant}
          currentParticipantId={currentParticipant}
          tone={positive ? "positive" : "negative"}
          value={money(Math.abs(row.net))}
          description={`Paid ${money(row.paid)} · Share ${money(row.owed)}`}
        />
      );
    });
  }

  function renderSettlePrompt() {
    return <SettlementPrompt settlementSuggestion={settlementSuggestion} onRecord={openSettlementMode} />;
  }

  function renderSettlementPanel() {
    if (!settleModeOpen) {
      return null;
    }

    return (
      <section className="panel settlement-panel" aria-label="Record payment">
        <SectionHeader
          icon={WalletCards}
          title="Record payment"
          muted="Confirm this after the money has been sent."
          action={
            <ActionButton className="close-settle" onClick={() => setSettleModeOpen(false)}>
              Back to capture
            </ActionButton>
          }
        />
        {settlementSuggestion ? (
          <div className="settlement-review">
            <div className="settlement-next">
              <span>Who pays next</span>
              <strong>
                {settlementSuggestion.from.name} pays {settlementSuggestion.to.name}{" "}
                {money(settlementSuggestion.amountMinor)}
              </strong>
            </div>
            <p>{settlementExplainer}</p>
            <ActionButton variant="summary" onClick={recordSuggestedPayment}>
              <DecorativeIcon icon={WalletCards} size={16} />
              Mark as paid
            </ActionButton>
          </div>
        ) : (
          <div className="settlement-review">
            <div className="settlement-next">
              <span>Payment status</span>
              <strong>Everyone is settled</strong>
            </div>
            <p>No one needs to pay right now.</p>
          </div>
        )}
        {lastSettlement ? (
          <div className="settlement-ledger">
            <span>Last recorded</span>
            <strong>
              {lastSettlementFrom.name} paid {lastSettlementTo.name}{" "}
              {money(lastSettlement.amountMinor)}
            </strong>
            <button type="button" onClick={() => undoSettlement(lastSettlement.id)}>
              Undo payment
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  function renderPaymentConfirmation() {
    if (!lastSettlement || !lastSettlementFrom || !lastSettlementTo) {
      return null;
    }

    return (
      <PaymentConfirmation
        amount={lastSettlement.amountMinor}
        from={lastSettlementFrom}
        money={money}
        onUndo={() => undoSettlement(lastSettlement.id)}
        statusRef={settlementStatusRef}
        to={lastSettlementTo}
      />
    );
  }

  function renderMobileBalancePreview() {
    if (!mostRelevantOpenBalance) {
      return null;
    }

    const positive = mostRelevantOpenBalance.row.net > 0;
    return (
      <BalanceRow
        className="balance-row-preview"
        participant={mostRelevantOpenBalance.participant}
        currentParticipantId={currentParticipant}
        label="Most important payment"
        tone={positive ? "positive" : "negative"}
        value={money(Math.abs(mostRelevantOpenBalance.row.net))}
        description="Based on the largest amount left to settle."
      />
    );
  }

  return (
    <main className="app-shell">
      <section className="workspace" aria-label="SettleUp event workspace">
        <header className="topbar">
          <a className="brand" href="/" aria-label="SettleUp home">
            <span>Settle</span>
            <strong>Up</strong>
          </a>
          <span className="currency-pill" aria-label={`Currency ${snapshot.event.currency}`}>
            {snapshot.event.currency}
          </span>
          <div className={`url-copy ${copyFallbackVisible ? "url-copy-fallback" : ""}`} aria-live="polite">
            {copyFallbackVisible ? (
              <input
                ref={eventLinkRef}
                className="event-url-fallback"
                value={eventUrl}
                readOnly
                aria-label="Event link"
                onFocus={(event) => event.currentTarget.select()}
              />
            ) : (
              <span>{eventUrl}</span>
            )}
            <button
              type="button"
              onClick={copyEventLink}
              aria-label={copyFallbackVisible ? "Select event link" : undefined}
            >
              <DecorativeIcon icon={copyStatus === "Copied" ? Check : Copy} size={16} />
              {copyStatus}
            </button>
          </div>
          <div className="expiry">
            <DecorativeIcon icon={CalendarClock} size={17} />
            Expires {formatEventDate(snapshot.event.expiresAt)}
          </div>
        </header>

        <div className="event-hero">
          <div className="event-mark">
            <DecorativeIcon icon={Home} size={30} />
          </div>
          <div className="event-copy">
            <div className="event-title-row">
              <h1>{snapshot.event.title}</h1>
            </div>
            <p className="event-meta">
              {participants.length} {participants.length === 1 ? "participant" : "participants"} · Created{" "}
              {formatEventDate(snapshot.event.createdAt)} by {eventCreatedBy}
            </p>
            <p className="event-privacy">
              Anyone with this link can add or edit expenses until {formatEventDate(snapshot.event.expiresAt)}.
            </p>
          </div>
        </div>

        <div className="grid">
          {renderPaymentConfirmation()}

          <form className="panel expense-panel" onSubmit={saveExpense}>
            <SectionHeader
              icon={ReceiptText}
              title={editingExpenseId ? "Edit expense" : "Add expense"}
              muted={`Adding as ${current.name}`}
              action={
                <InlineStatus
                  icon={canSave ? Check : needsReview ? AlertCircle : FileText}
                  tone={canSave ? "success" : needsReview ? "warning" : "neutral"}
                >
                  {saveStatus}
                </InlineStatus>
              }
            />

            {settlementBlockNotice ? (
              <div className="form-block-notice" role="alert">
                <DecorativeIcon icon={AlertCircle} size={17} />
                <div>
                  <strong>Finish this expense before settling.</strong>
                  <p>Save it, cancel it, or discard the draft before recording a payment.</p>
                </div>
                <div className="form-block-actions">
                  <button type="button" onClick={reviewExpenseFields}>
                    Review expense fields
                  </button>
                  <button type="button" onClick={discardExpenseDraftAndSettle}>
                    Discard draft and settle
                  </button>
                </div>
              </div>
            ) : null}

            {!canSave && attemptedSubmit && !settlementBlockNotice ? (
              <div className="form-error-summary" role="alert">
                <DecorativeIcon icon={AlertCircle} size={17} />
                <p>Review the highlighted fields before saving this expense.</p>
              </div>
            ) : null}

            <label className="field identity-field">
              <span>Your name</span>
              <SelectShell wide>
                <Avatar participant={current} small />
                <select
                  aria-label="Your name"
                  value={currentParticipant}
                  onChange={(event) => changeCurrentParticipant(event.target.value)}
                >
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
                </select>
                <DecorativeIcon icon={ChevronDown} size={15} />
              </SelectShell>
            </label>

            <div className="field-grid">
              <label className="field span-2">
                <span>Description</span>
                <div className="input-with-icon">
                  <input
                    ref={descriptionRef}
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setSavedMessage("Add details");
                      setSettlementBlockNotice(false);
                    }}
                    aria-invalid={Boolean(visibleErrors.description)}
                    aria-describedby={visibleErrors.description ? "description-error" : undefined}
                  />
                  <DecorativeIcon icon={FileText} size={17} />
                </div>
                <FieldError id="description-error">{visibleErrors.description}</FieldError>
              </label>
              <label className="field">
                <span>Amount ({snapshot.event.currency})</span>
                <input
                  ref={amountRef}
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setSavedMessage("Add details");
                    setSettlementBlockNotice(false);
                  }}
                  aria-invalid={Boolean(visibleErrors.amount)}
                  aria-describedby={visibleErrors.amount ? "amount-error" : undefined}
                />
                <FieldError id="amount-error">{visibleErrors.amount}</FieldError>
              </label>
            </div>

            <div className="capture-defaults">
              <div>
                <span>{payerSummaryLabel}</span>
                <strong>
                  {splitSummary}
                  {selectedCount ? ` · ${perPersonMinor ? money(perPersonMinor) : "$0.00"} each` : ""}
                </strong>
              </div>
              <ActionButton
                aria-expanded={splitControlsOpen}
                onClick={() => setSplitControlsOpen((isOpen) => !isOpen)}
              >
                Edit payer and split
              </ActionButton>
            </div>

            {splitControlsOpen ? (
              <div className="split-controls">
                <fieldset className="choice-group">
                  <legend>Paid by</legend>
                  <div className="participant-segments">
                    {participants.map((participant) => (
                      <button
                        key={participant.id}
                        className={participant.id === payerId ? "selected" : ""}
                        type="button"
                        aria-pressed={participant.id === payerId}
                        onClick={() => setPayerId(participant.id)}
                      >
                        <Avatar participant={participant} small />
                        {participant.name}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset
                  className="choice-group"
                  aria-invalid={Boolean(visibleErrors.included)}
                  aria-describedby={visibleErrors.included ? "included-error" : undefined}
                >
                  <legend ref={includedRef}>Split with</legend>
                  <div className="legend-row">
                    <div className="legend-actions">
                      <button type="button" onClick={() => setIncludedIds(allParticipantIds)}>
                        Everyone
                      </button>
                      <button type="button" onClick={() => setIncludedIds([])}>
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="participant-segments checkbox-segments">
                    {participants.map((participant, index) => {
                      const checked = includedIds.includes(participant.id);
                      return (
                        <label
                          key={participant.id}
                          className={`segment-check ${checked ? "selected" : ""}`}
                        >
                          <input
                            ref={index === 0 ? firstIncludedInputRef : undefined}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleIncluded(participant.id)}
                          />
                          <span className={`checkbox ${checked ? "checked" : ""}`}>
                            {checked ? <DecorativeIcon icon={Check} size={14} /> : null}
                          </span>
                          <span>{participant.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <FieldError className="field-error-inline" id="included-error">
                    {visibleErrors.included}
                  </FieldError>
                </fieldset>
              </div>
            ) : visibleErrors.included ? (
              <FieldError className="collapsed-split-error" id="included-error">
                {visibleErrors.included}
              </FieldError>
            ) : null}

            <div className="split-row">
              <p>
                Equal split <span>·</span> {splitSummary}
              </p>
            </div>

            <div className="form-actions">
              {editingExpenseId ? (
                <ActionButton onClick={cancelExpenseEdit}>
                  Cancel edit
                </ActionButton>
              ) : (
                <p className="form-action-note">Add expenses first. Payment options appear after capture.</p>
              )}
              <ActionButton variant="primary" needsReview={needsReview} type="submit">
                <DecorativeIcon icon={canSave ? Check : needsReview ? AlertCircle : FileText} size={17} />
                {saveButtonLabel}
              </ActionButton>
            </div>
          </form>

          {renderSettlementPanel()}

          <section className="panel balances-panel">
            <SectionHeader
              icon={Split}
              title="Who pays what"
              action={<span className="subtle-label">All amounts in {snapshot.event.currency}</span>}
            />
            <div className="balance-list full-balance-list">
              {renderBalanceRows()}
            </div>
            <footer className="panel-total">
              <strong>Your payment status</strong>
              <span className={currentBalanceTone}>{currentBalanceLabel}</span>
            </footer>
            {showSettlementTools ? renderSettlePrompt() : null}
            <div className="mobile-balance-preview">
              {renderMobileBalancePreview()}
            </div>
            <details className="mobile-balance-details">
              <summary>Everyone's balances</summary>
              <div className="balance-list mobile-balance-list">{renderBalanceRows()}</div>
            </details>
          </section>

          <section className="panel history-panel">
            <SectionHeader icon={FileText} title="Event history" muted="Recent expenses and payments" />
            <div className="history-list">
              {payments.map((payment) => {
                const from = participants.find((item) => item.id === payment.from);
                const to = participants.find((item) => item.id === payment.to);
                return (
                  <article className="history-entry" key={payment.id}>
                    <div className="history-row payment-history-row">
                      <span className="expense-icon payment-icon">
                        <DecorativeIcon icon={WalletCards} size={19} />
                      </span>
                      <div className="history-main">
                        <strong>
                          {from.name} paid {to.name}
                        </strong>
                        <span>{payment.date} · Payment marked paid</span>
                      </div>
                      <strong className="history-amount">{money(payment.amountMinor)}</strong>
                      <button className="undo-history-payment" type="button" onClick={() => undoSettlement(payment.id)}>
                        Undo payment
                      </button>
                    </div>
                  </article>
                );
              })}
              {expenses.map((expense) => {
                const payer = participants.find((item) => item.id === expense.payerId);
                return (
                  <article className="history-entry" key={expense.id}>
                    <div className="history-row">
                      <ExpenseIcon type={expense.icon} />
                      <div className="history-main">
                        <strong>{expense.description}</strong>
                        <span>
                          {expense.date} · Paid by {payer.name} · Split with {expense.includedIds.length}{" "}
                          {expense.includedIds.length === 1 ? "person" : "people"}
                        </span>
                      </div>
                      <strong className="history-amount">{money(expense.amountMinor)}</strong>
                      <div className="history-actions">
                        <button
                          type="button"
                          onClick={() => editExpense(expense)}
                          aria-label={`Edit ${expense.description}`}
                        >
                          Edit
                        </button>
                        <button
                          className="danger-action"
                          type="button"
                          onClick={() => requestExpenseRemoval(expense.id)}
                          aria-expanded={pendingRemovalId === expense.id}
                          aria-label={`Remove ${expense.description}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {pendingRemovalId === expense.id ? (
                      <RemoveConfirmation
                        expense={expense}
                        money={money}
                        onKeep={() => setPendingRemovalId("")}
                        onRemove={() => removeExpense(expense)}
                      />
                    ) : null}
                  </article>
                );
              })}
            </div>
            <p className="history-count">Showing all {eventRecordCount} event records</p>
          </section>
        </div>

        <UndoToast expense={recentlyRemovedExpense} money={money} onUndo={undoRemoveExpense} />

        <footer className="footer">
          <span>© 2026 SettleUp</span>
          <span>Event expires {formatEventDate(snapshot.event.expiresAt)}.</span>
        </footer>
      </section>

    </main>
  );
}
