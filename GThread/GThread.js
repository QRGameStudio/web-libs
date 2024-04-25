/**
 * @typedef {{entryPoint: string, code: string | undefined, args: unknown[], eventId: unknown}} GEngineWorkerMessage
 * @typedef {{eventId: unknown, data: unknown, success: boolean}} GEngineWorkerResponse
 * @typedef {MessageEvent & {data: GEngineWorkerMessage}} GEngineWorkerMessageEvent
 * @typedef {MessageEvent & {data: GEngineWorkerResponse}} GEngineWorkerResponseEvent
 */

class GThread {
    /**
     * @param count {number}
     */
    constructor(count = 16) {
        /** @type {Worker[]} */
        this.threads = [];

        /**
         * @type {{[key: number]: {resolve: function(unknown), reject: function(unknown)}}}
         * @private
         */
        this.__resolves = {};

        /**
         * @type {number}
         * @private
         */
        this.__threadIndex = 0;

        for (let i = 0; i < count; i++) {
            const worker = new Worker(this.__workerUrl);
            this.threads.push(worker);
            worker.onmessage = (event) => this.__onMessage(event);
        }
    }

    /**
     * @param array {unknown[]}
     * @param compareFunction {function(unknown, unknown): number}
     * @return {Promise<unknown[]>}
     */
    sort(array, compareFunction = undefined) {
        return this.__execute({
            entryPoint: 'sort',
            args: [array],
            code: compareFunction ? compareFunction.toString() : undefined,
            eventId: this.__messageId
        });
    }

    /**
     * @param data {GEngineWorkerMessage}
     * @return Promise<unknown>
     * @private
     */
    __execute(data) {
        const promise = new Promise((resolve, reject) => {
            this.__resolves[data.eventId] = {resolve, reject}
        });
        const thread = this.threads[this.__threadIndex];
        this.__threadIndex = (this.__threadIndex + 1) % this.threads.length;
        thread.postMessage(data);
        return promise;
    }

    /**
     *
     * @return {number}
     * @private
     */
    get __messageId() {
        while (true) {
            const id = Math.floor(Math.random() * 1000000000);
            if (! (id in this.__resolves)) {
                return id;
            }
        }
    }

    /**
     *
     * @param event {GEngineWorkerResponseEvent}
     * @private
     */
    __onMessage(event) {
        const data = event.data;
        const resolve = this.__resolves[data.eventId].resolve;
        const reject = this.__resolves[data.eventId].reject;
        delete this.__resolves[data.eventId];

        if (data.success) {
            resolve(data.data);
        } else {
            reject(data.data);
        }
    }

    /**
     * @return {string}
     * @private
     */
    get __workerUrl() {
        const blob = new Blob([`(${__GThreadWorker.toString()})()`], {type: 'application/javascript'});
        const url = URL.createObjectURL(blob);
        setTimeout(() => URL.revokeObjectURL(url));
        return url;
    }
}


function __GThreadWorker() {
    const CODE_CACHE = {};

    /**
     * @param code {string | undefined}
     * @return {any}
     */
    function evalCode(code) {
        if (code === undefined) {
            return undefined;
        }
        if (! (code in CODE_CACHE)) {
            CODE_CACHE[code] = eval(code);
            setTimeout(() => delete CODE_CACHE[code], 60 * 1000);
        }
        return CODE_CACHE[code];
    }

    /**
     * @param event {GEngineWorkerMessageEvent}
     */
    self.onmessage = (event) => {
        const entryPointName = event.data.entryPoint;
        const codeStr = event.data.code;
        const args = event.data.args;
        const eventId = event.data.eventId;

        const code = evalCode(codeStr);

        let result;
        let success = true;
        let arg0;

        try {
            switch (entryPointName) {
                case "sort":
                    /** @type {unknown[]} */
                    arg0 = args[0];
                    result = code ? arg0.sort() : arg0.sort(code);
                    break;
                default:
                    const entryPoint = eval(entryPointName);
                    result = entryPoint(...args);
            }
        } catch (e) {
            success = false;
            result = e;
        }

        if (result instanceof Promise) {
            result.then((data) => {
                postMessage({
                    eventId: eventId,
                    data: data,
                    success
                });
            });
        } else {
            postMessage({
                eventId: eventId,
                data: result,
                success
            });
        }
    };
}
