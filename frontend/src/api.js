import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Extrait l'IP / hostname du bundler Expo (même réseau que le téléphone en Expo Go).
 */
function hostFromDevUri(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    if (raw.includes('://')) {
      const u = new URL(raw);
      const h = u.hostname;
      if (h === 'localhost' || h === '127.0.0.1') return null;
      return h;
    }
  } catch {
    /* ignore */
  }
  const host = raw.split(':')[0];
  if (host === 'localhost' || host === '127.0.0.1') return null;
  return host || null;
}

function resolveLanHostForDev() {
  const fromExpoConfig = hostFromDevUri(Constants.expoConfig?.hostUri);
  if (fromExpoConfig) return fromExpoConfig;
  const fromPlatform = hostFromDevUri(Constants.platform?.hostUri);
  if (fromPlatform) return fromPlatform;
  return null;
}

const lanHost = __DEV__ ? resolveLanHostForDev() : null;
const DEV_INFERRED_API = lanHost ? `http://${lanHost}:4000/api` : null;

const platformFallback = Platform.select({
  android: 'http://10.0.2.2:4000/api',
  ios: 'http://127.0.0.1:4000/api',
  default: 'http://127.0.0.1:4000/api',
});

/** Ordre : .env (Expo) → IP déduite du bundler (téléphone physique) → émulateur / simulateur */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  DEV_INFERRED_API ||
  platformFallback;

async function apiRequest(path, options = {}, token) {
  const controller = new AbortController();
  const timeoutMs = 12000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const message = data.message || `Erreur API (${response.status})`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Le serveur met trop de temps a repondre.');
    }

    if (error instanceof SyntaxError) {
      throw new Error('Reponse serveur invalide.');
    }

    const msg = error?.message || String(error);
    if (
      __DEV__ &&
      (msg === 'Network request failed' || msg.includes('Network request failed'))
    ) {
      throw new Error(
        `Connexion impossible au serveur (${API_BASE_URL}). ` +
          'Sur un vrai téléphone : le PC et le téléphone doivent être sur le même Wi‑Fi. ' +
          'Lancez le backend sur le port 4000. ' +
          'Si besoin, créez frontend/.env avec EXPO_PUBLIC_API_BASE_URL=http://VOTRE_IP_LAN:4000/api puis redémarrez Expo (npx expo start -c).`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { apiRequest };
