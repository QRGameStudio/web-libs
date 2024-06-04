/**
 * Operator with the storage
 * @param context {string} in which context to operate - should be unique for every app
 * @param temporary {boolean} if set to true, then the values are valid only for current session
 * @constructor
 */
function GStorage(context, temporary = false) {
    const dbName = (temporary ? 'sessionStorage' : 'localStorage') + "/" + context;
    let db;

    const dbPromise = new Promise((resolve, reject) => {
        const openRequest = indexedDB.open(dbName);
        openRequest.onupgradeneeded = () => {
            db = openRequest.result;
            if (!db.objectStoreNames.contains(context)) {
                db.createObjectStore(context);
            }
        };
        openRequest.onsuccess = () => {
            db = openRequest.result;
            resolve(db);
        };
        openRequest.onerror = () => {
            console.error("Error", openRequest.error);
            reject(openRequest.error);
        };
    });

    /**
     * Gets a value from storage
     * @param {string} key key to get from storage
     * @param {any|null} def what to return if the key does not exist, defaults to null
     * @return {Promise<any|null>}
     */
    this.get = async (key, def = null) => {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(context, "readonly");
                const store = transaction.objectStore(context);
                const getRequest = store.get(key);

                getRequest.onsuccess = () => {
                    resolve(getRequest.result !== undefined ? getRequest.result : def);
                };
                getRequest.onerror = () => {
                    reject(getRequest.error);
                };
            } catch (e) {
                if (e.message.includes('not a known object store name')) {
                    resolve(null);
                } else {
                    reject(e);
                }
            }

        });
    };

    /**
     * Sets the new value for the key and saves to the storage
     * @param {string} key key to set value for
     * @param {any} value value to set
     * @return {Promise<boolean>} true on success
     */
    this.set = async (key, value) => {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(context, "readwrite");
            const store = transaction.objectStore(context);
            const putRequest = store.put(value, key);

            putRequest.onsuccess = () => {
                resolve(true);
            };
            putRequest.onerror = () => {
                reject(putRequest.error);
            };
        });
    };

    /**
     * Deletes key from storage
     * @param {string} key key to delete
     * @return {Promise<boolean>} true on success
     */
    this.del = async (key) => {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(context, "readwrite");
            const store = transaction.objectStore(context);
            const deleteRequest = store.delete(key);

            deleteRequest.onsuccess = () => {
                resolve(true);
            };
            deleteRequest.onerror = () => {
                reject(deleteRequest.error);
            };
        });
    };
}
