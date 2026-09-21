import axios from 'axios';

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Normalises every failure into a single readable message + field errors.
export const toApiError = (error) => {
  const res = error?.response?.data;
  return {
    message: res?.message || error?.message || 'Unable to reach the server',
    errors: res?.errors || {},
  };
};
