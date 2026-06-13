/**
 * Web stub for the SQLite client.
 *
 * `expo-sqlite` ships a wasm-backed web build, but bundling the .wasm asset
 * with Metro on Windows is currently broken. We don't need a real DB on web
 * for development (Phase 1 just needs the app to render); native (iOS/Android
 * via Expo Go) is the actual target.
 *
 * Calling `db` or any Drizzle query on web throws — gate web access if/when
 * we add web-specific features later.
 */
const message =
  'SQLite is not available on web in this build. Use Expo Go on Android/iOS.';

function makeProxy<T extends object>(): T {
  return new Proxy({} as T, {
    get() {
      throw new Error(message);
    },
  });
}

export const db = makeProxy<Record<string, unknown>>() as never;

export function initializeDatabase(): void {
  // no-op on web
}
