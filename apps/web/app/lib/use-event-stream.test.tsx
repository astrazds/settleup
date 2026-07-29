import {
  act,
  renderHook,
} from "@testing-library/react";

import { useEventStream } from "./use-event-stream";

class FakeEventSource extends EventTarget {
  readonly close = vi.fn();

  connected(): void {
    this.dispatchEvent(new MessageEvent("connected", { data: "{}" }));
  }

  changed(version: number): void {
    this.dispatchEvent(
      new MessageEvent("changed", {
        data: JSON.stringify({ version }),
      }),
    );
  }

  malformedChange(): void {
    this.dispatchEvent(new MessageEvent("changed", { data: "not json" }));
  }

  disconnected(): void {
    this.dispatchEvent(new Event("error"));
  }
}

describe("useEventStream", () => {
  afterEach(() => {
    setOnline(true);
  });

  it("connects with an encoded token and revalidates on connected and newer changes", () => {
    const source = new FakeEventSource();
    const factory = vi.fn(() => source);
    const revalidate = vi.fn();
    const { result, rerender } = renderHook(
      ({ version }) =>
        useEventStream({
          eventSourceFactory: factory,
          revalidate,
          token: "private/token",
          version,
        }),
      { initialProps: { version: 3 } },
    );

    expect(factory).toHaveBeenCalledWith(
      "/api/events/private%2Ftoken/stream",
    );
    expect(result.current).toEqual({
      isOffline: false,
      status: "connecting",
    });

    act(() => source.connected());
    expect(result.current.status).toBe("connected");
    expect(revalidate).toHaveBeenCalledTimes(1);

    act(() => {
      source.changed(3);
      source.changed(2);
      source.malformedChange();
    });
    expect(revalidate).toHaveBeenCalledTimes(1);

    act(() => source.changed(4));
    expect(revalidate).toHaveBeenCalledTimes(2);

    rerender({ version: 4 });
    act(() => source.changed(4));
    expect(revalidate).toHaveBeenCalledTimes(2);
  });

  it("reports reconnecting and revalidates when the stream reconnects", () => {
    const source = new FakeEventSource();
    const factory = () => source;
    const revalidate = vi.fn();
    const { result } = renderHook(() =>
      useEventStream({
        eventSourceFactory: factory,
        revalidate,
        token: "token",
        version: 1,
      }),
    );

    act(() => source.connected());
    revalidate.mockClear();

    act(() => source.disconnected());
    expect(result.current.status).toBe("reconnecting");

    act(() => source.connected());
    expect(result.current.status).toBe("connected");
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it("revalidates on focus and on return online while exposing offline state", () => {
    const source = new FakeEventSource();
    const factory = () => source;
    const revalidate = vi.fn();
    const { result } = renderHook(() =>
      useEventStream({
        eventSourceFactory: factory,
        revalidate,
        token: "token",
        version: 1,
      }),
    );

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(revalidate).toHaveBeenCalledOnce();

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toEqual({
      isOffline: true,
      status: "offline",
    });

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(revalidate).toHaveBeenCalledOnce();

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toEqual({
      isOffline: false,
      status: "reconnecting",
    });
    expect(revalidate).toHaveBeenCalledTimes(2);
  });

  it("closes the stream when the event route unmounts", () => {
    const source = new FakeEventSource();
    const factory = () => source;
    const { unmount } = renderHook(() =>
      useEventStream({
        eventSourceFactory: factory,
        revalidate: vi.fn(),
        token: "token",
        version: 1,
      }),
    );

    unmount();

    expect(source.close).toHaveBeenCalledOnce();
  });

  it("resets version tracking when navigating to another event", () => {
    const sources: FakeEventSource[] = [];
    const factory = vi.fn(() => {
      const source = new FakeEventSource();
      sources.push(source);
      return source;
    });
    const revalidate = vi.fn();
    const { rerender } = renderHook(
      ({ token, version }) =>
        useEventStream({
          eventSourceFactory: factory,
          revalidate,
          token,
          version,
        }),
      {
        initialProps: {
          token: "first",
          version: 20,
        },
      },
    );

    rerender({ token: "second", version: 1 });
    revalidate.mockClear();

    act(() => sources[1]?.changed(2));
    expect(revalidate).toHaveBeenCalledOnce();
  });
});

function setOnline(value: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}
