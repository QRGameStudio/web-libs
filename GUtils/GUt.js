// noinspection JSUnusedGlobalSymbols
/**
 * Collections of utils for games
 * @type {{ud: (function(string): string)}}
 */
const GUt = {
    /**
     * Unicode decode
     * @param {string} base64string base64 encoded unicode string
     * @returns {string} original string
     */
    ud: (base64string) => {
        return decodeURIComponent(atob(base64string).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    },
}
