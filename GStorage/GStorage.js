/**
 * Operator with the storage
 * @param context in which context to operate - should be unique for every app
 * @param temporary if set to true, then the values are valid only for current session
 * @constructor
 */
function GStorage(context, temporary=false) {
    const storageProvider = temporary ? sessionStorage : localStorage;

    /**
     * Gets a value from storage
     * @param {string} key key to get from storage
     * @param {any|null} def what to return if the key does not exist, defaults to null
     * @return {Promise<any|null>}
     */
    this.get = async (key, def=null) => {
        const storageKey = `${context}/${key}`;
        if (!(storageKey in storageProvider)) {
            return def;
        }
        return JSON.parse(storageProvider.getItem(storageKey));
    }

    /**
     * Sets the new value for the key and saves to the storage
     * @param {string} key key to set value for
     * @param {any} value value to set
     * @return {Promise<bool>} true on success
     */
    this.set = (key, value) => new Promise((r) => {
        storageProvider.setItem(`${context}/${key}`, JSON.stringify(value));
        r(true);
    });

    // noinspection JSUnusedGlobalSymbols
    /**
     * Deletes key from storage
     * @param {string} key key to delete
     * @return {Promise<boolean>} true on success
     */
    this.del = (key) => this.set(key, null);
}
