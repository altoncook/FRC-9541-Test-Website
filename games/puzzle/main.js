import mapData from './assets/maps/d.json' with { type: 'json' };

class GameMap {
    constructor(width, height, grid, boxGrid, holeAmount) {
        this.width = width;
        this.height = height;
        this.grid = grid;
        this.boxGrid = boxGrid;
        this.holeAmount = holeAmount;
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

const PIECE_TYPES = {
    EMPTY: '-',
    NOTHING: 'x',
    WALL: 'w',
    HOLE: 'h',
    HOLE_FILLED: 'f',
    BOX: 'b',
    TEMP_FLOOR: 't',
    PLAYER_ONLY: 'o'
}

const PLAYER_PASSABLE_PIECES = [PIECE_TYPES.EMPTY, PIECE_TYPES.HOLE_FILLED, PIECE_TYPES.TEMP_FLOOR];
const BOX_PASSABLE_PIECES = [PIECE_TYPES.EMPTY, PIECE_TYPES.HOLE_FILLED, PIECE_TYPES.TEMP_FLOOR];

const TICKS_PER_SECOND = 20;
const TICK_TIME = 1000 / TICKS_PER_SECOND;

const atlasImg = new Image();
let isAtlasLoaded = false;

let bufferedInput;

// -- event listeners

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (event.repeat) return;

    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowright', 'arrowleft'].includes(key)) {
        event.preventDefault();
        bufferedInput = key;
    }
});

let resetFlag = false;
const resetButton = document.getElementById('reset-button');
resetButton.addEventListener('click', () => {
    resetFlag = true;
});

const undoButton = document.getElementById('undo-button');
undoButton.addEventListener('click', () => {
    alert('that button not implemented yet :<');
});

// -- end --

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

atlasImg.onload = function () {
    isAtlasLoaded = true;
};
atlasImg.src = 'assets/textures/tileset.png';

const jsonGameMap = getGameMapFromJson(mapData);
const jsonPlayer = getPlayerDataFromJson(mapData);
let gameMap = structuredClone(jsonGameMap);
let player = structuredClone(jsonPlayer);;

canvas.width = gameMap.width * 16;
canvas.height = gameMap.height * 16 + 16;

let winState;


function initGame() {
    gameMap = structuredClone(jsonGameMap);
    player = structuredClone(jsonPlayer);

    winState = false;
    alpha = 0.0;

    requestAnimationFrame(gameLoop);
}

function getGameMapFromJson(mapData) {
    const width = mapData.map.width;
    const height = mapData.map.height;
    const rowData = mapData.map.data.split(' ');

    const grid = [];

    for (let x = 0; x < width; x++) {
        grid[x] = [];
        for (let y = 0; y < height; y++) {
            grid[x][y] = rowData[y][x];
        }
    }

    const rowData2 = mapData.map.boxdata.split(' ');

    const grid2 = [];

    for (let x = 0; x < width; x++) {
        grid2[x] = [];
        for (let y = 0; y < height; y++) {
            grid2[x][y] = rowData2[y][x];
        }
    }

    return new GameMap(width, height, grid, grid2, mapData.map.holeamount);
}

function getPlayerDataFromJson(mapData) {
    return new Player(mapData.player.x, mapData.player.y);
}

function drawTexture(tileIndexX, tileIndexY, gridX, gridY) {
    if (!isAtlasLoaded) return;

    const sourceX = tileIndexX * 16;
    const sourceY = tileIndexY * 16;
    const sourceWidth = 16;
    const sourceHeight = 16;

    const destX = gridX * 16;
    const destY = gridY * 16 + 16;
    const destWidth = 16;
    const destHeight = 16;

    ctx.drawImage(
        atlasImg,
        sourceX, sourceY, sourceWidth, sourceHeight,
        destX, destY, destWidth, destHeight
    );
}

let lastTime = 0;
let accumulator = 0;

function gameLoop(timestamp) {
    if (resetFlag) {
        resetFlag = false;
        initGame();
        return;
    }

    if (!lastTime) lastTime = timestamp;
    let frameTime = timestamp - lastTime;
    lastTime = timestamp;

    if (frameTime > 250) frameTime = 250;

    accumulator += frameTime;

    while (accumulator >= TICK_TIME) {
        update();
        accumulator -= TICK_TIME;
    }

    render();

    requestAnimationFrame(gameLoop);
}


function update() {

    // if there is a movement input run movement
    if (bufferedInput) {
        let dx = 0;
        let dy = 0;

        switch (bufferedInput) {
            // movement system is down and right is positive 
            case 'w': dy--; break
            case 'arrowup': dy--; break;
            case 's': dy++; break;
            case 'arrowdown': dy++; break;
            case 'a': dx--; break;
            case 'arrowleft': dx--; break;
            case 'd': dx++; break;
            case 'arrowright': dx++; break;
        }
        movePlayer(dx, dy);

        if (gameMap.holeAmount == 0) {
            winState = true;
        }

        bufferedInput = null;
    }
}

function movePlayer(dx, dy) {
    const goalX = player.x + dx;
    const goalY = player.y + dy;

    // make sure the goal space is in bounds of the map
    if (isInBounds(goalX, goalY)) {
        const pieceAtGoalSpace = getPieceAtSpace(goalX, goalY);

        // if theres a box at the spot the player is trying to get at, see if the box can get moved and if it can then move there
        if (isBoxAtSpace(goalX, goalY)) {
            if (moveBox(goalX, goalY, dx, dy)) {
                setPlayerPos(goalX, goalY);
            }
        }
        // else if the player can pass the piece, move player
        else if (PLAYER_PASSABLE_PIECES.includes(pieceAtGoalSpace)) {
            setPlayerPos(goalX, goalY)
        }

    }

}

function moveBox(gridX, gridY, dx, dy) {
    const goalX = gridX + dx;
    const goalY = gridY + dy;

    if (isInBounds(goalX, goalY)) {
        const pieceAtGoalSpace = getPieceAtSpace(goalX, goalY);

        if (pieceAtGoalSpace === PIECE_TYPES.HOLE) {
            gameMap.boxGrid[gridX][gridY] = PIECE_TYPES.EMPTY;
            gameMap.grid[goalX][goalY] = PIECE_TYPES.HOLE_FILLED;
            gameMap.holeAmount--;
            console.log(gameMap.holeAmount);
            return true;
        }
        else if (BOX_PASSABLE_PIECES.includes(pieceAtGoalSpace) && !isBoxAtSpace(goalX, goalY)) {
            gameMap.boxGrid[gridX][gridY] = PIECE_TYPES.EMPTY;
            gameMap.boxGrid[goalX][goalY] = PIECE_TYPES.BOX;
            return true;
        }

    }


    return false;
}

function setPlayerPos(gridX, gridY) {
    if (gameMap.grid[player.x][player.y] === PIECE_TYPES.TEMP_FLOOR) {
        gameMap.grid[player.x][player.y] = PIECE_TYPES.NOTHING;
    }

    player.x = gridX;
    player.y = gridY;
}

function isInBounds(gridX, gridY) {
    return (gridX >= 0 && gridX < gameMap.width) && (gridY >= 0 && gridY < gameMap.height);
}

function getPieceAtSpace(gridX, gridY) {
    return gameMap.grid[gridX][gridY];
}

function isBoxAtSpace(gridX, gridY) {
    return gameMap.boxGrid[gridX][gridY] === 'b';
}

function render() {
    ctx.reset();
    drawFromMap();


    if (winState === true) {
        drawWin();
    }

    drawUI();
}

function drawUI() {

}

function drawFromMap() {


    for (let x = 0; x < gameMap.width; x++) {
        for (let y = 0; y < gameMap.height; y++) {
            let tx;
            let ty;


            switch (gameMap.grid[x][y]) {
                case '-': tx = 0; ty = 0; break;
                case 'w': tx = 5; ty = 2; drawTexture(tx, ty - 1, x, y - 1); break;
                case 'b': tx = 4; ty = 2; drawTexture(tx, ty - 1, x, y - 1); break;
                case 'h': tx = 1; ty = 1; break;
                case 'x': tx = 15; ty = 15; break;
                case 'f': tx = 2; ty = 1; break;
                case 't': tx = 0; ty = 1; break;
                case 'o': tx = 0; ty = 2; break;

            }
            drawTexture(tx, ty, x, y);

            if (player.x === x && player.y === y) drawPlayer();

            if (gameMap.boxGrid[x][y] === 'b') {
                tx = 4; ty = 2;
                drawTexture(tx, ty - 1, x, y - 1);
                drawTexture(tx, ty, x, y);
            }


        }
    }

}

function drawPlayer() {
    drawTexture(3, 1, player.x, player.y - 1);
    drawTexture(3, 2, player.x, player.y);
}

let alpha = 0.0;
const fadeSpeed = 0.01;

const winImage = new Image;
winImage.src = 'assets/textures/win1.png'

function drawWin() {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    if (alpha < 0.7) {
        alpha += fadeSpeed;
        if (alpha > 0.7) alpha = 0.7;
    }

    ctx.drawImage(winImage, 1, 17);

    ctx.restore();
}

initGame();

