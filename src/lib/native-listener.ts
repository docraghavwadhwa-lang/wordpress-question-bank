export type NativeListener = { remove: () => void | Promise<void> };

/** Capacitor bridges may return a handle immediately or through a promise. */
export function removeNativeListener(listener: NativeListener | Promise<NativeListener> | undefined) {
  return Promise.resolve(listener).then(handle => handle?.remove()).catch(() => {});
}