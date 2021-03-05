/**
 * Currently supported game's metadata
 * @typedef {Object} GGameMetaData
 * @property {string|null} name the name of the game, required for saving
 * @property {string|null} id the id of the game, required for saving
 * @property {string|null} version version of the game
 * @property {string|null} secret secret used as evidence of ownership
 * @property {boolean} showFooter defaults true, if "Powered by QRGame studio" should be shown
 * @property {boolean} update defaults to true, if the game should auto-update
 * @property {boolean} saveInHistory defaults to true, if the game should be saved into your collection
 * @property {string|null} code the HTML code of the game, required
 */


/**
 * Game data creator and parser
 * @constructor
 */
function GGameData() {
    /**
     * Returns the default values for the parsed game
     * @return GGameMetaData default values for the parsed game
     */
    this.defaultGame = () => {
        return {
            name: 'QR Game',
            id: null,
            version: null,
            secret: null,
            showFooter: true,
            update: true,
            saveInHistory: true,
            code: null
        };
    }

    /**
     * Parses current games metadata from head, fills missing information with default values
     * @return GGameMetaData metadata for the current game
     */
    this.parseGameData = () => {
        const gameIdEl = document.head.querySelector('meta[name=gi]');
        const gameVersionEl = document.head.querySelector('meta[name=gv]');
        const gameSecretEl = document.head.querySelector('meta[name=gs]');
        const gameFooterEl = document.head.querySelector('meta[name=gf]');
        const gameAutoUpdateEl = document.head.querySelector('meta[name=gu]');
        const gameSaveInHistoryEl = document.head.querySelector('meta[name=gh]');
        const titleEl = document.head.querySelector('title');

        let game = this.defaultGame();

        if (gameIdEl) {
            game.id = gameIdEl.getAttribute('content');
        } else {
            return null;
        }
        if (titleEl) {
            game.name = titleEl.textContent;
        }
        if (gameVersionEl) {
            game.version = gameVersionEl.getAttribute('content');
        }
        if (gameSecretEl) {
            game.secret = gameSecretEl.getAttribute('content');
        }
        if (gameFooterEl) {
            game.showFooter = gameFooterEl.getAttribute('content').toLowerCase() !== 'no';
        }
        if (gameAutoUpdateEl) {
            game.update = gameAutoUpdateEl.getAttribute('content').toLowerCase();
        }
        if (gameSaveInHistoryEl) {
            game.saveInHistory = gameSaveInHistoryEl.getAttribute('content').toLowerCase() !== 'no';
        }

        console.debug(`[GAME] playing game ${game.id} v${game.version}`);

        return game;
    }
}
