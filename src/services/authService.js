// src/services/authService.js
// Firebase Authentication service handling Google and Email/Password sign‑in

import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

/**
 * Sign in using Google provider.
 * Returns the Firebase user credential.
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // The signed‑in user info.
    return result.user;
  } catch (error) {
    console.error('Google sign‑in error:', error);
    throw error;
  }
};

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 */
export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Email sign‑in error:', error);
    throw error;
  }
};

/**
 * Register a new user with email and password.
 */
export const registerWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

/**
 * Sign out the current user.
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign‑out error:', error);
    throw error;
  }
};
