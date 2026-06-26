const message = "Photon does not make app-level network requests during transfers.";

export function installNetworkGuards(): void {
  if (!import.meta.env.PROD || typeof window === "undefined") {
    return;
  }

  defineGlobal("fetch", () => Promise.reject(new Error(message)));
  defineGlobal(
    "XMLHttpRequest",
    class BlockedXMLHttpRequest {
      constructor() {
        throw new Error(message);
      }
    },
  );
  defineGlobal(
    "WebSocket",
    class BlockedWebSocket {
      constructor() {
        throw new Error(message);
      }
    },
  );
  defineGlobal(
    "EventSource",
    class BlockedEventSource {
      constructor() {
        throw new Error(message);
      }
    },
  );

  if ("sendBeacon" in navigator) {
    try {
      Object.defineProperty(navigator, "sendBeacon", {
        configurable: true,
        value: () => false
      });
    } catch {
      // Some browsers expose sendBeacon as non-configurable. The CSP still blocks connect-src.
    }
  }
}

function defineGlobal(name: string, value: unknown): void {
  try {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value
    });
  } catch {
    // CSP remains the final privacy guard if a browser refuses runtime patching.
  }
}
