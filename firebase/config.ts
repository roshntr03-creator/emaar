import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import type { FirebaseConfig } from '../types';
import { db } from '../database';

// Re-typing for compat layer
type FirebaseApp = firebase.app.App;
type Auth = firebase.auth.Auth;
type Firestore = firebase.firestore.Firestore;
type FirebaseStorage = firebase.storage.Storage;

const FIREBASE_CONFIG_KEY = 'firebase_config';

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export const saveFirebaseConfig = (config: FirebaseConfig) => {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
};

export const getFirebaseConfig = (): FirebaseConfig | null => {
    const configStr = localStorage.getItem(FIREBASE_CONFIG_KEY);
    return configStr ? JSON.parse(configStr) : null;
};

export const clearFirebaseConfig = () => {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
    // Potentially disconnect or re-initialize services if needed
    firebaseApp = null;
    auth = null;
    firestore = null;
    storage = null;
};

export const isFirebaseConfigured = (): boolean => {
    return !!getFirebaseConfig();
};


export const initializeFirebase = (): { app: FirebaseApp, auth: Auth, db: Firestore, storage: FirebaseStorage } | null => {
    if (firebaseApp && auth && firestore && storage) {
        return { app: firebaseApp, auth, db: firestore, storage: storage };
    }

    const config = getFirebaseConfig();
    if (config) {
        try {
            if (!firebase.apps.length) {
                firebaseApp = firebase.initializeApp(config);
            } else {
                firebaseApp = firebase.app();
            }
            auth = firebase.auth();
            firestore = firebase.firestore();
            storage = firebase.storage();
            return { app: firebaseApp, auth, db: firestore, storage: storage };
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            clearFirebaseConfig(); // Clear bad config
            return null;
        }
    }
    return null;
};

// --- Data Migration ---

export const uploadLocalDataToFirestore = async (
    progressCallback: (message: string) => void
): Promise<{ success: boolean; message?: string }> => {
    const firebaseServices = initializeFirebase();
    if (!firebaseServices) {
        return { success: false, message: 'Firebase not configured.' };
    }
    const firestoreDb = firebaseServices.db;

    try {
        const batch = firestoreDb.batch();
        const localData = JSON.parse(db.exportAllData());
        
        for (const collectionName in localData) {
            // Skip attachments, as they need to be physically uploaded, not just metadata copied.
            if (collectionName === 'attachments') continue;

            if (Array.isArray(localData[collectionName])) {
                progressCallback(`Uploading ${collectionName}...`);
                
                const items = localData[collectionName] as any[];
                
                if (items.length > 0) {
                    items.forEach(item => {
                        const docId = item.id || item.code; // Use 'id' or 'code' for accounts
                        if(docId) {
                           const docRef = firestoreDb.collection(collectionName).doc(String(docId));
                           batch.set(docRef, item);
                        }
                    });
                } else {
                    // Add a placeholder document to ensure the collection is created and visible in the Firebase UI
                    const placeholderRef = firestoreDb.collection(collectionName).doc('_placeholder_');
                    batch.set(placeholderRef, { initializedAt: new Date().toISOString(), description: "This document ensures the collection is visible." });
                }

            } else if (typeof localData[collectionName] === 'object' && localData[collectionName] !== null) {
                 progressCallback(`Uploading ${collectionName}...`);
                 const docRef = firestoreDb.collection('app_settings').doc(collectionName);
                 batch.set(docRef, localData[collectionName]);
            }
        }
        
        progressCallback('Committing changes to the cloud...');
        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error("Firestore upload failed:", error);
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
};
