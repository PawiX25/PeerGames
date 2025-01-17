class Snake {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 600;
        this.canvas.height = 600;
        this.canvas.classList.add('mx-auto', 'bg-gray-900', 'rounded-lg');

        this.gridSize = 20;
        this.cellSize = this.canvas.width / this.gridSize;

        this.snake1 = {
            body: [{x: 5, y: 10}],
            direction: 'right',
            color: '#3B82F6',
            score: 0
        };

        this.snake2 = {
            body: [{x: 15, y: 10}],
            direction: 'left',
            color: '#EF4444',
            score: 0
        };

        this.food = this.generateFood();
        this.gameOver = false;
        this.lastUpdate = Date.now();
        this.moveInterval = 150; 
        this.foodPulse = 0;
        this.glowIntensity = 0;
        this.gridOpacity = 0.1;

        this.createScoreBoard();
        this.initializeGame();
    }

    createScoreBoard() {
        const gameBoard = document.getElementById('game-board');
        const scoreBoard = document.createElement('div');
        scoreBoard.className = 'flex justify-between items-stretch gap-4 mb-6';
        scoreBoard.innerHTML = `
            <div class="flex-1 relative overflow-hidden bg-gradient-to-br from-blue-900/80 to-blue-600/50 rounded-xl border border-blue-500/30 shadow-lg backdrop-blur-sm">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50"></div>
                <div class="p-6">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <i class="fas fa-ghost text-2xl text-blue-400 transform rotate-90"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 text-transparent bg-clip-text">Blue Snake</h3>
                            <div class="flex items-baseline gap-2">
                                <span id="blue-score" class="text-4xl font-bold text-blue-400">0</span>
                                <span class="text-blue-300/70 text-sm">points</span>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4 flex items-center gap-2">
                        <i class="fas fa-ruler text-blue-400/60"></i>
                        <span class="text-blue-300/70">Length:</span>
                        <span id="blue-length" class="text-blue-300 font-medium">1</span>
                    </div>
                </div>
            </div>

            <div class="flex-1 relative overflow-hidden bg-gradient-to-br from-red-900/80 to-red-600/50 rounded-xl border border-red-500/30 shadow-lg backdrop-blur-sm">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-50"></div>
                <div class="p-6">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <i class="fas fa-ghost text-2xl text-red-400 transform rotate-90"></i>
                        </div>
                        <div>
                            <h3 class="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-200 text-transparent bg-clip-text">Red Snake</h3>
                            <div class="flex items-baseline gap-2">
                                <span id="red-score" class="text-4xl font-bold text-red-400">0</span>
                                <span class="text-red-300/70 text-sm">points</span>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4 flex items-center gap-2">
                        <i class="fas fa-ruler text-red-400/60"></i>
                        <span class="text-red-300/70">Length:</span>
                        <span id="red-length" class="text-red-300 font-medium">1</span>
                    </div>
                </div>
            </div>
        `;
        gameBoard.insertBefore(scoreBoard, gameBoard.firstChild);
    }

    initializeGame() {
        document.getElementById('game-board').appendChild(this.canvas);
        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            const mySnake = this.gameManager.connectionManager.isHost ? this.snake1 : this.snake2;
            let newDirection;

            switch(e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    newDirection = mySnake.direction !== 'down' ? 'up' : mySnake.direction;
                    break;
                case 'arrowdown':
                case 's':
                    newDirection = mySnake.direction !== 'up' ? 'down' : mySnake.direction;
                    break;
                case 'arrowleft':
                case 'a':
                    newDirection = mySnake.direction !== 'right' ? 'left' : mySnake.direction;
                    break;
                case 'arrowright':
                case 'd':
                    newDirection = mySnake.direction !== 'left' ? 'right' : mySnake.direction;
                    break;
            }

            if (newDirection && newDirection !== mySnake.direction) {
                if (this.gameManager.connectionManager.isHost) {
                    this.snake1.direction = newDirection;
                } else {
                    this.snake2.direction = newDirection;
                }

                this.gameManager.connectionManager.sendMessage({
                    type: 'snake-direction',
                    direction: newDirection
                });
            }
        });
    }

    generateFood() {
        let position;
        do {
            position = {
                x: Math.floor(Math.random() * this.gridSize),
                y: Math.floor(Math.random() * this.gridSize)
            };
        } while (this.isPositionOccupied(position));
        return position;
    }

    isPositionOccupied(position) {
        return this.snake1.body.some(segment => 
            segment.x === position.x && segment.y === position.y
        ) || this.snake2.body.some(segment => 
            segment.x === position.x && segment.y === position.y
        );
    }

    moveSnake(snake) {
        const head = {...snake.body[0]};

        switch(snake.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        if (head.x < 0 || head.x >= this.gridSize || 
            head.y < 0 || head.y >= this.gridSize) {
            this.gameOver = true;
            return false;
        }

        if (this.isPositionOccupied(head)) {
            this.gameOver = true;
            return false;
        }

        snake.body.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            snake.score++;
            this.food = this.generateFood();
            if (this.gameManager.connectionManager.isHost) {
                this.gameManager.connectionManager.sendMessage({
                    type: 'food-update',
                    food: this.food
                });
            }
            return true;
        }

        snake.body.pop();
        return true;
    }

    updateScores() {
        document.getElementById('blue-score').textContent = this.snake1.score;
        document.getElementById('red-score').textContent = this.snake2.score;
        document.getElementById('blue-length').textContent = this.snake1.body.length;
        document.getElementById('red-length').textContent = this.snake2.body.length;
    }

    update() {
        if (this.gameOver) return;

        const now = Date.now();
        if (now - this.lastUpdate < this.moveInterval) return;

        if (this.gameManager.connectionManager.isHost) {
            this.moveSnake(this.snake1);
            this.gameManager.connectionManager.sendMessage({
                type: 'game-state',
                snake1: this.snake1,
                snake2: this.snake2,
                food: this.food,
                gameOver: this.gameOver
            });
        } else {
            this.moveSnake(this.snake2);
            this.gameManager.connectionManager.sendMessage({
                type: 'snake-update',
                snake: this.snake2
            });
        }

        this.updateScores();
        this.lastUpdate = now;
    }

    draw() {

        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = `rgba(55, 65, 81, ${this.gridOpacity})`;
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                this.ctx.strokeRect(
                    i * this.cellSize, 
                    j * this.cellSize, 
                    this.cellSize, 
                    this.cellSize
                );
            }
        }

        this.drawSnake(this.snake1);
        this.drawSnake(this.snake2);

        this.foodPulse = (this.foodPulse + 0.1) % (Math.PI * 2);
        const foodSize = (Math.sin(this.foodPulse) * 0.2 + 0.8) * this.cellSize / 2;

        this.ctx.fillStyle = '#10B981';
        this.ctx.shadowColor = '#10B981';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(
            (this.food.x + 0.5) * this.cellSize,
            (this.food.y + 0.5) * this.cellSize,
            foodSize,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        if (this.gameOver) {

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 64px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.shadowColor = 'white';
            this.ctx.shadowBlur = 20;
            this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2 - 30);

            const winner = this.snake1.score > this.snake2.score ? 'Blue' : 
                          this.snake1.score < this.snake2.score ? 'Red' : 'Tie';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.fillStyle = winner === 'Blue' ? this.snake1.color : 
                                winner === 'Red' ? this.snake2.color : 'white';
            this.ctx.shadowColor = this.ctx.fillStyle;
            this.ctx.fillText(
                winner === 'Tie' ? 'It\'s a tie!' : `${winner} wins!`,
                this.canvas.width / 2,
                this.canvas.height / 2 + 40
            );
            this.ctx.shadowBlur = 0;
        }
    }

    drawSnake(snake) {
        snake.body.forEach((segment, index) => {
            const alpha = 1 - (index / snake.body.length * 0.6);
            this.ctx.fillStyle = this.hexToRGBA(snake.color, alpha);
            this.ctx.shadowColor = snake.color;
            this.ctx.shadowBlur = index === 0 ? 15 : 5;

            this.ctx.beginPath();
            this.ctx.roundRect(
                segment.x * this.cellSize,
                segment.y * this.cellSize,
                this.cellSize,
                this.cellSize,
                index === 0 ? 4 : 8
            );
            this.ctx.fill();

            if (index === 0) { 
                this.ctx.fillStyle = 'white';
                this.ctx.shadowColor = 'white';
                this.ctx.shadowBlur = 5;
                const eyeSize = this.cellSize / 5;

                switch(snake.direction) {
                    case 'right':
                        this.ctx.fillRect(
                            (segment.x + 0.8) * this.cellSize, 
                            (segment.y + 0.2) * this.cellSize, 
                            eyeSize, 
                            eyeSize
                        );
                        this.ctx.fillRect(
                            (segment.x + 0.8) * this.cellSize,
                            (segment.y + 0.6) * this.cellSize,
                            eyeSize,
                            eyeSize
                        );
                        break;
                    case 'left':
                        this.ctx.fillRect(
                            (segment.x + 0.1) * this.cellSize,
                            (segment.y + 0.2) * this.cellSize,
                            eyeSize,
                            eyeSize
                        );
                        this.ctx.fillRect(
                            (segment.x + 0.1) * this.cellSize,
                            (segment.y + 0.6) * this.cellSize,
                            eyeSize,
                            eyeSize
                        );
                        break;
                    case 'up':
                        this.ctx.fillRect(
                            (segment.x + 0.2) * this.cellSize,
                            (segment.y + 0.1) * this.cellSize,
                            eyeSize,
                            eyeSize
                        );
                        this.ctx.fillRect(
                            (segment.x + 0.6) * this.cellSize,
                            (segment.y + 0.1) * this.cellSize,
                            eyeSize,
                            eyeSize
                        );
                        break;
                    case 'down':
                        this.ctx.fillRect(
                            (segment.x + 0.2) * this.cellSize,
                            (segment.y + 0.8) * this.cellSize,
                            eyeSize,
                            eyeSize
                        );
                        this.ctx.fillRect(
                            (segment.x + 0.6) * this.cellSize,
                            (segment.y + 0.8) * this.cellSize,
                            eyeSize,
                            eyeSize
                        );
                        break;
                }
            }
        });
        this.ctx.shadowBlur = 0;
    }

    hexToRGBA(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    gameLoop = () => {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }

    handleMessage(message) {
        switch(message.type) {
            case 'snake-direction':
                if (this.gameManager.connectionManager.isHost) {
                    this.snake2.direction = message.direction;
                } else {
                    this.snake1.direction = message.direction;
                }
                break;

            case 'snake-update':
                if (this.gameManager.connectionManager.isHost) {
                    this.snake2 = message.snake;
                }
                break;

            case 'game-state':
                if (!this.gameManager.connectionManager.isHost) {
                    this.snake1 = message.snake1;
                    this.snake2 = message.snake2;
                    this.food = message.food;
                    this.gameOver = message.gameOver;
                }
                break;

            case 'food-update':
                if (!this.gameManager.connectionManager.isHost) {
                    this.food = message.food;
                }
                break;
        }
    }

    cleanup() {
        window.removeEventListener('keydown', this.handleKeyPress);
        this.canvas.remove();
    }
}