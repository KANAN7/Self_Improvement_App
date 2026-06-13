import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the dev backend URL.
 *
 * - Web: localhost works because the browser and the backend share the host.
 * - Android (Expo Go on a real device): localhost is the *phone's* loopback,
 *   not the PC. We use the LAN IP we can pull out of Expo's manifest
 *   (the same IP shown next to the QR code).
 * - iOS simulator (when we ever support it): localhost works.
 *
 * Override at runtime by setting EXPO_PUBLIC_BACKEND_URL in the env that
 * Expo picks up at start time, or via `extra.backendUrl` in app.json.
 */
export function getBackendUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromExtra = (Constants.expoConfig?.extra as { backendUrl?: string } | undefined)
    ?.backendUrl;
  if (fromExtra) return fromExtra.replace(/\/$/, '');

  const port = 3000;

  if (Platform.OS === 'web') {
    return `http://localhost:${port}`;
  }

  // Pull the dev server's LAN host out of Expo's manifest. Works for Expo Go
  // on a real device because Expo set hostUri = "192.168.x.x:8081".
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoConfig as unknown as { developer?: { tool?: string } })?.developer?.tool;
  const lanHost = hostUri?.split(':')[0];
  if (lanHost) return `http://${lanHost}:${port}`;

  return null;
}
