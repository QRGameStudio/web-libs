/**
 * @typedef {{x: number, y: number}} GPoint
 */

/**
 * Game engine
 */
class GEG {
    /**
     *
     * @param canvas {HTMLCanvasElement}
     */
    constructor(canvas) {
        /**
         * @type {HTMLCanvasElement}
         */
        this.canvas = canvas;

        /**
         * @type {HTMLCanvasElement}
         */
        this.collisionCanvas = document.createElement('canvas');

        /**
         * Type to objects map
         * @type {Map<string, Set<GEO>>}
         */
        this.__objects = new Map();

        /**
         * Set of all clickable objects
         * @type {Set<GEO>}
         */
        this.clickableObjects = new Set();

        /**
         * @type {number}
         */
        this.fps = 30;

        /**
         * @type {number}
         * @private
         */
        this.__last_step_start = Date.now();

        /**
         * If not null, slows down all object further from camera than specified value
         * @type {number|null}
         */
        this.fullSimulationRange = null;

        /**
         * @type {boolean}
         */
        this.paused = false;

        /**
         *
         * @type {number|null}
         */
        this.hearingDistance = null;

        /**
         * @type {Object.<string, boolean>}
         * @private
         */
        this.__keys_down = {};

        /**
         * @type {GPoint}
         * @protected
         */
        this.__cameraOffset = {x: 0, y: 0};

        /**
         * @type {GEO | null}
         * Camera automatically follows this object if it is alive
         */
        this.__cameraFollowObject = null;

        /**
         * Index of current step
         * @type {number}
         */
        this.stepIndex = 0;

        /** @type {GThread} */
        this.threads = new GThread(4);

        /**
         * @return {void | Promise<void>}
         */
        this.onStep = () => {
        };
        /**
         * @param ctx {CanvasRenderingContext2D}
         * @param canvas {HTMLCanvasElement}
         */
        this.onDraw = (ctx, canvas) => {
            console.assert(ctx !== null && canvas !== null);
        };

        /**
         * @param x {number}
         * @param y {number}
         * @param clickedObjects {Set<GEO>}
         */
        this.onClick = (x, y, clickedObjects) => {
            console.debug(`[GEG] Clicked at ${x} ${y}`, clickedObjects)
        }

        /**
         * @param key {string}
         * @param keyEvent {KeyboardEvent}
         */
        this.onKeyDown = (key, keyEvent) => {
            console.debug(`[GEG] Key down ${key}`, keyEvent);
        }

        /**
         * @param key {string}
         * @param keyEvent {KeyboardEvent}
         */
        this.onKeyUp = (key, keyEvent) => {
            console.debug(`[GEG] Key up ${key}`, keyEvent);
        }

        /**
         * Object removed at the end of the step
         * @type {Set<GEO>}
         * @private
         */
        this.__deadObjects = new Set();

        /**
         * Force game resolution instead of taking full size
         * @type {null | {width: number, height: number}}
         * @private
         */
        this.__forcedResolution = null;

        /**
         * Game zoom level
         * @type {number}
         */
        this.__zoom = 1;

        this.__rescaleCanvas();
        // hook events
        this.canvas.setAttribute('tabindex', `${Math.floor(Math.random() * 10000)}`);
        this.canvas.addEventListener('resize', () => this.__rescaleCanvas());
        this.canvas.addEventListener('click', (event) => {
            let {x, y} = event;
            const realSize = this.canvas.getBoundingClientRect();
            x *= this.w / realSize.width;
            y *= this.h / realSize.height;

            x -= this.cameraOffset.x;
            y -= this.cameraOffset.y;

            /**
             * @type {Set<GEO>}
             */
            const clickedObjects = new Set();
            if (this.clickableObjects.size) {
                const clickObject = this.createObject(x, y);
                clickObject.w = clickObject.h = 1;
                this.clickableObjects.forEach(o => {
                    if (o.isVisible && o.distanceTo({x, y}) < o.r) {
                        clickedObjects.add(o);
                    }
                });
                clickObject.die();
            }

            let clickHandled = false;
            for (const obj of clickedObjects) {
                if (clickHandled) {
                    break;
                }
                clickHandled = !!obj.onclick(x, y, clickedObjects);
            }

            if (!clickHandled) {
                this.onClick(
                    Math.round(x),
                    Math.round(y),
                    clickedObjects
                );
            }
        });
        this.canvas.addEventListener('keydown', (event) => {
            const { key } = event;
            if (!(key in this.__keys_down)) {
                this.onKeyDown(key, event);
                this.__keys_down[key] = true;
            }
        });
        this.canvas.addEventListener('keyup', (event) => {
            const { key } = event;
            this.onKeyUp(key, event);
            delete this.__keys_down[key];
        });
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Tests if key is currently pressed
     * @param key {string} name of the key
     * @returns {boolean}
     */
    kp(key) {
        return key in this.__keys_down;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Emulate key press
     * @param key {string} pressed key
     * @return {void}
     */
    press(key) {
        this.__keys_down[key] = true;
        this.onKeyDown(key, null);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Emulate key release
     * @param key {string} released key
     * @return {void}
     */
    release(key) {
        delete this.__keys_down[key];
        this.onKeyDown(key, null);
    }

    /**
     * Width
     * @return {number}
     */
    get w() {
        return this.canvas.width;
    }

    /**
     * Width half
     * @return {number}
     */
    get wh() {
        return this.w / 2;
    }

    /**
     * Height
     * @return {number}
     */
    get h() {
        return this.canvas.height;
    }

    /**
     * Height half
     * @return {number}
     */
    get hh() {
        return this.h / 2;
    }

    /**
     * Radius
     * @return {number} max of this.wh, this.hh
     */
    get r() {
        return Math.max(this.wh, this.hh);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Force-sets new resolution, null for auto resolution
     * @param resolution {null | {w: number, h: number}}
     */
    set res(resolution) {
        this.__forcedResolution = resolution ? {width: resolution.w, height: resolution.h} : null;
        this.__rescaleCanvas();
    }

    /**
     * Sets new zoom level
     * @param value {number}
     */
    set zoom(value) {
        this.__zoom = value;
        this.__rescaleCanvas();
    }

    /**
     * Computes distance between two points
     * @param a {{x: number, y: number}} point A
     * @param b {{x: number, y: number}} point B
     * @return {number}
     */
    distanceBetween(a, b) {
        return Math.sqrt(((a.x - b.x) ** 2) + ((a.y - b.y) ** 2));
    }

    /**
     * Gets the nearest objects of given type
     * @param point {{x: number, y: number}}
     * @param type {string|Set<string>}
     * @param maxDistance {number | null}
     * @param count {number|null}
     * @return {Promise<GEO[]>}
     */
    async getNearest(point, type, maxDistance = null, count = null) {
        if (typeof type === "string") {
            type = new Set([type]);
        }

        /**
         *
         * @type {GEO[]}
         */
        const objectsInDistance = [];
        for (const object of this.objectsOfTypes(type)) {
            if (maxDistance !== null && this.distanceBetween(point, object) > maxDistance) {
                continue;
            }

            objectsInDistance.push(object);
        }

        /**
         * @type {(GPoint & {i: number})[]}
         */
        let objectInDistancePoints = objectsInDistance.map((o, i) => ({x: o.x, y: o.y, i}));

        objectInDistancePoints = await this.threads.sort(
            objectInDistancePoints,
            (a, b) => this.distanceBetween(point, a) - this.distanceBetween(point, b)
        );
        return (count === null ? objectInDistancePoints : objectInDistancePoints.slice(0, count)).map((o) => objectsInDistance[o.i]);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Star the game loop
     */
    run() {
        const _this = this;
        this.stepIndex = 0;

        async function gameLoopOnce() {
            const timeStart = Date.now();

            if (!_this.paused) {
                await _this.runOneLoop();
            }

            setTimeout(
                () => window.requestAnimationFrame(() => gameLoopOnce()),
                Math.max(0, Date.now() - (timeStart + _this.stepTime))
            );
        }

        gameLoopOnce().then();
    }

    /**
     * Run one step of the game
     */
    async runOneLoop() {
        await this.__step();
        this.__draw();
        this.__checkCollisions();
        this.__removeDeadObjects();
        this.stepIndex += 1;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Create new object
     * @param x {number} default 0
     * @param y {number} default 0
     * @param direction {number} default 0
     * @param relativeTo {GEO} default null, if set, all other arguments are taken as relative to this
     * @return {GEO}
     */
    createObject(x = 0, y = 0, direction = 0, relativeTo = null) {
        const obj = new GEO(this);
        if (relativeTo === null) {
            obj.x = x;
            obj.y = y;
            obj.d = direction;
        } else {
            const relativePoint = GUt.pointRelativeTo(relativeTo.x, relativeTo.y, relativeTo.d, x, y);
            obj.x = relativePoint.x;
            obj.y = relativePoint.y;
            obj.d = relativeTo.d + direction;
        }

        return obj;
    }

    /**
     * Schedules object for removing at the end of the game step
     * @param object {GEO}
     * @return {void}
     */
    removeObject(object) {
        this.__deadObjects.add(object);
    }

    /**
     * Gets current camera offset
     * @return {GPoint}
     */
    get cameraOffset() {
        return {...this.__cameraOffset};
    }

    /**
     * Sets and applies new camera offset
     * @param point {GPoint}
     */
    set cameraOffset(point) {
        const current = this.cameraOffset;
        const newOffset = {x: Math.round(point.x), y: Math.round(point.y)};

        if (current.x === newOffset.x && current.y === newOffset.y) {
            return;
        }

        this.ctx.translate(-current.x, -current.y);
        this.ctx.translate(newOffset.x, newOffset.y);

        this.__cameraOffset = newOffset;
    }

    /**
     * Sets and applies new camera offset
     * @param point {GPoint}
     */
    set cameraCenter(point) {
        this.cameraOffset = {
            x: this.wh - point.x,
            y: this.hh - point.y
        }
    }

    /**
     * Gets the center of camera
     * @return {GPoint}
     */
    get cameraCenter() {
        return {
            x: -this.__cameraOffset.x,
            y: -this.__cameraOffset.y
        }
    }

    /**
     * Camera will center on this object and will move with it
     * Set to null to clear following status
     * @param object {GEO | null}
     */
    set cameraFollowObject(object) {
        this.__cameraFollowObject = object;
    }

    /**
     * How many milliseconds one step takes
     * @returns {number}
     */
    get stepTime() {
        return 1000 / this.fps;
    }

    /**
     * @return {CanvasRenderingContext2D}
     */
    get ctx() {
        return this.canvas.getContext('2d');
    }

    /**
     * All objects
     * @return {Iterator<GEO>}
     */
    *objects() {
        for (const objects of this.__objects.values()) {
            for (const object of objects) {
                yield object;
            }
        }
    }

    /**
     * Get all objects of given types
     * @param types {Set<string>}
     * @return {Iterator<GEO>}
     */
    *objectsOfTypes(types) {
        for (const type of types) {
            if (!this.__objects.has(type)) {
                continue;
            }

            for (const object of this.__objects.get(type)) {
                yield object;
            }
        }
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Opens new window with the collision detection canvas
     * Useful for debugging
     */
    openCollisionWindow() {
        const win = window.open();
        win.document.body.append(this.collisionCanvas);
        this.collisionCanvas.style.border = '1px dashed red';
        win.document.body.style.background = 'black';
    }

    /**
     * Perform one step on the game and all objects
     * @private
     * @return {Promise<void>}
     */
    async __step() {
        let timeSinceLastStep = Date.now() - this.__last_step_start;
        this.__last_step_start = Date.now();
        if (this.stepIndex % 1000 === 0) {
            console.debug(`[GEG] step ${this.stepIndex}, ${1000 / timeSinceLastStep} FPS, ${[...this.__objects.values()].reduce((a, b) => a + b.size, 0)} objects`);
        }
        /** @type {Promise<void>[]} */
        const promises = [];

        const sr = this.onStep();
        if (sr instanceof Promise) {
            promises.push(sr);
        }

        const camera = this.cameraCenter;
        const minX = camera.x - this.fullSimulationRange;
        const maxX = camera.x + this.fullSimulationRange;
        const minY = camera.y - this.fullSimulationRange;
        const maxY = camera.y + this.fullSimulationRange;

        for (const o of this.objects()) {
            if (this.fullSimulationRange) {
                if ((o.x < minX || o.x > maxX || o.y < minY || o.y > maxY) && this.stepIndex % 3 !== 0) {
                    continue;
                }
            }

            // noinspection JSUnresolvedFunction
            const r = o.__gameStep();
            if (r instanceof Promise) {
                promises.push(r);
            }
        }

        await Promise.all(promises);
    }

    /**
     * Performs draw event on self and all objects
     * @private
     * @return {void}
     */
    __draw() {
        const {ctx, canvas} = this;

        ctx.fillStyle = 'black';
        ctx.fillRect(-this.__cameraOffset.x, -this.__cameraOffset.y, canvas.width, canvas.height);

        this.onDraw(ctx, canvas);
        for (const o of this.objects()) {
            if (o === this.__cameraFollowObject) {
                this.cameraCenter = {
                    x: o.cx,
                    y: o.cy
                }
            }

            if (!o.isVisible) {
                continue;
            }

            // noinspection JSUnresolvedFunction
            o.__draw();
        }
    }

    /**
     * Checks all objects if onCollision should be called
     * @private
     * @return {void}
     */
    __checkCollisions() {
        /**
         * @type {Map<GEO, Set<GEO>>}
         */
        const knownCollisions = new Map();

        /**
         * @param o1 {GEO}
         * @param o2 {GEO}
         */
        const addKnownCollision = (o1, o2) => {
            if (!knownCollisions.has(o1)) {
                knownCollisions.set(o1, new Set());
            }
            if (!knownCollisions.has(o2)) {
                knownCollisions.set(o2, new Set());
            }
            knownCollisions.get(o1).add(o2);
            knownCollisions.get(o2).add(o1);
        };

        for (const o1 of this.objects()) {
            if (o1.isDead) {
                return;
            }

            for (const o2 of this.objectsOfTypes(o1.cwl)) {
                const collides = knownCollisions.get(o1)?.has(o2) || o1.isCol(o2);

                if (collides) {
                    addKnownCollision(o1, o2);
                    o1.oncollision(o2);
                }
            }
        }
    }

    /**
     * Removes dead objects from the game
     * @private
     * @return {void}
     */
    __removeDeadObjects() {
        if (this.__cameraFollowObject !== null && this.__deadObjects.has(this.__cameraFollowObject)) {
            this.__cameraFollowObject = null;
        }

        this.__deadObjects.forEach((o) => {
            this.__objects.get(o.t)?.delete(o);
            if (this.clickableObjects.has(o)) {
                this.clickableObjects.delete(o);
            }
        });
        this.__deadObjects.clear();
    }

    /**
     * Rescale canvas to new game size
     * @private
     * @return {void}
     */
    __rescaleCanvas() {
        const { canvas } = this;
        const { height, width } = canvas.getBoundingClientRect();
        console.debug(`[GEG] Scaling canvas to ${width}x${height}`);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const zoom = 1 / this.__zoom;

        if (!this.__forcedResolution) {
            canvas.height = Math.round(height * zoom);
            canvas.width = Math.round(width * zoom);
        } else {
            canvas.height = Math.round(this.__forcedResolution.height * zoom);
            canvas.width = Math.round(this.__forcedResolution.width * zoom);
        }
    }
}

/**
 * Game object
 */
class GEO {
    /**
     *
     * @param game {GEG}
     */
    constructor(game) {
        /**
         * Game that this object is assigned to
         * @type {GEG}
         */
        this.game = game;

        /**
         * A unique ID of this object instance, nonce
         * @type {number}
         */
        this.id = Math.floor(Math.random() * Math.pow(2, 31));

        while (true) {
            let duplicateId = false;

            for (const object of this.game.objects()) {
                if (object.id === this.id) {
                    duplicateId = true;
                    break;
                }
            }
            if (duplicateId) {
                this.id = Math.floor(Math.random() * Math.pow(2, 31));
            } else {
                break;
            }
        }

        /**
         * X coordinate
         * @type {number}
         */
        this.x = 0;
        /**
         * Y coordinate
         * @type {number}
         */
        this.y = 0;
        /**
         * Width
         * @type {number}
         */
        this.w = 0;
        /**
         * Height
         * @type {number}
         */
        this.h = 0;
        /**
         * Object-specific data
         * @type {Map<string, any>}
         */
        this.data = new Map();
        /**
         * Horizontal speed
         * @type {number}
         * @private
         */
        this.__sx = 0;
        /**
         * Vertical speed
         * @type {number}
         * @private
         */
        this.__sy = 0;
        // noinspection JSUnusedGlobalSymbols
        /**
         * Type of this object
         * @type {string}
         */
        this.__type = undefined;
        this.t = '';

        /**
         * Image angle
         * null means same as direction, 0 to disable rotation
         * @type {null|number}
         */
        this.ia = null;
        /**
         * Direction of this object, required is speed is 0
         * @type {number}
         * @private
         */
        this.__direction = 0;

        /**
         * The last index of steps performed on this object
         * @type {number}
         * @private
         */
        this.__lastStepIndex = this.game.stepIndex - 1;

        /**
         * Set of types that are allowed to collide with this object
         * @type {Set<string>}
         */
        this.cwl = new Set();

        /**
         * @type {boolean}
         * @private
         */
        this.__onscreenleftTriggered = false;
        /**
         * @type {boolean}
         * @private
         */
        this.__onscreenborderTriggered = false;

        /**
         * True after .die() is called
         * @type {boolean}
         * @private
         */
        this.__is_dead = false;
    }

    /**
     * Type of this object
     * @return {string}
     */
    get t() {
        return this.__type;
    }

    /**
     * Set new type of this object
     * @param value {string}
     */
    set t(value) {
        if (value === this.__type) {
            return;
        }

        this.game.__objects.get(this.__type)?.delete(this);

        if (!this.game.__objects.has(value)) {
            this.game.__objects.set(value, new Set());
        }

        const newObjectsSets = this.game.__objects.get(value);
        newObjectsSets.add(this);
        this.__type = value;
    }

    /**
     * Width half
     * @return {number}
     */
    get wh() {
        return this.w / 2;
    }

    /**
     * Height half
     * @return {number}
     */
    get hh() {
        return this.h / 2;
    }

    /**
     * Center X
     * @return {number}
     */
    get cx() {
        const directionRad = GUt.degToRad(this.__direction);
        return this.x + (this.wh * Math.cos(directionRad));
    }

    /**
     * Center Y
     * @return {number}
     */
    get cy() {
        const directionRad = GUt.degToRad(this.__direction);
        return this.y + (this.hh * Math.sin(directionRad));
    }

    /**
     * Radius
     * @return {number} max of this.wh, this.hh
     */
    get r() {
        return Math.max(this.wh, this.hh);
    }

    /**
     * Direction of this object in degrees
     * @return {number} [0; 360)
     */
    get d() {
        return this.__direction;
    }

    /**
     * Sets the direction of this object
     * @param degrees {number}
     */
    set d(degrees) {
        degrees = GUt.absoluteAngle(degrees);
        const { s } = this;
        const directionRad = GUt.degToRad(degrees);
        this.__sx = s * Math.cos(directionRad);
        this.__sy = s * -Math.sin(directionRad);
        this.__direction = degrees;
    }

    /**
     * Speed of this object
     * @return {number}
     */
    get s() {
        const { sx, sy } = this;
        return Math.sqrt((sx ** 2) + (sy ** 2));
    }

    /**
     * Horizontal speed
     * @returns {number}
     */
    get sx() {
        return this.__sx;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param speed {number}
     */
    set sx(speed) {
        this.__sx = speed;
        if (this.__sx !== 0 || this.__sy !== 0) {
            this.__count_direction();
        }
    }

    /**
     * Vertical speed
     * @returns {number}
     */
    get sy() {
        return this.__sy;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * @param speed {number}
     */
    set sy(speed) {
        this.__sy = speed;
        if (this.__sx !== 0 || this.__sy !== 0) {
            this.__count_direction();
        }
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Sets speed of this object
     * @param speed {number}
     */
    set s(speed) {
        if (speed === 0) {
            this.__sx = this.__sy = 0;
            return;
        }
        const directionRad = GUt.degToRad(this.d);
        this.__sx = speed * Math.cos(directionRad);
        this.__sy = speed * -Math.sin(directionRad);
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Tests if the speed is in forward (true) or backward (false) direction
     * @return {boolean} true if the speed is stopped or is in forward or false if backward direction
     */
    get fwd() {
        const { sx, sy } = this;
        if (sx === 0 && sy === 0) {
            return true;
        }
        const directionSum = Math.abs(this.d + GUt.countAngle(sx, sy));
        return (directionSum > 359 && directionSum < 361) || (directionSum < 1 && directionSum > -1);
    }

    /**
     * Gets the position in next step with current speed
     * @return {{x: number, y: number}}
     */
    get nextPos() {
        return {
            x: this.x + this.sx,
            y: this.y - this.sy
        }
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Gets the current position
     * @return {{x: number, y: number}}
     */
    get pos() {
        return {
            x: this.x,
            y: this.y
        }
    }

    /**
     * Gets the loudness of sound as if it was emitted from within this object
     * @return {number} loudness in percent
     */
    get soundVolume() {
        if (this.game.hearingDistance === null) {
            return 100;
        }
        const dist = this.distanceTo(this.game.cameraCenter);
        if (dist > this.game.hearingDistance) {
            return 0;
        }

        return 100 * dist / this.game.hearingDistance;
    }

    /**
     * Makes this object react to on-click event
     * @param value {boolean}
     */
    set clickable(value) {
        if (value) {
            this.game.clickableObjects.add(this);
        } else if (this.game.clickableObjects.has(this)) {
            this.game.clickableObjects.delete(this);
        }
    }

    /**
     * Event executed when object is clickable and the object is clicked
     * @param x {number}
     * @param y {number}
     * @param clickedObject {Set<GEO>}
     * @return {boolean} if true, the click event is not propagated further
     */
    onclick(x, y, clickedObject) {
        console.debug(`[GEO] Handling object click at ${x}x${y}`, clickedObject);
        return false;
    }

    /**
     * Remove this object from game
     * @return {void}
     */
    die() {
        this.game.removeObject(this);
        this.__is_dead = true;
    }

    /**
     * Checks if .die() was already called
     * @return {boolean}
     */
    get isDead() {
        return this.__is_dead;
    }

    /**
     * Distance from another object
     * @param other {GEO}
     * @return {number}
     */
    distanceFrom(other) {
        return this.distanceTo({x: other.x, y: other.y});
    }

    /**
     * Distance to a point
     * @param point {GPoint}
     * @return {number}
     */
    distanceTo(point) {
        return this.game.distanceBetween({x: this.x, y: this.y}, point);
    }

    /**
     * Angle to look at a point
     * @param point {GPoint}
     * @return {number}
     */
    angleTo(point) {
        return GUt.countAngle(point.x - this.x, point.y - this.y);
    }

    /**
     * Tests if is colliding with other object
     * Performs pixel-perfect collision if two objects are close enough
     * @param other {GEO}
     * @param forcePixelPerfectCollision {boolean}
     * @return {boolean}
     */
    isCol(other, forcePixelPerfectCollision = false) {
        const radius = this.r;
        const radiusOther = other.r;

        if (radiusOther < radius) {
            // always test the one with smaller number with pixels
            return other.isCol(this, forcePixelPerfectCollision);
        }

        // quick test if object are able to have collision
        if (!forcePixelPerfectCollision && this.distanceFrom(other) > radius + radiusOther) {
            return false;
        }

        // pixel-perfect collision detection
        const gameCopyCanvas = this.game.collisionCanvas;
        const ctx = gameCopyCanvas.getContext('2d');

        const radius2x = radius * 2;

        /**
         * Gets sum of all pixels in 2x radius from object
         * @return {number}
         */
        const getImageSum = () => ctx.getImageData(0, 0, radius2x, radius2x).data.reduce((a, b) => a + b, 0);

        // noinspection JSSuspiciousNameCombination
        gameCopyCanvas.width = radius2x;
        // noinspection JSSuspiciousNameCombination
        gameCopyCanvas.height = radius2x;
        ctx.translate(-this.x + radius, -this.y + radius);
        this.__draw(ctx);
        const sumOrig = getImageSum();
        ctx.globalCompositeOperation = "destination-out";
        other.__draw(ctx);
        const sumNew = getImageSum();
        return sumOrig !== sumNew;
    }

    /**
     * Gets the nearest object of given type
     * @param type {string | Set<string>}
     * @param maxDistance {number | null}
     * @return {Promise<GEO | null>}
     */
    async getNearest(type, maxDistance = null) {
        const x = (await this.getNearests(type, maxDistance, 1))[0];
        return x !== undefined ? x : null;
    }

    /**
     * Gets the nearests objects of given type
     * @param type {string|Set<string>}
     * @param maxDistance {number | null}
     * @param count {number|null}
     * @return {Promise<GEO[]>}
     */
    getNearests(type, maxDistance = null, count = null) {
        return this.game.getNearest(this, type, maxDistance, count);
    }

    /**
     * Perform one step event
     * @return {void|Promise<void>}
     */
    step() {
        // To be implemented for every object
    }

    /**
     * Draws this object on the game canvas
     * @param ctx {CanvasRenderingContext2D}
     * @return {void}
     */
    draw(ctx) {
        const { w, h, wh, hh } = this;

        if (w === 0 && h === 0) {
            return;
        }

        console.assert(this.game !== null);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5;

        ctx.strokeRect(this.x - wh, this.y - hh, w, h);
    }

    /**
     * Triggered when object fully leaves the screen
     * @return {void}
     */
    onscreenleft() {
        // To be implemented on instance
    }

    /**
     * Triggered when object touches screen border
     * @return {void}
     */
    onscreenborder() {
        // To be implemented on instance
    }

    /**
     * Triggered when this object collides with another whitelisted object
     * @param other {GEO}
     */
    oncollision(other) {
        // To be implemented on instance
    }

    /**
     * Checks if the object is visible on screen
     * @return {boolean} true if the object is visible on screen
     */
    get isVisible() {
        const radius = this.r;
        const game = this.game;
        const offset = this.game.__cameraOffset;

        return !(this.x + radius < -offset.x ||
            this.x - radius > game.w - offset.x ||
            this.y + radius < -offset.y ||
            this.y - radius > game.h - offset.y);
    }

    /**
     * Checks if the object is touching the screen border
     * @return {boolean} true if the object is touching the screen border
     */
    get isTouchingBorder() {
        const radius = this.r;
        const game = this.game;
        const offset = this.game.__cameraOffset;

        return this.x - radius < -offset.x ||
        this.y - radius < -offset.y ||
        this.x + radius > game.w - offset.x ||
        this.y + radius > game.h - offset.y;
    }

    /**
     * Perform move by the speed and launch step event of this object
     * @private
     * @return {void|Promise<void>}
     */
    __gameStep() {
        const stepsToPerform = this.game.stepIndex - this.__lastStepIndex;

        this.x += stepsToPerform * this.sx;
        this.y -= stepsToPerform * this.sy;

        // test if object has left the screen
        if (!this.isVisible) {
            if (!this.__onscreenleftTriggered) {
                this.__onscreenleftTriggered = true;
                this.onscreenleft();
            }
        } else if (this.__onscreenleftTriggered) {
            this.__onscreenleftTriggered = false;
        } else if (this.isTouchingBorder) {
            if (!this.__onscreenborderTriggered) {
                this.onscreenborder();
                this.__onscreenborderTriggered = true;
            }
        } else if (this.__onscreenborderTriggered) {
            this.__onscreenborderTriggered = false;
        }

        const r = this.step();
        this.__lastStepIndex = this.game.stepIndex;
        return r;
    }

    /**
     * Draw this object on the game canvas
     * Auto-apply rotation if image angle or direction is set
     * @param altCtx {CanvasRenderingContext2D} alternative ctx to draw on
     * @private
     * @return {void}
     */
    __draw(altCtx = null) {
        const ctx = altCtx === null ? this.game.ctx : altCtx;
        const angle = this.__draw_angle;
        if (angle !== 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(GUt.degToRad(angle));
            ctx.translate(-this.x, -this.y);
        }
        this.draw(ctx);
        if (angle !== 0) {
            ctx.restore();
        }
    }

    /**
     * Computes at which angle should this object be drawn
     * @return {number}
     * @private
     */
    get __draw_angle() {
        return this.ia !== null ? this.ia : this.d;
    }

    /**
     * Counts direction from current speed
     * @returns {number}
     * @private
     */
    __count_direction() {
        const {sx, sy} = this;
        return this.__direction = GUt.countAngle(sx, -sy);
    }
}
