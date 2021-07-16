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
         * @type {Array<GEO>}
         */
        this.objects = [];

        /**
         * @type {number}
         */
        this.fps = 30;

        /**
         * @type {Object.<string, boolean>}
         * @private
         */
        this.__keys_down = {};

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
         */
        this.onClick = (x, y) => {
            console.debug(`[GEG] Clicked at ${x} ${y}`)
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

        this.__rescaleCanvas();
        // hook events
        this.canvas.setAttribute('tabindex', `${Math.floor(Math.random() * 10000)}`);
        this.canvas.addEventListener('resize', () => this.__rescaleCanvas());
        this.canvas.addEventListener('click', (event) => {
            const {x, y} = event;
            this.onClick(x, y);
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

    /**
     * Tests if key is currently pressed
     * @param key {string} name of the key
     * @returns {boolean}
     */
    kp(key) {
        return key in this.__keys_down;
    }

    /**
     * Width
     * @return {number}
     */
    get w() {
        return this.canvas.width;
    }

    /**
     * Height
     * @return {number}
     */
    get h() {
        return this.canvas.height;
    }

    /**
     * Star the game loop
     */
    run() {
        const _this = this;

        function gameLoopOnce() {
            const timeStart = Date.now();

            _this.runOneLoop();

            setTimeout(
                () => window.requestAnimationFrame(() => gameLoopOnce()),
                Math.max(0, Date.now() - (timeStart + _this.stepTime))
            );
        }

        gameLoopOnce();
    }

    /**
     * Run one step of the game
     */
    runOneLoop() {
        this.__step();
        this.__checkCollisions();
        this.__draw();
    }

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
     * Perform one step on the gawame and all objects
     * @private
     */
    __step() {
        this.onStep();
        this.objects.forEach((o) => {
            // noinspection JSUnresolvedFunction
            o.__gameStep();
        });
    }

    /**
     * Performs draw event on self and all objects
     * @private
     */
    __draw() {
        const {ctx, canvas} = this;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.onDraw(ctx, canvas);
        this.objects.forEach((o) => {
            // noinspection JSUnresolvedFunction
            o.__draw();
        });
    }

    __checkCollisions() {
        this.objects.forEach((o1, i1) => {
            if (o1.cwl.size === 0) {
                return;
            }
            for (let i2 = i1 + 1; i2 < this.objects.length; i2++) {
                const o2 = this.objects[i2];
                const o1Accepts = o1.cwl.has(o2.t);
                const o2Accepts = o2.cwl.has(o1.t);
                if (!o1Accepts && !o2Accepts) {
                    continue;
                }
                const collides = o1.isCol(o2);
                if (collides) {
                    if (o1Accepts) {
                        o1.oncollision(o2);
                    }
                    if (o2Accepts) {
                        o2.oncollision(o1);
                    }
                }
            }
        });
    }

    /**
     * Rescale canvas to new game size
     * @private
     */
    __rescaleCanvas() {
        const { canvas } = this;
        const { height, width } = canvas.getBoundingClientRect();
        console.debug(`[GEG] Scaling canvas to ${width}x${height}`);
        canvas.height = height;
        canvas.width = width;
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
         * Set of types that are allowed to collide with this object
         * @type {Set<string>}
         */
        this.cwl = new Set();

        /**
         * Game that this object is assigned to
         * @type {GEG}
         */
        this.game = game;
        this.game.objects.push(this);

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
        degrees %= 360;
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
     * Remove this object from game
     * @return {void}
     */
    die() {
        this.game.objects = this.game.objects.filter((o) => o !== this);
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
        const distance = Math.sqrt(((this.x - other.x) ** 2) + ((this.y - other.y) ** 2));
        if (!forcePixelPerfectCollision && distance > radius + radiusOther) {
            return false;
        }

        // pixel-perfect collision detection
        const gameCopyCanvas = document.createElement('canvas');
        const ctx = gameCopyCanvas.getContext('2d');
        gameCopyCanvas.width = this.game.w;
        gameCopyCanvas.height = this.game.h;
        const radius2x = radius * 2;
        this.__draw(ctx);
        const sumOrig = ctx.getImageData(this.x - radius, this.y - radius, radius2x, radius2x).data.reduce((a, b) => a + b, 0);
        ctx.globalCompositeOperation = "destination-out";
        other.__draw(ctx);
        const sumNew = ctx.getImageData(this.x - radius, this.y - radius, radius2x, radius2x).data.reduce((a, b) => a + b, 0);
        return sumOrig !== sumNew;
    }

    /**
     * Perform one step event
     * @return {void}
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
     * Perform move by the speed and launch step event of this object
     * @private
     * @return {void}
     */
    __gameStep() {
        this.x += this.sx;
        this.y -= this.sy;

        const radius = this.r;

        // test if object has left the screen
        if (this.x + radius < 0 ||
            this.x - radius > this.game.w ||
            this.y + radius < 0 ||
            this.y - radius > this.game.h) {
            if (!this.__onscreenleftTriggered) {
                this.__onscreenleftTriggered = true;
                this.onscreenleft();
            }
        } else if (this.__onscreenleftTriggered) {
            this.__onscreenleftTriggered = false;
        } else if (
            this.x - radius < 0 ||
            this.y - radius < 0 ||
            this.x + radius > this.game.w ||
            this.y + radius > this.game.h
        ) {
            if (!this.__onscreenborderTriggered) {
                this.onscreenborder();
                this.__onscreenborderTriggered = true;
            }
        } else if (this.__onscreenborderTriggered) {
            this.__onscreenborderTriggered = false;
        }

        this.step();
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
