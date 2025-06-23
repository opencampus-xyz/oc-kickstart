import defaultConfig from '../config.js';
import { isDemoMode } from '../utils';

let configManager = null;

if (typeof window !== 'undefined') {
    try {
        configManager = require('./configManager').default;
    } catch (error) {
        console.warn('Config manager not available:', error);
    }
}

export function getConfigSync() {
    if (typeof window !== 'undefined' && isDemoMode()) {
        const storedConfig = localStorage.getItem('appConfig');
        if (storedConfig) {
            try {
                const parsed = JSON.parse(storedConfig);
                console.log('[getConfigSync] Demo mode: returning config from localStorage', parsed);
                return parsed;
            } catch (e) {
                console.warn('Failed to parse config from localStorage:', e);
            }
        }
        console.log('[getConfigSync] Demo mode: localStorage empty, returning defaultConfig from config.js', defaultConfig);
    }
    return defaultConfig;
}

export function getLogoUrl(logoUrl) {
    if (!logoUrl) {
        return defaultConfig.logoUrl;
    }
    
    if (logoUrl.startsWith('/')) {
        return logoUrl;
    }
    
    return defaultConfig.logoUrl;
}

export default defaultConfig; 