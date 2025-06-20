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

export async function getConfig(useManager = false) {
    if (typeof window === 'undefined') {
        console.log('[getConfig] SSR: returning defaultConfig from config.js', defaultConfig);
        return defaultConfig;
    }
    if (isDemoMode()) {
        const storedConfig = localStorage.getItem('appConfig');
        if (storedConfig) {
            try {
                const parsed = JSON.parse(storedConfig);
                console.log('[getConfig] Demo mode: returning config from localStorage', parsed);
                return parsed;
            } catch (e) {
                console.warn('Failed to parse config from localStorage:', e);
            }
        }
        console.log('[getConfig] Demo mode: localStorage empty, returning defaultConfig from config.js', defaultConfig);
        return defaultConfig;
    }
    if (!configManager || !useManager) {
        console.log('[getConfig] Not demo mode: returning defaultConfig from config.js', defaultConfig);
        return defaultConfig;
    }
    try {
        const config = await configManager.getConfig();
        console.log('[getConfig] Not demo mode: returning config from configManager', config);
        return config;
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