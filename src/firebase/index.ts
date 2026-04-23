'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore'

// Global instances for singleton behavior and setting enforcement
let firestoreInstance: Firestore | null = null;

// IMPORTANT: DO NOT MODIFY THIS FUNCTION STRUCTURE
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp: FirebaseApp;
    try {
      firebaseApp = initializeApp(firebaseConfig);
    } catch (e) {
      // Fallback for initialization errors
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  if (!firestoreInstance) {
    try {
      // CRITICAL: experimentalForceLongPolling is REQUIRED for stable connectivity in this environment.
      firestoreInstance = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
      });
    } catch (e) {
      // If already initialized, fallback to getFirestore
      firestoreInstance = getFirestore(firebaseApp);
    }
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestoreInstance
  };
}

/**
 * Helper for non-component code (like lib/youtube.ts) to get the Firestore instance
 * while ensuring CRITICAL long-polling settings are applied.
 */
export function getDb() {
  if (firestoreInstance) return firestoreInstance;
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  if (!firestoreInstance) {
    try {
      firestoreInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    } catch (e) {
      firestoreInstance = getFirestore(app);
    }
  }
  return firestoreInstance;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
