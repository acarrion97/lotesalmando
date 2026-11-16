/** Reuses an active request for the same key and removes it after settlement. */
export function withInFlight<T>(
  requests: Map<string | number, Promise<T>>,
  key: string | number,
  load: () => Promise<T>,
): Promise<T> {
  const active = requests.get(key);
  if (active) return active;

  const request = Promise.resolve()
    .then(load)
    .finally(() => requests.delete(key));
  requests.set(key, request);
  return request;
}
