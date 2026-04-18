import { Platform } from 'react-native';

const platformBaseUrl = Platform.select({
  android: 'http://10.0.2.2:4000/api',
  default: 'http://127.0.0.1:4000/api',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || platformBaseUrl;

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

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { apiRequest };
