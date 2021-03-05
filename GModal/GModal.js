/**
 * Modal dialog
 * @constructor
 */
function GModal() {
    let initCompleted = false;

    function randomModalId(prefix = '') {
        let modalId;
        do {
            let r = Math.random().toString(36).substring(7);
            modalId = `modal-${prefix}-${r}`;
        } while (document.getElementById(modalId));
        return modalId;
    }

    /**
     * Initializes the modal system, must be called once before using
     * @return {Promise<boolean>}  true
     */
    this.init = async () => {
        if (initCompleted) {
            return true;
        }
        const modalContainerId = 'modal-container';
        let modalEl = document.querySelector(`#${modalContainerId}`);
        if (modalEl || document.querySelector('.modal-imported') !== null) {
            initCompleted = true;
            return true;
        }
        modalEl = document.createElement('div');
        modalEl.id = modalContainerId;
        document.body.appendChild(modalEl);
        modalEl.innerHTML = (await (await fetch('lib/GModal.html')).text());
        while (modalEl.childElementCount) {
            const child = modalEl.firstElementChild;
            child.classList.add('modal-imported');
            modalEl.removeChild(child);
            document.body.appendChild(child);
        }
        modalEl.parentNode.removeChild(modalEl);
        return true;
    }

    /**
     * Shows a predefined modal by its id
     * @param {string} modalId id of the modal to show
     * @param {Object.<string, any>} variables variables passed to the modal's renderer
     * @param {Object.<string, function>} functions functions passed to the modal's renderer
     * @param {Object.<string, any>} backData if specified, is filled with data from the modal calling
     * @return {Promise<void>} when the modal closes
     */
    this.show = async (modalId, variables = {}, functions = {}, backData = {}) => {
        if (!initCompleted) {
            await this.init();
        }
        const modalSelector = `#modal-${modalId}`;
        $(modalSelector).modal({backdrop: true, keyboard: true, focus: true, show: true});
        const modal = document.querySelector(modalSelector);
        const renderer = new Renderer(modal, variables, null, functions);
        Object.assign(renderer.variables, variables, {el: modal});
        Object.assign(renderer.functions, functions, {
                hideModal: () => {
                    $(modalSelector).modal('hide')
                }
            }
        );
        backData.renderer = renderer;
        renderer.render(modal);
        await new Promise((resolve) => {
            $(modalSelector).on('hidden.bs.modal', () => resolve());
        });
    }

    // noinspection JSUnusedLocalSymbols
    /**
     * Shows modal of type alert
     * @param {string} message message of the modal
     * @param {string} title title of the modal
     * @param {"info"} type type of the modal
     * @return {Promise<void>} when the modal was closed
     */
    this.alert = async (message, title = 'Message', type = 'info') => {
        if (!initCompleted) {
            await this.init();
        }
        const modalId = randomModalId('alert');
        const modalEl = document.createElement('div');
        modalEl.id = modalId;
        modalEl.className = 'modal';
        modalEl.setAttribute('tabindex', '-1');
        modalEl.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(modalEl);
        $(`#${modalId}`).modal({backdrop: true, keyboard: true, focus: true, show: true});
        await new Promise((resolve) => {
            $(`#${modalId}`).on('hidden.bs.modal', () => {
                modalEl.parentNode.removeChild(modalEl);
                resolve();
            });
        });
    }

    /**
     * Prompts the user for text input
     * @param {string} message message of the modal
     * @param {string} title title of the modal
     * @return {Promise<string|null>} user entered data, null if canceled
     */
    this.prompt = async (message = '', title = 'Question') => {
        if (!initCompleted) {
            await this.init();
        }
        const modalId = randomModalId('prompt');
        const modalEl = document.createElement('div');
        modalEl.id = modalId;
        modalEl.className = 'modal';
        modalEl.setAttribute('tabindex', '-1');
        modalEl.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <label for="${modalId}-prompt-text" r-if="!!v.message">${message}</label>
                    <input id="${modalId}-prompt-text" class="form-control" type="text">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">
                        Cancel
                     </button>
                    <button type="button" class="btn btn-primary" data-dismiss="modal" r-click="f.submit()">
                        Submit
                    </button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(modalEl);
        $(`#${modalId}`).modal({backdrop: true, keyboard: true, focus: true, show: true});
        const r = await new Promise((resolve) => {
            const renderer = new Renderer(modalEl);
            renderer.variables.message = message;
            renderer.functions.submit = () => resolve(modalEl.querySelector(`#${modalId}-prompt-text`).value);
            renderer.render();
            document.body.appendChild(modalEl);
            $(`#${modalId}`).on('hidden.bs.modal', () => {
                resolve(null);
            });
        });
        modalEl.parentNode.removeChild(modalEl);
        return r;
    }

    /**
     * Shows a yes/no modal to the user
     * @param {string} message message of the modal
     * @param {string} title title of the modal
     * @return {Promise<boolean|null>} yes = true, no = false, closed = null
     */
    this.yesNo = async (message = '', title = 'Question') => {
        if (!initCompleted) {
            await this.init();
        }
        const modalId = randomModalId('yesNo');
        const modalEl = document.createElement('div');
        modalEl.id = modalId;
        modalEl.className = 'modal';
        modalEl.setAttribute('tabindex', '-1');
        modalEl.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${title}</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal" r-click="f.submit(false)">
                        No
                     </button>
                    <button type="button" class="btn btn-primary" data-dismiss="modal" r-click="f.submit(true)">
                        Yes
                    </button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(modalEl);
        $(`#${modalId}`).modal({backdrop: true, keyboard: true, focus: true, show: true});
        const r = await new Promise((resolve) => {
            const renderer = new Renderer(modalEl);
            renderer.variables.message = message;
            renderer.functions.submit = (v) => resolve(v);
            renderer.render();
            document.body.appendChild(modalEl);
            $(`#${modalId}`).on('hidden.bs.modal', () => {
                resolve(null);
            });
        });
        modalEl.parentNode.removeChild(modalEl);
        return r;
    }
}
