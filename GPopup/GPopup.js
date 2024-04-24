/**
 * Shows a popup on the screen
 * @param {string} content HTML of the popup to show
 * @param {number|null} duration how long to keep the popup in ms, null for never hide
 * @constructor
 */
function GPopup(content, duration = null) {
    const el = document.createElement('div');
    el.classList.add('popup');
    el.classList.add('qr-popup');
    el.classList.add('btn');
    el.classList.add('btn-lg');
    el.classList.add('btn-info');
    el.innerHTML = content;
    el.dataset.firedAt = `${Date.now()}`;
    const observer = new MutationObserver(() => positionItself());
    let shown = false;

    function positionItself() {
        const popupBefore = [...document.querySelectorAll('.qr-popup')]
            .filter(e => Number(e.dataset.firedAt) < Number(el.dataset.firedAt))
            .sort((a, b) => Number(b.dataset.firedAt) - Number(a.dataset.firedAt))[0];
        el.style.top = popupBefore ? `${popupBefore.getBoundingClientRect().bottom + 10}px` : '';
    }

    /**
     * Shows the popup to the screen
     * @return void
     */
    this.show = () => {
        if (shown)
            return;
        shown = true;
        observer.observe(document.body, {childList: true, subtree: false, attributes: false, characterData: false});
        document.body.appendChild(el);
        el.classList.add('popup-in');
        el.addEventListener('click', () => this.remove().then());

        if (duration !== null)
            setTimeout(() => this.remove(), duration);
    };

    /**
     * Removes the popup from screen
     * @return {Promise<void>} when the popup was removed from screen
     */
    this.remove = () => {
        return new Promise(resolve => {
            if (!shown) {
                resolve();
                return;
            }
            shown = false;
            observer.disconnect();
            el.classList.remove('popup-in');
            el.classList.add('popup-out');
            setTimeout(() => {
                el.parentElement.removeChild(el);
                resolve();
            }, 1000);
        });
    };
}
