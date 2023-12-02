// Function to save configuration to localStorage
function saveConfigToLocalStorage(config) {
    try {
      const serializedConfig = JSON.stringify(config);
      localStorage.setItem('sat_config', serializedConfig);
      console.log('Configuration saved to localStorage');
    } catch (error) {
      console.error('Error saving configuration to localStorage:', error);
    }
  }

// Function to retrieve configuration from localStorage
function getConfigFromLocalStorage() {
try {
    const serializedConfig = localStorage.getItem('sat_config');
    if (serializedConfig === null) {
    console.log('No configuration found in localStorage');
    return null;
    }

    const config = JSON.parse(serializedConfig);
    console.log('Configuration loaded from localStorage');
    return config;
} catch (error) {
    console.error('Error retrieving configuration from localStorage:', error);
    return null;
}
}