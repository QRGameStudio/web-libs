class GScore {
    /**
     *
     * @param scoreEl {HTMLElement | null}
     */
    constructor(scoreEl = null) {
        /**
         * @type {HTMLElement}
         */
        this.scoreEl = scoreEl || document.getElementById('game-score') || this.__createScoreEl();

        this.__saveKey = 'high-score';
        this.__storage = new GStorage('qrg.' + new GGameData().parseGameData().id);
        this.__score = 0;
        /**
         * @type {number|null|undefined}
         * @private
         */
        this.__highScore = undefined;
    }

    /**
     *
     * @param value {number}
     * @return {Promise<boolean>}
     */
    async inc(value) {
        return this.set(this.get() + value);
    }

    /**
     *
     * @param value {number}
     * @return {Promise<boolean>}
     */
    async set(value) {
        this.__score = value;
        let r = true;
        if (value > await this.getHighScore()) {
            this.__highScore = value;
            r = this.__storage.set(this.__saveKey, value);
        }
        this.__render(value);
        return r;
    }

    /**
     *
     * @return {Promise<number>}
     */
    async getHighScore() {
        return this.__highScore === undefined ? this.__highScore = await this.__storage.get(this.__saveKey, 0) : this.__highScore;
    }

    /**
     *
     * @return {number}
     */
    get() {
        return this.__score;
    }

    /**
     * Creates and returns new score HTML element
     * @return {HTMLSpanElement}
     * @private
     */
    __createScoreEl() {
        const el = document.createElement('span');
        el.id = 'game-score';
        el.style.position = 'fixed';
        el.style.top = '8px';
        el.style.right = '8px';
        document.body.appendChild(el);
        return el;
    }

    /**
     *
     * @param value {number}
     * @private
     * @return {void}
     */
    __render(value) {
        const hs = this.__highScore ? ` (${this.__highScore})` : '';
        this.scoreEl.textContent = `${value}${hs}`;
    }
}
