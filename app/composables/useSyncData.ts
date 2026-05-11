/**
 * Use this composable to automatically sync data with server updates via SSE.
 * Falls the live connection is temporarily unavailable, it can also refresh data periodically.
 * @param dataRef - Ref to the data array to keep in sync
 * @param eventName - Base event name (e.g. 'locations' for 'locations:created', 'locations:updated', 'locations:deleted')
 * @param idField - Name of the ID field (default: 'id')
 */
export const useSyncData = (
  dataRef: Ref<any[]>,
  eventName: string,
  idField = "id",
  refreshData?: () => Promise<unknown>,
  pollIntervalMs = 2000,
) => {
  const { on } = useRealtime();
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const handlers = {
    created: (item: any) => {
      if (!dataRef.value.find((d) => d[idField] === item[idField])) {
        dataRef.value.push(item);
      }
    },
    updated: (item: any) => {
      const index = dataRef.value.findIndex(
        (d) => d[idField] === item[idField],
      );
      if (index >= 0) {
        dataRef.value[index] = item;
      }
    },
    deleted: ({ id }: any) => {
      const index = dataRef.value.findIndex((d) => d[idField] === id);
      if (index >= 0) {
        dataRef.value.splice(index, 1);
      }
    },
  };

  // Subscribe to all three event types
  const unsubscribers = [
    on(`${eventName}:created`, handlers.created),
    on(`${eventName}:updated`, handlers.updated),
    on(`${eventName}:deleted`, handlers.deleted),
  ];

  // Cleanup function
  const cleanup = () => {
    unsubscribers.forEach((fn) => fn());
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  if (import.meta.client && refreshData) {
    onMounted(() => {
      pollTimer = setInterval(() => {
        void refreshData();
      }, pollIntervalMs);
    });
  }

  onUnmounted(cleanup);

  return { cleanup };
};
