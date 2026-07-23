// src/services/api.js
// Centralized Axios instance for communicating with the Flask backend.
// Includes Firebase ID token in Authorization header when available.

import axios from 'axios';
import { auth } from '../config/firebase';
import { getIdToken } from 'firebase/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Firebase Auth token if user is logged in.
api.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    try {
      const token = await getIdToken(auth.currentUser, true);
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.warn('Failed to get Firebase ID token:', err);
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor for global error handling.
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data || { message: 'An unexpected error occurred' });
  }
);

export default api;
