import defaultConfig from '../config.json';

let configManager = null;

if (typeof window !== 'undefined') {
    try {
        configManager = require('./configManager').default;
    } catch (error) {
        console.warn('Config manager not available:', error);
    }
}

export async function getConfig(useManager = false) {
    if (typeof window === 'undefined' || !configManager || !useManager) {
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
    return defaultConfig;
}

export function getConfigValue(key, defaultValue = null) {
    return defaultConfig[key] ?? defaultValue;
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