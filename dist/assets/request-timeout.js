export function abortReason(signal) {
  return signal?.reason ?? new DOMException("The operation was aborted", "AbortError");
}

export function checkAbort(signal) {
  if (signal?.aborted) throw abortReason(signal);
}

export function requestTimeout(milliseconds = 25_000, parent) {
  const controller = new AbortController();
  let expired = false;
  let timer;
  function clear() {
    clearTimeout(timer);
    parent?.removeEventListener("abort", cancel);
  }
  function cancel() {
    controller.abort(abortReason(parent));
    clear();
  }
  if (parent?.aborted) {
    cancel();
  } else {
    parent?.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => {
      expired = true;
      controller.abort(new DOMException("The operation timed out", "TimeoutError"));
      clear();
    }, milliseconds);
  }
  return { signal: controller.signal, clear, get expired() { return expired; } };
}
