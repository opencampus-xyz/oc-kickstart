import { fetchWithAuthToken as indexedFetchWithAuthToken, publicFetch as indexedPublicFetch } from './indexedUtils';
import { fetchWithAuthToken as sqlFetchWithAuthToken, publicFetch as sqlPublicFetch } from './sqlUtils';

export const getDBMode = () => {
    return process.env.NEXT_PUBLIC_DB_MODE || 'backend';
};

export const fetchWithAuthToken = async (url, options = {}, authToken) => {
    const mode = getDBMode();
    
    if (mode === 'indexeddb') {
        return indexedFetchWithAuthToken(url, options, authToken);
    } else {
        return sqlFetchWithAuthToken(url, options, authToken);
    }
};

export const publicFetch = async (url, options = {}) => {
    const mode = getDBMode();
    
    if (mode === 'indexeddb') {
        return indexedPublicFetch(url, options);
    } else {
        return sqlPublicFetch(url, options);
    }
}; 