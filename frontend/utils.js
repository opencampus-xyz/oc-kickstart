import { fetchWithAuthToken as indexedFetchWithAuthToken, publicFetch as indexedPublicFetch } from './indexedUtils';
import { fetchWithAuthToken as sqlFetchWithAuthToken, publicFetch as sqlPublicFetch } from './sqlUtils';
import { initDatabase } from './db/indexeddb/DBsetup';
import dbService from './db/indexeddb/dbService';

class FetchStrategy {
    async fetchWithAuthToken(url, options, authToken) {
        throw new Error('fetchWithAuthToken must be implemented');
    }
    
    async publicFetch(url, options) {
        throw new Error('publicFetch must be implemented');
    }
}

class IndexedDBStrategy extends FetchStrategy {
    constructor() {
        super();
        this._initPromise = this._initializeDB();
    }
    
    async _initializeDB() {
        try {
            await Promise.all([
                initDatabase(),
                dbService.initPromise
            ]);
            console.log('IndexedDB initialized successfully');
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
            throw error;
        }
    }
    
    async fetchWithAuthToken(url, options, authToken) {
        await this._initPromise;
        return indexedFetchWithAuthToken(url, options, authToken);
    }
    
    async publicFetch(url, options) {
        await this._initPromise;
        return indexedPublicFetch(url, options);
    }
}

class SQLStrategy extends FetchStrategy {
    async fetchWithAuthToken(url, options, authToken) {
        return sqlFetchWithAuthToken(url, options, authToken);
    }
    
    async publicFetch(url, options) {
        return sqlPublicFetch(url, options);
    }
}

class FetchStrategyFactory {
    static _instance = null;
    static _strategy = null;
    
    static getInstance() {
        if (!this._instance) {
            this._instance = new FetchStrategyFactory();
        }
        return this._instance;
    }
    
    getStrategy() {
        if (!this._strategy) {
            const mode = process.env.NEXT_PUBLIC_DB_MODE || 'backend';
            
            if (typeof window === 'undefined') {
                this._strategy = new SQLStrategy();
                return this._strategy;
            }
            
            try {
                switch (mode) {
                    case 'indexeddb':
                        this._strategy = new IndexedDBStrategy();
                        break;
                    case 'backend':
                    default:
                        if (mode !== 'backend') {
                            console.warn(`Unknown DB_MODE: "${mode}". Using 'backend' as default.`);
                        }
                        this._strategy = new SQLStrategy();
                        break;
                }
            } catch (error) {
                console.error(`Failed to create strategy for mode ${mode}:`, error);
                if (mode === 'indexeddb') {
                    console.warn('Falling back to backend strategy due to IndexedDB initialization failure');
                    this._strategy = new SQLStrategy();
                } else {
                    throw error;
                }
            }
        }
        return this._strategy;
    }
    
    static isIndexedDBMode() {
        return (process.env.NEXT_PUBLIC_DB_MODE || 'backend') === 'indexeddb';
    }
}

// Only create factory and strategy on the client
let factory = null;
let strategy = null;

if (typeof window !== 'undefined') {
    factory = FetchStrategyFactory.getInstance();
    strategy = factory.getStrategy();
}

export const fetchWithAuthToken = async (url, options = {}, authToken) => {
    if (typeof window === 'undefined') {
        // On server, use SQL strategy directly
        return sqlFetchWithAuthToken(url, options, authToken);
    }
    return strategy.fetchWithAuthToken(url, options, authToken);
};

export const publicFetch = async (url, options = {}) => {
    if (typeof window === 'undefined') {
        // On server, use SQL strategy directly
        return sqlPublicFetch(url, options);
    }
    return strategy.publicFetch(url, options);
};

export const isIndexedDBMode = () => {
    return FetchStrategyFactory.isIndexedDBMode();
};

export const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
