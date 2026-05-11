import { EventEmitter } from "events";

// Global event emitter for real-time updates
const realtimeEmitter = new EventEmitter();
realtimeEmitter.setMaxListeners(Infinity);

export function getRealtimeEmitter() {
  return realtimeEmitter;
}

/**
 * Broadcast an event to all connected clients
 */
export function broadcastEvent(event: string, data: any) {
  realtimeEmitter.emit("update", {
    event,
    data,
    timestamp: new Date().toISOString(),
  });
}
