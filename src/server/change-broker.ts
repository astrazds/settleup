export interface EventChange {
  eventId: string;
  version: number;
}

export class ChangeBroker {
  private readonly subscribers = new Map<string, Set<(payload: Uint8Array) => void>>();
  private readonly encoder = new TextEncoder();

  subscribe(eventId: string, signal: AbortSignal): ReadableStream<Uint8Array> {
    let unsubscribe: (() => boolean) | undefined;

    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        if (signal.aborted) {
          controller.close();
          return;
        }

        const eventSubscribers = this.subscribers.get(eventId) ?? new Set();
        const send = (payload: Uint8Array) => controller.enqueue(payload);
        const detach = () => {
          const removed = eventSubscribers.delete(send);
          if (removed && eventSubscribers.size === 0) {
            this.subscribers.delete(eventId);
          }
          signal.removeEventListener("abort", abort);
          return removed;
        };
        const abort = () => {
          if (detach()) {
            controller.close();
          }
        };

        unsubscribe = detach;
        eventSubscribers.add(send);
        this.subscribers.set(eventId, eventSubscribers);
        signal.addEventListener("abort", abort, { once: true });
        send(this.encoder.encode("event: connected\ndata: {}\n\n"));
      },
      cancel: () => {
        unsubscribe?.();
      },
    });
  }

  publish(change: EventChange): void {
    const eventSubscribers = this.subscribers.get(change.eventId);

    if (!eventSubscribers) {
      return;
    }

    const payload = this.encoder.encode(
      `event: changed\ndata: ${JSON.stringify({ version: change.version })}\n\n`,
    );

    for (const send of eventSubscribers) {
      send(payload);
    }
  }
}
