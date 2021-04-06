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

        this.__rescale_canvas();
        // hook events
        this.canvas.addEventListener('resize', () => this.__rescale_canvas());
        this.canvas.addEventListener('click', (event) => {
            const {x, y} = event;

            this.onClick(x, y);
        });
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
            o.step();
        });
    }

    __draw() {
        this.onDraw(this.ctx, this.canvas);
        this.objects.forEach((o) => {
            o.draw();
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
         */
        this.sx = 0;
        /**
         * Vertical speed
         * @type {number}
         */
        this.sy = 0;

        /**
         * Game that this object is assigned to
         * @type {GEG}
         */
        this.game = game;
        this.game.objects.push(this);
    }

    /**
     * Speed of this object
     * @return {number}
     */
    get s() {
        const { sx, sy } = this;
        return Math.sqrt((sx ** 2) + (sy ** 2));
    }

    step() {

    }

    draw() {
        const { w, h } = this;

        if (w === 0 && h === 0) {
            return;
        }

        console.assert(this.game !== null);

        const { ctx } = this.game;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5;

        const wh = h / 2;
        const ww = w / 2;

        ctx.strokeRect(this.x - ww, this.y - wh, w, h);
    }
}
