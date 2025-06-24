import defaultConfig from '../config.js';


const isClient = typeof window !== 'undefined';

const isDemoMode = () => {
    if (!isClient) {
        return false;
    }
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
};

class ConfigManager {
    constructor() {
        this.configKey = 'appConfig';
    }

    getConfig() {
        if (isDemoMode()) {
            const config = this.getConfigFromLocalStorage();
            if (config) {
                return config;
            }
        }
        return defaultConfig;
    }

    getConfigFromLocalStorage() {
        if (!isClient) {
            return null; // localStorage not available on server
        }
        
        try {
            const storedConfig = localStorage.getItem(this.configKey);
            if (storedConfig) {
                return JSON.parse(storedConfig);
            }
        } catch (e) {
            console.warn('Failed to get config from localStorage:', e);
        }
        return null;
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
        if (!isClient) {
            throw new Error('Cannot save config on server side');
        }
        localStorage.setItem(this.configKey, JSON.stringify(config));
        return { success: true, source: 'localStorage' };
    }

    exportConfig(config = null) {
        if (!isClient) {
            throw new Error('Cannot export config on server side');
        }
        
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
        if (!isClient) {
            return this.getDefaultConfig();
        }
        localStorage.removeItem(this.configKey);
        return this.getDefaultConfig();
    }
}

const configManager = new ConfigManager();
export default configManager;