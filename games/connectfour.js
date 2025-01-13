class ConnectFour {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.board = Array(42).fill(null);
        this.isMyTurn = this.gameManager.connectionManager.isHost;
        this.color = this.gameManager.connectionManager.isHost ? 'red' : 'yellow';
        this.createBoard();
        this.updateStatus();
    }

    createBoard() {
        const board = document.getElementById('game-board');
        board.innerHTML = `
            <div class="text-center mb-4" id="game-status"></div>
            <div class="relative"> <!-- Add wrapper for absolute positioning -->
                <div class="grid grid-cols-7 gap-2 max-w-md mx-auto">
                    ${this.board.map((_, i) => `
                        <div class="relative aspect-square bg-gray-700 rounded-lg cursor-pointer 
                                  hover:bg-gray-600 transition-all duration-200" data-index="${i}">
                            <div class="piece absolute inset-2 rounded-full transform scale-0 
                                      transition-all duration-300"></div>
                        </div>
                    `).join('')}
                </div>
                <div id="animation-container" class="absolute inset-0 pointer-events-none"></div>
            </div>
        `;

        board.querySelectorAll('[data-index]').forEach(cell => {
            cell.addEventListener('click', () => {
                const index = parseInt(cell.dataset.index);
                const column = index % 7;
                this.makeMove(column);
            });
        });
    }

    makeMove(column) {
        if (!this.isMyTurn || this.checkWinner()) return;

        const row = this.getLowestEmptyRow(column);
        if (row === -1) return;

        const index = row * 7 + column;
        this.board[index] = this.color;
        this.animateDrop(row, column, this.color);

        this.gameManager.connectionManager.sendMessage({
            type: 'connect4-move',
            index: index
        });

        this.isMyTurn = false;
        this.updateStatus();
    }

    animateDrop(row, column, color) {
        const columnCells = Array.from(document.querySelectorAll(`[data-index]`))
            .filter(cell => parseInt(cell.dataset.index) % 7 === column);
        const finalCell = columnCells[row];
        const firstCell = columnCells[0];
        const container = document.getElementById('animation-container');

        const containerRect = container.getBoundingClientRect();
        const cellRect = firstCell.getBoundingClientRect();
        const finalCellRect = finalCell.getBoundingClientRect();
        const startY = cellRect.top - containerRect.top;
        const distance = finalCellRect.top - cellRect.top;

        const piece = document.createElement('div');
        piece.className = 'absolute w-[calc(100%-16px)] h-[calc(100%-16px)] rounded-full';
        piece.style.cssText = `
            background: radial-gradient(circle at 30% 30%, ${color} 0%, ${color} 50%, ${this.getLighterShade(color)} 51%, ${color} 100%);
            left: ${cellRect.left - containerRect.left + 8}px;
            top: ${startY + 8}px;
            width: ${cellRect.width - 16}px;
            height: ${cellRect.height - 16}px;
            transform-origin: center center;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.3);
            z-index: 30;
        `;

        container.appendChild(piece);

        const duration = Math.sqrt(distance) * 6; 
        const keyframes = [];
        const steps = 30; 
        const bounceHeight = 25; 

        for(let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const verticalOffset = distance * progress;

            const bounceEffect = row > 0 ? 
                Math.sin(progress * Math.PI) * bounceHeight * Math.pow(1 - progress, 1.5) : 0;

            keyframes.push({
                transform: `translateY(${verticalOffset - bounceEffect}px)`,
                offset: progress
            });
        }

        for(let i = 0; i < row; i++) {
            columnCells[i].animate([
                { transform: 'scale(1.1)', offset: 0.2 },
                { transform: 'scale(0.95)', offset: 0.4 },
                { transform: 'scale(1)', offset: 1 }
            ], {
                duration: 300, 
                delay: i * 80, 
                easing: 'ease-out'
            });
        }

        const animation = piece.animate(keyframes, {
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });

        animation.onfinish = () => {
            piece.remove();
            const finalPiece = finalCell.querySelector('.piece');
            finalPiece.style.transform = 'scale(1)';
            finalPiece.style.background = `radial-gradient(circle at 30% 30%, ${color} 0%, ${color} 50%, ${this.getLighterShade(color)} 51%, ${color} 100%)`;

            finalCell.animate([
                { transform: 'translateY(-8px) scale(1.1)', offset: 0 },
                { transform: 'translateY(3px) scale(0.95)', offset: 0.3 },
                { transform: 'translateY(-2px) scale(1.02)', offset: 0.6 },
                { transform: 'translateY(0) scale(1)', offset: 1 }
            ], {
                duration: 600, 
                easing: 'ease-out'
            });

            const ripple = document.createElement('div');
            ripple.className = 'absolute inset-0 bg-white/10 rounded-lg';
            ripple.style.animation = 'ripple 0.8s ease-out forwards'; 
            finalCell.appendChild(ripple);
            setTimeout(() => ripple.remove(), 800); 
        };
    }

    getLighterShade(color) {
        return color === 'red' ? '#ff6666' : '#ffeb99';
    }

    getLowestEmptyRow(column) {
        for (let row = 5; row >= 0; row--) {
            if (!this.board[row * 7 + column]) {
                return row;
            }
        }
        return -1;
    }

    handleMessage(message) {
        if (message.type === 'connect4-move') {
            const opponentColor = this.color === 'red' ? 'yellow' : 'red';
            this.board[message.index] = opponentColor;
            const row = Math.floor(message.index / 7);
            const column = message.index % 7;
            this.animateDrop(row, column, opponentColor);
            this.isMyTurn = true;
            this.updateStatus();
        }
    }

    updateBoard() {

    }

    checkWinner() {

        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 4; col++) {
                const index = row * 7 + col;
                if (this.board[index] &&
                    this.board[index] === this.board[index + 1] &&
                    this.board[index] === this.board[index + 2] &&
                    this.board[index] === this.board[index + 3]) {
                    this.highlightWinningCells([index, index + 1, index + 2, index + 3]);
                    return this.board[index];
                }
            }
        }

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 7; col++) {
                const index = row * 7 + col;
                if (this.board[index] &&
                    this.board[index] === this.board[index + 7] &&
                    this.board[index] === this.board[index + 14] &&
                    this.board[index] === this.board[index + 21]) {
                    this.highlightWinningCells([index, index + 7, index + 14, index + 21]);
                    return this.board[index];
                }
            }
        }

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 4; col++) {
                const index = row * 7 + col;
                if (this.board[index] &&
                    this.board[index] === this.board[index + 8] &&
                    this.board[index] === this.board[index + 16] &&
                    this.board[index] === this.board[index + 24]) {
                    this.highlightWinningCells([index, index + 8, index + 16, index + 24]);
                    return this.board[index];
                }
            }
        }

        for (let row = 0; row < 3; row++) {
            for (let col = 3; col < 7; col++) {
                const index = row * 7 + col;
                if (this.board[index] &&
                    this.board[index] === this.board[index + 6] &&
                    this.board[index] === this.board[index + 12] &&
                    this.board[index] === this.board[index + 18]) {
                    this.highlightWinningCells([index, index + 6, index + 12, index + 18]);
                    return this.board[index];
                }
            }
        }

        if (this.board.every(cell => cell !== null)) {
            return 'draw';
        }

        return null;
    }

    highlightWinningCells(indices) {
        indices.forEach(index => {
            const cell = document.querySelector(`[data-index="${index}"] .piece`);
            cell.style.transform = 'scale(1.1)';
            cell.style.boxShadow = '0 0 15px rgba(255,255,255,0.5)';
        });
    }

    updateStatus() {
        const status = document.getElementById('game-status');
        const winner = this.checkWinner();

        if (winner === 'draw') {
            status.textContent = "It's a draw!";
        } else if (winner) {
            status.textContent = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins!`;
        } else {
            status.textContent = this.isMyTurn ? "Your turn" : "Opponent's turn";
        }
    }

    cleanup() {

    }
}