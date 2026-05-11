import { createEventStream } from "h3";
import { getRealtimeEmitter } from "../utils/socket";

interface RealtimeUpdate {
  event: string;
  data: unknown;
  timestamp: string;
}

export default defineEventHandler(async (event) => {
  const eventStream = createEventStream(event);
  const emitter = getRealtimeEmitter();

  const sendUpdate = (message: RealtimeUpdate) => {
    void eventStream.push({ data: JSON.stringify(message) }).catch(() => {});
  };

  const keepAlive = setInterval(() => {
    void eventStream
      .push({ data: JSON.stringify({ type: "ping" }) })
      .catch(() => {});
  }, 25000);

  emitter.on("update", sendUpdate);

  eventStream.onClosed(async () => {
    clearInterval(keepAlive);
    emitter.off("update", sendUpdate);
    await eventStream.close();
  });

  sendUpdate({
    event: "system:connected",
    data: null,
    timestamp: new Date().toISOString(),
  });

  return eventStream.send();
});
