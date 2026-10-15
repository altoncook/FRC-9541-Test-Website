export class Game2D {

    stopFlag = false;

    constructor(canvas, tickTime) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tickTime = tickTime;
    }

    start() {}
    tick() {}
    render() {}

    init() {
        this.start();
        requestAnimationFrame((timestamp) => this.#gameLoop(timestamp));
    }

    lastTime = 0;
    accumulator = 0;

    #gameLoop(timestamp) {
        if (this.stopFlag) {
            this.stopFlag = false;
            return;
        }
        if (!this.lastTime) this.lastTime = timestamp;
        let frameTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (frameTime > 250) frameTime = 250;

        this.accumulator += frameTime;

        while (this.accumulator >= this.tickTime) {
            this.tick();
            this.accumulator -= this.tickTime;
        }

        this.render();

        requestAnimationFrame((timestamp) => this.#gameLoop(timestamp));
    }
}



