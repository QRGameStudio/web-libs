/**
 * Operator with application theming
 * @constructor
 */
function GTheme() {
    /**
     * @type {GStorage|null}
     */
    const permanentStorage = GStorage ? new GStorage("theme") : null;

    /**
     * Fetches current theme, defaults to light
     * @return {"light"|"dark"}
     */
    this.get = () => localStorage.getItem("theme") || "light";

    /**
     * Applies selected theme (by editing bootstrap classes)
     * Adds class to the body (theme-light or theme-dark)
     * @param {"light"|"dark"|null} theme if null, applies currently saved theme
     * @return void
     */
    this.apply = (theme=null) => {
        theme = theme ? theme : this.get();
        const oldClassed = [];
        document.body.classList.forEach((c) => {
           if (c.startsWith('theme-')) {
               oldClassed.push(c);
           }
        });
        oldClassed.forEach((c) => document.body.classList.remove(c));
        document.body.classList.add(`theme-${theme}`);
        switch (theme) {
            case 'dark':
                document.querySelectorAll('.card').forEach(e => e.classList.add('bg-dark'));
                document.querySelectorAll('.btn').forEach(e => e.classList.add('btn-dark'));
                break;
            case 'light':
                document.querySelectorAll('.card.bg-dark').forEach(e => e.classList.remove('bg-dark'));
                document.querySelectorAll('.btn.btn-dark').forEach(e => e.classList.remove('btn-dark'));
                break;
        }
    }

    /**
     * Saves theme into storage
     * @param {"light"|"dark"} theme theme to save
     * @return {Promise<bool>} true on save success
     */
    this.save = async (theme) => {
        theme = theme ? theme : this.get();
        localStorage.setItem("theme", theme);
        if (!permanentStorage) {
            return false;
        }
        return permanentStorage.set("theme", theme);
    }

    if (localStorage.getItem("theme") === null) {
        permanentStorage.get("theme", "light").then(this.save);
    }
}

// noinspection JSUnresolvedVariable
if (typeof $ !== 'undefined') {
    // noinspection JSUnresolvedFunction
    $(document).ready(() => new GTheme().apply())
}
