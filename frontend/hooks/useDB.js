"use client";
import { useEffect, useState } from 'react';

export function useDB() {
    const [db, setDb] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const initializeDB = async () => {
            try {
                // Dynamically import DB modules only on client side
                const { initDatabase } = await import('@/db/DBsetup');
                const { DBService } = await import('@/db');
                
                await initDatabase();
                const dbService = new DBService();
                await dbService.init();
                
                if (mounted) {
                    setDb(dbService);
                    setIsInitialized(true);
                }
            } catch (err) {
                console.error('Failed to initialize database:', err);
                if (mounted) {
                    setError(err);
                }
            }
        };

        initializeDB();

        return () => {
            mounted = false;
        };
    }, []);

    return { db, isInitialized, error };
}