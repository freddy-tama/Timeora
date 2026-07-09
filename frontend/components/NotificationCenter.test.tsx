import { render, screen } from "@testing-library/react";
import type { EventInput } from "@fullcalendar/core";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationCenter } from "./NotificationCenter";

const originalNotification = globalThis.Notification;
const originalWindow = globalThis.window;

function dueSoonEvent(): EventInput {
  const start = new Date();
  start.setMinutes(start.getMinutes() + 14);
  return {
    id: "event-1",
    title: "Product Sync",
    start,
    extendedProps: {
      participants: "team@example.com",
      reminder_minutes: 15,
    },
  };
}

describe("NotificationCenter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: originalNotification,
    });
    vi.restoreAllMocks();
  });

  it("shows an in-app reminder fallback when browser notifications are unavailable", async () => {
    render(<NotificationCenter events={[dueSoonEvent()]} />);

    expect(await screen.findByText("Product Sync")).toBeVisible();
    expect(screen.getByText(/Starts at/)).toBeVisible();
  });

  it("hydrates without mismatching the notification permission status", async () => {
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: undefined,
    });
    vi.stubGlobal("window", undefined);
    const html = renderToString(<NotificationCenter events={[]} />);
    vi.stubGlobal("window", originalWindow);
    const container = document.createElement("div");
    container.innerHTML = html;

    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { permission: "denied" },
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let root: ReturnType<typeof hydrateRoot> | undefined;

    await act(async () => {
      root = hydrateRoot(container, <NotificationCenter events={[]} />);
    });

    expect(
      consoleError.mock.calls.some((call) => String(call[0]).includes("Hydration failed")),
    ).toBe(false);

    await act(async () => {
      root?.unmount();
    });
  });
});
