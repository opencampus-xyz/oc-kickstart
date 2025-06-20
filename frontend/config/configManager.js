import { isIndexedDBMode } from '../utils';

class ConfigManager {
    constructor() {
        this.configKey = 'appConfig';
        this.backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    }

    async getConfig() {
        try {
            if (isIndexedDBMode()) {
                return await this.getConfigFromIndexedDB();
            } else {
                return await this.getConfigFromBackend();
            }
        } catch (error) {
            return this.getConfigFromLocalStorage();
        }
    }

    async getConfigFromIndexedDB() {
        try {
            const storedConfig = localStorage.getItem(this.configKey);
            if (storedConfig) {
                return JSON.parse(storedConfig);
            }
            
            return this.getDefaultConfig();
        } catch (error) {
            return this.getConfigFromLocalStorage();
        }
    }

    async getConfigFromBackend() {
        if (!this.backendUrl) {
            throw new Error('Backend URL not configured');
        }
        // some unmade backend endpoint
        const response = await fetch();
        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }

        const config = await response.json();
        
        localStorage.setItem(this.configKey, JSON.stringify(config));
        return config;
    }

    getConfigFromLocalStorage() {
        const storedConfig = localStorage.getItem(this.configKey);
        if (storedConfig) {
            return JSON.parse(storedConfig);
        }
        
        return this.getDefaultConfig();
    }

    getDefaultConfig() {
        try {
            const defaultConfig = require('../config.json');
            return defaultConfig;
        } catch (error) {
            return {
                appTitle: "OC Kickstart",
                logoUrl: "/assets/logo.svg",
                theme: "light"
            };
        }
    }

    async saveConfig(config) {
        try {
            if (isIndexedDBMode()) {
                localStorage.setItem(this.configKey, JSON.stringify(config));
                return { success: true, source: 'localStorage' };
            } else {
                return await this.saveConfigToBackend(config);
            }
        } catch (error) {
            localStorage.setItem(this.configKey, JSON.stringify(config));
            return { success: true, source: 'localStorage', fallback: true };
        }
    }

    async saveConfigToBackend(config) {
        if (!this.backendUrl) {
            throw new Error('Backend URL not configured');
        }
        // some unmade backend endpoint
        const response = await fetch();

        if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}`);
        }

        localStorage.setItem(this.configKey, JSON.stringify(config));
        return { success: true, source: 'backend' };
    }

    exportConfig(config = null) {
        const configToExport = config || this.getConfigFromLocalStorage() || this.getDefaultConfig();
        
        const configBlob = new Blob([JSON.stringify(configToExport, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(configBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async getConfigSource() {
        try {
            if (isIndexedDBMode()) {
                return 'indexeddb';
            } else if (this.backendUrl) {
                // some unmade backend endpoint
                const response = await fetch();
                return response.ok ? 'backend' : 'localStorage';
            } else {
                return 'localStorage';
            }
        } catch (error) {
            return 'localStorage';
        }
    }

    resetConfig() {
        localStorage.removeItem(this.configKey);
        return this.getDefaultConfig();
    }
}

const configManager = new ConfigManager();
export default configManager;