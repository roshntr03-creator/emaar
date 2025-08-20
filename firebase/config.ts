import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import type { FirebaseConfig } from '../types';
import { db } from '../database';

const FIREBASE_CONFIG_KEY = 'firebase_config';

let firebaseApp: FirebaseApp | null = null;
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
    firestore = null;
    storage = null;
};

export const isFirebaseConfigured = (): boolean => {
    return !!getFirebaseConfig();
};


export const initializeFirebase = (): { app: FirebaseApp, db: Firestore, storage: FirebaseStorage } | null => {
    if (firebaseApp && firestore && storage) {
        return { app: firebaseApp, db: firestore, storage: storage };
    }

    const config = getFirebaseConfig();
    if (config) {
        try {
            if (!getApps().length) {
                firebaseApp = initializeApp(config);
            } else {
                firebaseApp = getApp();
            }
            firestore = getFirestore(firebaseApp);
            storage = getStorage(firebaseApp);
            return { app: firebaseApp, db: firestore, storage: storage };
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            clearFirebaseConfig(); // Clear bad config
            return null;
        }
    }
    return null;
};

// --- Data Migration ---
import { collection, writeBatch, doc } from 'firebase/firestore';

export const uploadLocalDataToFirestore = async (
    progressCallback: (message: string) => void
): Promise<{ success: boolean; message?: string }> => {
    const firebase = initializeFirebase();
    if (!firebase) {
        return { success: false, message: 'Firebase not configured.' };
    }

    try {
        const batch = writeBatch(firebase.db);
        const localData = JSON.parse(db.exportAllData());
        
        for (const collectionName in localData) {
            // Skip attachments, as they need to be physically uploaded, not just metadata copied.
            if (collectionName === 'attachments') continue;

            if (Array.isArray(localData[collectionName])) {
                progressCallback(`Uploading ${collectionName}...`);
                
                const items = localData[collectionName] as any[];
                const collectionRef = collection(firebase.db, collectionName);

                if (items.length > 0) {
                    items.forEach(item => {
                        const docId = item.id || item.code; // Use 'id' or 'code' for accounts
                        if(docId) {
                           const docRef = doc(collectionRef, String(docId));
                           batch.set(docRef, item);
                        }
                    });
                } else {
                    // Add a placeholder document to ensure the collection is created and visible in the Firebase UI
                    const placeholderRef = doc(collectionRef, '_placeholder_');
                    batch.set(placeholderRef, { initializedAt: new Date().toISOString(), description: "This document ensures the collection is visible." });
                }

            } else if (typeof localData[collectionName] === 'object' && localData[collectionName] !== null) {
                 progressCallback(`Uploading ${collectionName}...`);
                 const docRef = doc(firebase.db, 'app_settings', collectionName);
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
