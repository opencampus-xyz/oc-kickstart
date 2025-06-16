"use client";
import { useEffect, useState } from 'react';
import { initDatabase } from '../db/indexeddb/DBsetup';
import dbService from '../db/indexeddb/dbService';

export const useDB = () => {
    const [db, setDB] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initializeDB = async () => {
            if (process.env.NEXT_PUBLIC_DB_MODE !== 'indexeddb') {
                setIsInitialized(true);
                return;
            }

            try {
                await Promise.all([
                    initDatabase(),
                    dbService.initPromise
                ]);
                
                setDB(dbService);
                setIsInitialized(true);
            } catch (err) {
                console.error('Failed to initialize IndexedDB:', err);
                setError(err);
                setIsInitialized(true);
            }
        };

        initializeDB();
    }, []);

    return {
        db,
        isInitialized,
        error
    };
};