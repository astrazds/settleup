export interface EventChange {
  eventId: string;
  version: number;
}

export class ChangeBroker {
  private readonly subscribers = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();
  private readonly encoder = new TextEncoder();

  subscribe(eventId: string, signal: AbortSignal): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        const eventSubscribers = this.subscribers.get(eventId) ?? new Set();
        eventSubscribers.add(controller);
        this.subscribers.set(eventId, eventSubscribers);
        controller.enqueue(this.encoder.encode("event: connected\ndata: {}\n\n"));

        signal.addEventListener(
          "abort",
          () => {
            eventSubscribers.delete(controller);
            if (eventSubscribers.size === 0) {
              this.subscribers.delete(eventId);
            }
          },
          { once: true },
        );
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

    for (const controller of eventSubscribers) {
      try {
        controller.enqueue(payload);
      } catch {
        eventSubscribers.delete(controller);
      }
    }
  }
}
