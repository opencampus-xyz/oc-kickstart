// Config Utilities - Works in both client and server contexts
import defaultConfig from '../config.json';

// Client-side config manager (only available in browser)
let configManager = null;

// Initialize config manager only in client context
if (typeof window !== 'undefined') {
    try {
        configManager = require('./configManager').default;
    } catch (error) {
        console.warn('Config manager not available:', error);
    }
}

/**
 * Get configuration - works in both client and server contexts
 * @param {boolean} useManager - Force use of config manager (client only)
 * @returns {Promise<Object>|Object} Configuration object
 */
export async function getConfig(useManager = false) {
    // If we're on the server or config manager is not available, use default config
    if (typeof window === 'undefined' || !configManager || !useManager) {
        return defaultConfig;
    }

    try {
        // Use config manager to get the most up-to-date config
        return await configManager.getConfig();
    } catch (error) {
        console.warn('Failed to get config from manager, using default:', error);
        return defaultConfig;
    }
}

/**
 * Get configuration synchronously - for server-side rendering
 * @returns {Object} Configuration object
 */
export function getConfigSync() {
    return defaultConfig;
}

/**
 * Get a specific config value
 * @param {string} key - Config key to retrieve
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Config value or default
 */
export function getConfigValue(key, defaultValue = null) {
    return defaultConfig[key] ?? defaultValue;
}

/**
 * Check if config manager is available
 * @returns {boolean} True if config manager is available
 */
export function isConfigManagerAvailable() {
    return typeof window !== 'undefined' && configManager !== null;
}

// Export default config for backward compatibility
export default defaultConfig; 