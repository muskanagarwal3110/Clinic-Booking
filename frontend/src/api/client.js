import axios from 'axios';

export const TOKEN_KEY = 'clinic.token';
export const USER_KEY = 'clinic.user';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Every failure becomes { status, code, message, details } so the UI never inspects axios internals.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const body = err.response?.data?.error;
    const apiError = {
      status: err.response?.status ?? 0,
      code: body?.code ?? (err.response ? 'UNKNOWN' : 'NETWORK'),
      message:
        body?.message ??
        (err.response ? 'Something went wrong.' : 'Cannot reach the server. Check your connection.'),
      details: body?.details ?? [],
    };
    if (apiError.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event('auth:expired')); // token expired -> sign out
    }
    return Promise.reject(apiError);
  },
);

export const endpoints = {
  clinics: () => api.get('/auth/clinics').then((r) => r.data),
  slots: (params) => api.get('/slots', { params }).then((r) => r.data),
  mySlots: (params) => api.get('/slots/mine', { params }).then((r) => r.data),
  createSlot: (body) => api.post('/slots', body).then((r) => r.data),
  cancelSlot: (id) => api.delete(`/slots/${id}`),
  book: (slotId) => api.post('/bookings', { slotId }).then((r) => r.data),
  myBookings: () => api.get('/bookings/me').then((r) => r.data),
  cancelBooking: (id) => api.delete(`/bookings/${id}`).then((r) => r.data),
};
