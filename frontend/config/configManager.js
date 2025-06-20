import defaultConfig from '../config.js';

class ConfigManager {
    constructor() {
        this.configKey = 'appConfig';
    }

    async getConfig() {
        return this.getConfigFromLocalStorage();
    }

    getConfigFromLocalStorage() {
        const storedConfig = localStorage.getItem(this.configKey);
        if (storedConfig) {
            return JSON.parse(storedConfig);
        }
        
        return this.getDefaultConfig();
    }

    getDefaultConfig() {
        return defaultConfig;
    }

    async saveConfig(config) {
        localStorage.setItem(this.configKey, JSON.stringify(config));
        return { success: true, source: 'localStorage' };
    }

    exportConfig(config = null) {
        const configToExport = config || this.getConfigFromLocalStorage() || this.getDefaultConfig();
        
        // Generate JavaScript code instead of JSON
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