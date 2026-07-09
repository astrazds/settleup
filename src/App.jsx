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
  UserPlus,
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
  deleteParticipant,
  deletePayment,
  getEvent,
  renameParticipant,
  updateExpense,
  updatePayment,
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

const supportedCurrencies = ["AUD", "USD", "EUR", "GBP", "NZD"];

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

function validateEventSetup({ title, firstParticipantName }) {
  const errors = {};

  if (!title.trim()) {
    errors.title = "Enter an event name.";
  }

  if (!firstParticipantName.trim()) {
    errors.firstParticipantName = "Enter your name.";
  }

  return errors;
}

function validatePayment({ amount, fromId, toId }) {
  const errors = {};

  if (!fromId || !toId) {
    errors.participants = "Choose who paid and who received it.";
  } else if (fromId === toId) {
    errors.participants = "Choose two different people for this payment.";
  }

  try {
    parseDecimalMoneyToMinor(amount);
  } catch {
    errors.amount = "Enter an amount greater than $0.00.";
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

export function App() {
  const [snapshot, setSnapshot] = useState(null);
  const [eventToken, setEventToken] = useState("");
  const [appStatus, setAppStatus] = useState({ type: "loading", message: "Loading event" });
  const [eventTitle, setEventTitle] = useState("");
  const [eventCurrency, setEventCurrency] = useState("AUD");
  const [firstParticipantName, setFirstParticipantName] = useState("");
  const [createAttempted, setCreateAttempted] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [currentParticipant, setCurrentParticipant] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState("");
  const [includedIds, setIncludedIds] = useState([]);
  const [savedMessage, setSavedMessage] = useState("Add details");
  const [copyStatus, setCopyStatus] = useState("Copy link");
  const [copyFallbackVisible, setCopyFallbackVisible] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [participantError, setParticipantError] = useState("");
  const [participantSubmitting, setParticipantSubmitting] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState("");
  const [participantEditName, setParticipantEditName] = useState("");
  const [participantEditError, setParticipantEditError] = useState("");
  const [lastSettlementId, setLastSettlementId] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState("");
  const [paymentFromId, setPaymentFromId] = useState("");
  const [paymentToId, setPaymentToId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");
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

        if (!pathToken) {
          if (!cancelled) {
            setAppStatus({ type: "create", message: "Create event" });
          }
          return;
        }

        const nextSnapshot = await getEvent(pathToken);

        if (cancelled) {
          return;
        }

        setSnapshot(nextSnapshot);
        setEventToken(nextSnapshot.event.token);
        setAppStatus({ type: "ready", message: "Ready" });
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
  const showSettlementTools = Boolean(settlementSuggestion && !shouldBlockSettlement);
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

  useEffect(() => {
    if (participants.length === 0) {
      return;
    }

    const participantIds = participants.map((participant) => participant.id);
    setPaymentFromId((currentId) => participantIds.includes(currentId) ? currentId : participantIds[0]);
    setPaymentToId((currentId) => {
      if (participantIds.includes(currentId) && currentId !== paymentFromId) {
        return currentId;
      }

      return participantIds.find((participantId) => participantId !== paymentFromId) ?? participantIds[0];
    });
  }, [participants, paymentFromId]);

  function money(amountMinor) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currencyCode,
    }).format(minorToDecimal(amountMinor));
  }

  function fillPaymentDraftFromSuggestion() {
    if (!settlementSuggestion) {
      return;
    }

    setEditingPaymentId("");
    setPaymentFromId(settlementSuggestion.from.id);
    setPaymentToId(settlementSuggestion.to.id);
    setPaymentAmount(String(settlementSuggestion.amount));
    setPaymentError("");
  }

  function resetPaymentDraft() {
    setEditingPaymentId("");
    setPaymentFromId(participants[0]?.id ?? "");
    setPaymentToId(participants[1]?.id ?? participants[0]?.id ?? "");
    setPaymentAmount("");
    setPaymentError("");
  }

  async function createNewEvent(event) {
    event.preventDefault();
    setCreateAttempted(true);
    setCreateError("");
    const errors = validateEventSetup({ title: eventTitle, firstParticipantName });

    if (Object.keys(errors).length > 0) {
      return;
    }

    setCreateSubmitting(true);
    try {
      const created = await createEvent({
        title: eventTitle.trim(),
        currency: eventCurrency,
        firstParticipantName: firstParticipantName.trim(),
      });

      setSnapshot(created.snapshot);
      setEventToken(created.token);
      setAppStatus({ type: "ready", message: "Ready" });
      setCreateSubmitting(false);
      window.history.replaceState(null, "", `/e/${created.token}`);
    } catch (error) {
      setCreateSubmitting(false);
      setCreateError(error instanceof Error ? error.message : "Could not create this event.");
    }
  }

  if (appStatus.type === "create") {
    const createValidation = validateEventSetup({ title: eventTitle, firstParticipantName });
    const visibleCreateErrors = createAttempted ? createValidation : {};

    return (
      <main className="app-shell app-shell-create">
        <section className="workspace create-workspace" aria-label="Create SettleUp event">
          <header className="topbar create-topbar">
            <a className="brand" href="/" aria-label="SettleUp home">
              <span>Settle</span>
              <strong>Up</strong>
            </a>
          </header>

          <div className="event-hero create-hero">
            <div className="event-mark">
              <DecorativeIcon icon={Home} size={30} />
            </div>
            <div className="event-copy">
              <h1>Create an event</h1>
              <p className="event-privacy">
                Give the event a name, add yourself, and set a currency.
              </p>
            </div>
          </div>

          <form className="panel create-panel" onSubmit={createNewEvent}>
            {createError ? (
              <div className="form-error-summary create-error" role="alert">
                <DecorativeIcon icon={AlertCircle} size={17} />
                <p>{createError}</p>
              </div>
            ) : null}

            <div className="create-form-grid">
              <label className="field create-event-name-field">
                <span>Event name</span>
                <div className="input-with-icon">
                  <input
                    value={eventTitle}
                    onChange={(event) => {
                      setEventTitle(event.target.value);
                      setCreateError("");
                    }}
                    aria-invalid={Boolean(visibleCreateErrors.title)}
                    aria-describedby={visibleCreateErrors.title ? "event-title-error" : undefined}
                    autoFocus
                  />
                  <DecorativeIcon icon={FileText} size={17} />
                </div>
                <FieldError id="event-title-error">{visibleCreateErrors.title}</FieldError>
              </label>

              <label className="field create-participant-field">
                <span>Your name</span>
                <input
                  value={firstParticipantName}
                  onChange={(event) => {
                    setFirstParticipantName(event.target.value);
                    setCreateError("");
                  }}
                  aria-invalid={Boolean(visibleCreateErrors.firstParticipantName)}
                  aria-describedby={
                    visibleCreateErrors.firstParticipantName ? "first-participant-error" : undefined
                  }
                />
                <FieldError id="first-participant-error">
                  {visibleCreateErrors.firstParticipantName}
                </FieldError>
              </label>

              <label className="field create-currency-field">
                <span>Currency</span>
                <SelectShell wide>
                  <select
                    aria-label="Currency"
                    value={eventCurrency}
                    onChange={(event) => setEventCurrency(event.target.value)}
                  >
                    {supportedCurrencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                  <DecorativeIcon icon={ChevronDown} size={15} />
                </SelectShell>
              </label>
            </div>

            <div className="create-summary">
              <DecorativeIcon icon={CalendarClock} size={17} />
              <p>
                Anyone with the event link can add people, expenses, and settlement payments. Links expire after three days.
              </p>
            </div>

            <div className="form-actions">
              <ActionButton
                variant="primary"
                type="submit"
                disabled={createSubmitting}
                needsReview={createAttempted && Object.keys(createValidation).length > 0}
              >
                <DecorativeIcon icon={createSubmitting ? CalendarClock : Check} size={17} />
                {createSubmitting ? "Creating event" : "Create event"}
              </ActionButton>
            </div>
          </form>
        </section>
      </main>
    );
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
              <p className="event-error-action">
                <a className="secondary-action compact" href="/">
                  Create new event
                </a>
              </p>
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

  async function saveParticipant(event) {
    event.preventDefault();
    const nextName = participantName.trim();

    if (!nextName) {
      setParticipantError("Enter a participant name.");
      return;
    }

    setParticipantSubmitting(true);
    setParticipantError("");
    try {
      const wasSplitWithEveryone = includedIds.length === participants.length;
      const nextSnapshot = await addParticipant(eventToken, { name: nextName });
      setSnapshot(nextSnapshot);
      setParticipantName("");
      setParticipantSubmitting(false);

      if (!hasExpenseDraft && wasSplitWithEveryone) {
        setIncludedIds(nextSnapshot.participants.map((participant) => participant.id));
      }
    } catch (error) {
      setParticipantSubmitting(false);
      setParticipantError(error instanceof Error ? error.message : "Could not add this participant.");
    }
  }

  function startParticipantEdit(participant) {
    setEditingParticipantId(participant.id);
    setParticipantEditName(participant.name);
    setParticipantEditError("");
  }

  function cancelParticipantEdit() {
    setEditingParticipantId("");
    setParticipantEditName("");
    setParticipantEditError("");
  }

  async function saveParticipantEdit(event) {
    event.preventDefault();
    const nextName = participantEditName.trim();

    if (!nextName) {
      setParticipantEditError("Enter a participant name.");
      return;
    }

    try {
      setSnapshot(await renameParticipant(eventToken, editingParticipantId, { name: nextName }));
      cancelParticipantEdit();
    } catch (error) {
      setParticipantEditError(error instanceof Error ? error.message : "Could not rename this participant.");
    }
  }

  async function removeParticipant(participant) {
    try {
      setSnapshot(await deleteParticipant(eventToken, participant.id));
      if (editingParticipantId === participant.id) {
        cancelParticipantEdit();
      }
    } catch (error) {
      setParticipantEditError(error instanceof Error ? error.message : "Could not remove this participant.");
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
      resetPaymentDraft();
      window.setTimeout(() => {
        settlementStatusRef.current?.focus();
      }, 0);
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Could not record payment");
    }
  }

  async function saveManualPayment(event) {
    event.preventDefault();
    const errors = validatePayment({ amount: paymentAmount, fromId: paymentFromId, toId: paymentToId });

    if (Object.keys(errors).length > 0) {
      setPaymentError(errors.participants ?? errors.amount);
      return;
    }

    const payment = {
      amountMinor: parseDecimalMoneyToMinor(paymentAmount),
      from: paymentFromId,
      to: paymentToId,
    };

    try {
      const nextSnapshot = editingPaymentId
        ? await updatePayment(eventToken, editingPaymentId, payment)
        : await createPayment(eventToken, payment);
      setSnapshot(nextSnapshot);
      setLastSettlementId(editingPaymentId || nextSnapshot.payments[0]?.id || "");
      resetPaymentDraft();
      setSettleModeOpen(true);
      window.setTimeout(() => {
        settlementStatusRef.current?.focus();
      }, 0);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Could not save payment.");
    }
  }

  async function undoSettlement(paymentId) {
    try {
      setSnapshot(await deletePayment(eventToken, paymentId));
      setLastSettlementId("");
      if (editingPaymentId === paymentId) {
        resetPaymentDraft();
      }
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Could not undo payment");
    }
  }

  function editPayment(payment) {
    setEditingPaymentId(payment.id);
    setPaymentFromId(payment.from);
    setPaymentToId(payment.to);
    setPaymentAmount(String(payment.amount));
    setPaymentError("");
    setSettleModeOpen(true);
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
    fillPaymentDraftFromSuggestion();
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
    fillPaymentDraftFromSuggestion();
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
        <details className="manual-payment-details" open={Boolean(editingPaymentId)}>
          <summary>{editingPaymentId ? "Edit payment" : "Record a different payment"}</summary>
          <form className="manual-payment-form" onSubmit={saveManualPayment}>
            <div className="manual-payment-heading">
              <span>Use this when the paid amount differs from the next suggestion.</span>
            </div>
            {paymentError ? (
              <div className="form-error-summary payment-error" role="alert">
                <DecorativeIcon icon={AlertCircle} size={17} />
                <p>{paymentError}</p>
              </div>
            ) : null}
            <div className="payment-form-grid">
              <label className="field">
                <span>Paid by</span>
                <SelectShell wide>
                  <select value={paymentFromId} onChange={(event) => setPaymentFromId(event.target.value)}>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                  <DecorativeIcon icon={ChevronDown} size={15} />
                </SelectShell>
              </label>
              <label className="field">
                <span>Paid to</span>
                <SelectShell wide>
                  <select value={paymentToId} onChange={(event) => setPaymentToId(event.target.value)}>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                  <DecorativeIcon icon={ChevronDown} size={15} />
                </SelectShell>
              </label>
              <label className="field">
                <span>Amount ({snapshot.event.currency})</span>
                <input
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(event) => {
                    setPaymentAmount(event.target.value);
                    setPaymentError("");
                  }}
                />
              </label>
            </div>
            <div className="manual-payment-actions">
              {editingPaymentId ? (
                <ActionButton onClick={resetPaymentDraft}>
                  Cancel edit
                </ActionButton>
              ) : null}
              <ActionButton variant="primary" type="submit" disabled={participants.length < 2}>
                <DecorativeIcon icon={WalletCards} size={16} />
                {editingPaymentId ? "Update payment" : "Save payment"}
              </ActionButton>
            </div>
          </form>
        </details>
        {lastSettlement ? (
          <div className="settlement-ledger">
            <span>Last recorded</span>
            {lastSettlementFrom && lastSettlementTo ? (
              <strong>
                {lastSettlementFrom.name} paid {lastSettlementTo.name}{" "}
                {money(lastSettlement.amountMinor)}
              </strong>
            ) : null}
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

            <div className="participant-manager">
              <div className="participant-manager-copy">
                <span>People</span>
                <strong>
                  {participants.length} {participants.length === 1 ? "person" : "people"} in this event
                </strong>
              </div>
              <div className="participant-chip-list" aria-label="People in this event">
                {participants.map((participant) => (
                  <div className="participant-chip" key={participant.id}>
                    {editingParticipantId === participant.id ? (
                      <>
                        <Avatar participant={participant} small />
                        <input
                          value={participantEditName}
                          onChange={(event) => {
                            setParticipantEditName(event.target.value);
                            setParticipantEditError("");
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              saveParticipantEdit(event);
                            }
                          }}
                          aria-label={`Rename ${participant.name}`}
                        />
                        <button type="button" onClick={saveParticipantEdit}>
                          Save
                        </button>
                        <button type="button" onClick={cancelParticipantEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <Avatar participant={participant} small />
                        <span>{participant.name}</span>
                        <button type="button" onClick={() => startParticipantEdit(participant)}>
                          Rename
                        </button>
                        <button
                          className="danger-action"
                          type="button"
                          onClick={() => removeParticipant(participant)}
                          disabled={participants.length <= 1}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <FieldError className="participant-error" id="participant-edit-error">
                {participantEditError}
              </FieldError>
              <div className="participant-add-form">
                <label className="field">
                  <span>Add person</span>
                  <input
                    value={participantName}
                    onChange={(event) => {
                      setParticipantName(event.target.value);
                      setParticipantError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        saveParticipant(event);
                      }
                    }}
                    aria-invalid={Boolean(participantError)}
                    aria-describedby={participantError ? "participant-error" : undefined}
                  />
                </label>
                <ActionButton
                  className="participant-add-button"
                  variant="primary"
                  onClick={saveParticipant}
                  disabled={participantSubmitting}
                >
                  <DecorativeIcon icon={UserPlus} size={17} />
                  {participantSubmitting ? "Adding" : "Add person"}
                </ActionButton>
                <FieldError className="participant-error" id="participant-error">
                  {participantError}
                </FieldError>
              </div>
            </div>

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
              {eventRecordCount === 0 ? (
                <div className="empty-history">
                  <DecorativeIcon icon={ReceiptText} size={20} />
                  <div>
                    <strong>No expenses yet</strong>
                    <p>Save the first expense and it will appear here with any recorded payments.</p>
                  </div>
                </div>
              ) : null}
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
                      <div className="history-actions payment-actions">
                        <button type="button" onClick={() => editPayment(payment)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => undoSettlement(payment.id)}>
                          Undo payment
                        </button>
                      </div>
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
            <p className="history-count">
              {eventRecordCount === 0
                ? "History starts after the first saved expense."
                : `Showing all ${eventRecordCount} event records`}
            </p>
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
