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
            console.debug(`Clicked at ${x} ${y}`)
        }

        /**
         * @param key {string}
         * @param keyEvent {KeyboardEvent}
         */
        this.onKeyDown = (key, keyEvent) => {
            console.debug(`Key down ${key}`, keyEvent);
        }

        /**
         * @param key {string}
         * @param keyEvent {KeyboardEvent}
         */
        this.onKeyUp = (key, keyEvent) => {
            console.debug(`Key up ${key}`, keyEvent);
        }

        this.__rescale_canvas();
        // hook events
        this.canvas.setAttribute('tabindex', `${Math.floor(Math.random() * 10000)}`);
        this.canvas.addEventListener('resize', () => this.__rescale_canvas());
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

    runOneLoop() {
        this.__step();
        this.__draw();
    }

    /**
     * @return {GEO}
     */
    createObject() {
        return new GEO(this);
    }

    /**
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

    __step() {
        this.onStep();
        this.objects.forEach((o) => {
            o.__game_step();
        });
    }

    __draw() {
        const {ctx, canvas} = this;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.onDraw(ctx, canvas);
        this.objects.forEach((o) => {
            o.__draw();
        });
    }

    __rescale_canvas() {
        const { canvas } = this;
        const { height, width } = canvas.getBoundingClientRect();
        canvas.height = height;
        canvas.width = width;
    }
}

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
         * Game that this object is assigned to
         * @type {GEG}
         */
        this.game = game;
        this.game.objects.push(this);
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

    step() {

    }

    /**
     * @param ctx {CanvasRenderingContext2D}
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

    __game_step() {
        this.x += this.sx;
        this.y -= this.sy;
        this.step();
    }

    __draw() {
        const { ctx } = this.game;
        const angle = this.ia !== null ? this.ia : this.d;
        if (angle !== 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(GUt.degToRad(angle));
            ctx.translate(-this.x, -this.y);
        }
        this.draw(this.game.ctx);
        if (angle !== 0) {
            ctx.restore();
        }
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
