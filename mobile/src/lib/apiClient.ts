import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { supabase } from '../config/supabase';
import { isOnline } from './network';

/**
 * Pre-configured Axios instance for talking to the SAPIO backend.
 *
 * Why: Centralizing the base URL and default headers avoids repeating config in
 * every API call. A request interceptor attaches the current Supabase session
 * JWT as a Bearer token so the backend can authenticate the caller via its
 * `authenticate` middleware. A response interceptor normalizes errors.
 *
 * Production hardening: a request interceptor short-circuits when the device is
 * offline (fails fast with a clear message instead of a long timeout), and the
 * response interceptor normalizes backend errors into a thrown `Error`.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the Supabase session JWT to every outgoing request.
apiClient.interceptors.request.use(async (config) => {
  // Fail fast when offline so the UI can react immediately.
  const online = await isOnline();
  if (!online) {
    return Promise.reject(new Error('You appear to be offline.'));
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Normalize backend error responses into a thrown Error with a message.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ??
      error?.message ??
      'Something went wrong';
    return Promise.reject(new Error(message));
  },
);
