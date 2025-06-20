import defaultConfig from '../config.js';
import { isIndexedDBMode } from '../utils';

let configManager = null;

if (typeof window !== 'undefined') {
    try {
        configManager = require('./configManager').default;
    } catch (error) {
        console.warn('Config manager not available:', error);
    }
}

export function isDemoMode() {
    return typeof window !== 'undefined' && isIndexedDBMode();
}

export async function getConfig(useManager = false) {
    if (typeof window === 'undefined') {
        return defaultConfig;
    }
    if (isDemoMode()) {
        const storedConfig = localStorage.getItem('appConfig');
        if (storedConfig) {
            try {
                return JSON.parse(storedConfig);
            } catch (e) {
                console.warn('Failed to parse config from localStorage:', e);
            }
        }
        return defaultConfig;
    }
    if (!configManager || !useManager) {
        return defaultConfig;
    }
    try {
        return await configManager.getConfig();
    } catch (error) {
        console.warn('Failed to get config from manager, using default:', error);
        return defaultConfig;
    }
}

export function getConfigSync() {
    if (typeof window !== 'undefined' && isDemoMode()) {
        const storedConfig = localStorage.getItem('appConfig');
        if (storedConfig) {
            try {
                return JSON.parse(storedConfig);
            } catch (e) {
                console.warn('Failed to parse config from localStorage:', e);
            }
        }
    }
    return defaultConfig;
}

export function getConfigValue(key, defaultValue = null) {
    const config = getConfigSync();
    return config[key] ?? defaultValue;
}

export function isConfigManagerAvailable() {
    return typeof window !== 'undefined' && configManager !== null;
}

export function getLogoUrl(logoUrl) {
    if (!logoUrl) {
        return defaultConfig.logoUrl;
    }
    
    if (logoUrl.startsWith('http')) {
        return logoUrl;
    }
    
    if (logoUrl.startsWith('/')) {
        return logoUrl;
    }
    
    return defaultConfig.logoUrl;
}

export default defaultConfig; 