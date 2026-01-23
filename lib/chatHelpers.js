export const getMessageDelayMs = (text) => {
  const length = typeof text === 'string' ? text.trim().length : 0;
  if (!length) return 0;
  const baseMs = 250;
  const perCharMs = 16;
  const maxMs = 3000;
  const delay = baseMs + length * perCharMs;
  return Math.min(Math.max(delay, baseMs), maxMs);
};

export const scrollToBottom = (containerRef) => {
  if (containerRef?.current) {
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }
};

export const createMessageQueue = ({
  queueRef,
  isActiveRef,
  timerRef,
  onMessage,
  getDelayMs = getMessageDelayMs,
}) => {
  const flushQueue = () => {
    if (isActiveRef.current) return;
    isActiveRef.current = true;

    const processNext = () => {
      const queue = queueRef.current;
      const next = queue.shift();
      if (!next) {
        isActiveRef.current = false;
        timerRef.current = null;
        return;
      }
      onMessage(next.text, next.type, next.meta);
      if (queue.length === 0) {
        isActiveRef.current = false;
        timerRef.current = null;
        return;
      }
      const delay = getDelayMs(next.text);
      timerRef.current = setTimeout(processNext, delay);
    };

    processNext();
  };

  const enqueueReplyParts = (type, parts, meta = {}) => {
    if (!Array.isArray(parts) || parts.length === 0) return;
    const entries = parts
      .map((text, index) => ({
        type,
        text,
        meta: index === parts.length - 1 ? meta : {},
      }))
      .filter((entry) => entry.text);
    if (entries.length === 0) return;
    queueRef.current.push(...entries);
    flushQueue();
  };

  const enqueueMessage = (entry) => {
    if (!entry) return;
    queueRef.current.push(entry);
    flushQueue();
  };

  const clearMessageQueue = () => {
    queueRef.current = [];
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isActiveRef.current = false;
  };

  return { enqueueReplyParts, enqueueMessage, flushQueue, clearMessageQueue };
};
