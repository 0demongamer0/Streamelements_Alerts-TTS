// Function to store configuration to IndexedDB
function storeConfigToDB(config, callback) {
  const dbName = "satDB";
  const dbRequest = indexedDB.open(dbName, 1);

  dbRequest.onupgradeneeded = function (event) {
    const db = event.target.result;

    if (!db.objectStoreNames.contains("configStore")) {
      db.createObjectStore("configStore", { keyPath: "id" });
    }
  };

  dbRequest.onsuccess = function (event) {
    const db = event.target.result;
    const saveTransaction = db.transaction(["configStore"], "readwrite");
    const configStore = saveTransaction.objectStore("configStore");
    const saveRequest = configStore.put({ id: 1, config });

    saveRequest.onsuccess = function () {
      console.log("Configuration saved to IndexedDB");
      if (callback) callback(null);
    };

    saveRequest.onerror = function (error) {
      console.error("Error saving configuration to IndexedDB:", error);
      if (callback) callback(error);
    };
  };

  dbRequest.onerror = function (error) {
    console.error("Error opening IndexedDB:", error);
    if (callback) callback(error);
  };
}

// Function to retrieve configuration from IndexedDB
function getConfigFromDB(callback) {
  const dbName = "satDB";
  const dbRequest = indexedDB.open(dbName, 1);

  dbRequest.onsuccess = function (event) {
    const db = event.target.result;
    const getTransaction = db.transaction(["configStore"], "readonly");
    const getConfigRequest = getTransaction.objectStore("configStore").get(1);

    getConfigRequest.onsuccess = function () {
      const retrievedConfig = getConfigRequest.result;

      if (retrievedConfig) {
        console.log("Configuration loaded from IndexedDB");
        if (callback) callback(null, retrievedConfig.config);
      } else {
        console.log("No configuration found in IndexedDB");
        if (callback) callback(null, null);
      }
    };

    getConfigRequest.onerror = function (error) {
      console.error("Error retrieving configuration from IndexedDB:", error);
      if (callback) callback(error);
    };
  };

  dbRequest.onerror = function (error) {
    console.error("Error opening IndexedDB:", error);
    if (callback) callback(error);
  };
}