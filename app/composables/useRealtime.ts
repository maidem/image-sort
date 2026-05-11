export interface RealtimeUpdate {
  event: string;
  data: any;
  timestamp: string;
}

export const useRealtime = () => {
  const listeners = new Map<string, Set<(data: any) => void>>();
  const isConnected = ref(false);
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const dispatchUpdate = (message: RealtimeUpdate) => {
    const eventListeners = listeners.get(message.event);
    if (!eventListeners?.size) {
      return;
    }

    for (const callback of eventListeners) {
      callback(message.data);
    }
  };

  const connect = () => {
    if (process.server || eventSource || listeners.size === 0) {
      return;
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    eventSource = new EventSource("/api/realtime");

    eventSource.onopen = () => {
      isConnected.value = true;
    };

    eventSource.onmessage = (incoming) => {
      try {
        const message = JSON.parse(incoming.data) as
          | RealtimeUpdate
          | { type: "ping" };
        if ("event" in message) {
          dispatchUpdate(message);
        }
      } catch {
        // Ignore malformed keepalive messages.
      }
    };

    eventSource.onerror = () => {
      isConnected.value = false;

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      if (!listeners.size || reconnectTimer) {
        return;
      }

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 1000);
    };
  };

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    isConnected.value = false;
  };

  /**
   * Subscribe to real-time updates for a specific event
   * @param event Event name (e.g., 'locations:updated', 'trainers:created')
   * @param callback Function to call when event is received
   * @returns Cleanup function to unsubscribe
   */
  const on = (event: string, callback: (data: any) => void) => {
    const eventListeners =
      listeners.get(event) ?? new Set<(data: any) => void>();
    eventListeners.add(callback);
    listeners.set(event, eventListeners);

    if (process.client) {
      connect();
    }

    return () => {
      const registeredListeners = listeners.get(event);
      if (!registeredListeners) {
        return;
      }

      registeredListeners.delete(callback);
      if (registeredListeners.size === 0) {
        listeners.delete(event);
      }

      if (listeners.size === 0) {
        disconnect();
      }
    };
  };

  onUnmounted(() => {
    listeners.clear();
    disconnect();
  });

  return {
    isConnected: readonly(isConnected),
    on,
    connect,
    disconnect,
  };
};
