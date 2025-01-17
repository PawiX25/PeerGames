class Pong {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 400;
        this.canvas.classList.add('mx-auto', 'bg-gray-900', 'rounded-lg');
        
        this.ball = { x: 400, y: 200, dx: 2, dy: 2, radius: 8 };
        this.paddleHeight = 80;
        this.paddleWidth = 10;
        this.leftPaddle = { y: 160, score: 0 };
        this.rightPaddle = { y: 160, score: 0 };
        
        this.keys = { up: false, down: false };

        this.lastUpdate = Date.now();
        this.gameState = {
            ball: this.ball,
            leftPaddle: this.leftPaddle,
            rightPaddle: this.rightPaddle,
            timestamp: Date.now()
        };

        this.paddleSpeed = 0;
        this.maxPaddleSpeed = 8;
        this.paddleAcceleration = 0.8;
        this.paddleDrag = 0.85;
        
        this.targetPaddleY = this.gameManager.connectionManager.isHost 
            ? this.leftPaddle.y 
            : this.rightPaddle.y;

        this.initializeGame();
    }

    initializeGame() {
        document.getElementById('game-board').appendChild(this.canvas);
        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => this.handleKeyPress(e, true));
        window.addEventListener('keyup',   (e) => this.handleKeyPress(e, false));
    }

    handleKeyPress(e, value) {
        if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) {
            if (e.key === 'ArrowUp' || e.key === 'w') {
                this.keys.up = value;
            } else if (e.key === 'ArrowDown' || e.key === 's') {
                this.keys.down = value;
            }

            if (this.gameManager.connectionManager) {
                this.gameManager.connectionManager.sendMessage({
                    type: 'paddle-move',
                    key: e.key,
                    value: value
                });
            }
        }
    }

    updatePaddles() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 16;

        if (this.keys.up) {
            this.paddleSpeed -= this.paddleAcceleration * deltaTime;
        } else if (this.keys.down) {
            this.paddleSpeed += this.paddleAcceleration * deltaTime;
        } else {
            this.paddleSpeed *= this.paddleDrag;
        }

        this.paddleSpeed = Math.max(
            Math.min(this.paddleSpeed, this.maxPaddleSpeed), 
            -this.maxPaddleSpeed
        );

        this.targetPaddleY += this.paddleSpeed * deltaTime;
        this.targetPaddleY = Math.max(
            0, 
            Math.min(this.targetPaddleY, this.canvas.height - this.paddleHeight)
        );

        const paddleToUpdate = this.gameManager.connectionManager.isHost
            ? this.leftPaddle
            : this.rightPaddle;
        
        paddleToUpdate.y += (this.targetPaddleY - paddleToUpdate.y) * 0.2 * deltaTime;

        if (Math.abs(this.targetPaddleY - paddleToUpdate.y) > 0.01) {
            this.gameManager.connectionManager.sendMessage({
                type: 'paddle-position',
                y: paddleToUpdate.y,
                speed: this.paddleSpeed,
                timestamp: now
            });
        }

        this.lastUpdate = now;
    }

    updateBall() {
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        if (this.ball.y <= 0 || this.ball.y >= this.canvas.height) {
            this.ball.dy *= -1;
        }

        if (
            this.ball.dx < 0 && 
            this.ball.x <= this.paddleWidth && 
            this.ball.y >= this.leftPaddle.y && 
            this.ball.y <= this.leftPaddle.y + this.paddleHeight
        ) {
            const relativeImpact = ((this.ball.y - this.leftPaddle.y) / this.paddleHeight) * 2 - 1;
            this.ball.dy += relativeImpact * 2;
            this.ball.dx *= -1.02;
            this.ball.dy += this.paddleSpeed * 0.2;
        }

        if (
            this.ball.dx > 0 && 
            this.ball.x >= this.canvas.width - this.paddleWidth &&
            this.ball.y >= this.rightPaddle.y && 
            this.ball.y <= this.rightPaddle.y + this.paddleHeight
        ) {
            const relativeImpact = ((this.ball.y - this.rightPaddle.y) / this.paddleHeight) * 2 - 1;
            this.ball.dy += relativeImpact * 2;
            this.ball.dx *= -1.02;
            this.ball.dy += this.paddleSpeed * 0.2;
        }

        const maxSpeed = 15;
        const currentSpeed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
        if (currentSpeed > maxSpeed) {
            const scale = maxSpeed / currentSpeed;
            this.ball.dx *= scale;
            this.ball.dy *= scale;
        }

        if (this.ball.x <= 0) {
            this.rightPaddle.score++;
            this.resetBall();
        } else if (this.ball.x >= this.canvas.width) {
            this.leftPaddle.score++;
            this.resetBall();
        }
    }

    updateGameState() {
        if (!this.gameManager.connectionManager.isHost) return;

        this.updateBall();
        this.gameState = {
            ball: this.ball,
            leftPaddle: this.leftPaddle,
            rightPaddle: this.rightPaddle,
            timestamp: Date.now()
        };

        this.gameManager.connectionManager.sendMessage({
            type: 'game-state',
            state: this.gameState
        });
    }

    resetBall() {
        this.ball = { 
            x: this.canvas.width / 2, 
            y: this.canvas.height / 2, 
            dx: (Math.random() > 0.5 ? 2 : -2),
            dy: (Math.random() * 3 - 1.5),
            radius: 8 
        };
    }

    draw() {
        this.ctx.fillStyle = '#111827';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#374151';
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = '#9CA3AF';
        this.ctx.font = '48px Arial';
        this.ctx.fillText(this.leftPaddle.score, this.canvas.width / 4, 50);
        this.ctx.fillText(this.rightPaddle.score, (3 * this.canvas.width) / 4, 50);

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, this.leftPaddle.y, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(
            this.canvas.width - this.paddleWidth, 
            this.rightPaddle.y, 
            this.paddleWidth, 
            this.paddleHeight
        );

        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fill();
        this.ctx.closePath();
    }

    gameLoop = () => {
        this.updatePaddles();
        
        if (this.gameManager.connectionManager.isHost) {
            this.updateGameState();
        }

        if (!this.gameManager.connectionManager.isHost && this.gameState) {
            const timeDiff = Date.now() - this.gameState.timestamp;
            const interpolation = Math.min(1, timeDiff / 16);
            
            this.ball.x = this.gameState.ball.x + (this.gameState.ball.dx * interpolation);
            this.ball.y = this.gameState.ball.y + (this.gameState.ball.dy * interpolation);
        }

        this.draw();
        requestAnimationFrame(this.gameLoop);
    }

    handleMessage(message) {
        switch(message.type) {
            case 'paddle-position':
                const paddleToUpdate = this.gameManager.connectionManager.isHost
                    ? this.rightPaddle
                    : this.leftPaddle;
                
                const timeDiff = Date.now() - message.timestamp;
                const predictedY = message.y + (message.speed * (timeDiff / 16));
                paddleToUpdate.y += (predictedY - paddleToUpdate.y) * 0.3;
                break;

            case 'game-state':
                if (!this.gameManager.connectionManager.isHost) {
                    if (!this.gameState || message.state.timestamp > this.gameState.timestamp) {
                        this.gameState = message.state;
                        this.ball = { ...message.state.ball };
                        this.leftPaddle = { ...message.state.leftPaddle };
                        this.rightPaddle = { ...message.state.rightPaddle };
                    }
                }
                break;
        }
    }

    cleanup() {
        window.removeEventListener('keydown', this.handleKeyPress);
        window.removeEventListener('keyup', this.handleKeyPress);
        this.canvas.remove();
    }
}
