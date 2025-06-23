import defaultConfig from '../config.js';
import { isDemoMode } from '../utils';

class ConfigManager {
    constructor() {
        this.configKey = 'appConfig';
    }

    getConfig() {
        return this.getConfigFromLocalStorage();
    }

    getConfigFromLocalStorage() {
        if (typeof window !== 'undefined' && isDemoMode()) {
            const storedConfig = localStorage.getItem(this.configKey);
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

    getDefaultConfig() {
        return defaultConfig;
    }

    getLogoUrl(logoUrl) {
        if (!logoUrl) {
            return defaultConfig.logoUrl;
        }
        
        if (logoUrl.startsWith('/')) {
            return logoUrl;
        }
        
        return defaultConfig.logoUrl;
    }

    async saveConfig(config) {
        localStorage.setItem(this.configKey, JSON.stringify(config));
        return { success: true, source: 'localStorage' };
    }

    exportConfig(config = null) {
        const configToExport = config || this.getConfigFromLocalStorage() || this.getDefaultConfig();
        
        const jsContent = `export const config = {
  appTitle: "${configToExport.appTitle}",
  logoUrl: "${configToExport.logoUrl}",
  theme: "${configToExport.theme}"
};

export default config;`;
        
        const configBlob = new Blob([jsContent], {
            type: 'application/javascript'
        });
        
        const url = URL.createObjectURL(configBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    resetConfig() {
        localStorage.removeItem(this.configKey);
        return this.getDefaultConfig();
    }
}

const configManager = new ConfigManager();
export default configManager;