import { Platform } from 'react-native';

const platformBaseUrl = Platform.select({
  android: 'http://10.0.2.2:4000/api',
  default: 'http://127.0.0.1:4000/api',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || platformBaseUrl;

async function apiRequest(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || 'Erreur API';
    throw new Error(message);
  }

  return data;
}

export { apiRequest };
