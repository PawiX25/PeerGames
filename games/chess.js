class Chess {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.board = this.createInitialBoard();
        this.selectedPiece = null;
        this.isMyTurn = this.gameManager.connectionManager.isHost;
        this.isWhite = this.gameManager.connectionManager.isHost;
        this.createBoard();
        this.updateStatus();
        this.possibleMoves = [];
        this.gameOver = false;
    }

    createInitialBoard() {
        const board = Array(64).fill(null);
        for (let i = 48; i < 56; i++) board[i] = 'wp';
        for (let i = 8; i < 16; i++) board[i] = 'bp';

        const pieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
        pieces.forEach((piece, i) => {
            board[i + 56] = 'w' + piece;
            board[i] = 'b' + piece;
        });

        return board;
    }

    createBoard() {
        const board = document.getElementById('game-board');
        const squares = [];
        
        for (let i = 0; i < 64; i++) {
            const displayIndex = this.isWhite ? i : 63 - i;
            const piece = this.board[displayIndex];
            const row = Math.floor(i / 8);
            const col = i % 8;
            
            squares.push(`
                <div class="aspect-square ${(row + col) % 2 === 0 ? 'bg-gray-400' : 'bg-gray-600'}
                          flex items-center justify-center text-2xl cursor-pointer hover:opacity-75"
                     data-index="${displayIndex}">
                    ${this.getPieceIcon(piece)}
                </div>
            `);
        }

        board.innerHTML = `
            <div class="text-center mb-4" id="game-status"></div>
            <div class="grid grid-cols-8 gap-1 max-w-md mx-auto">
                ${squares.join('')}
            </div>
        `;

        board.querySelectorAll('[data-index]').forEach(cell => {
            cell.addEventListener('click', () => this.handleCellClick(parseInt(cell.dataset.index)));
        });
    }

    handleCellClick(index) {
        if (this.gameOver || !this.isMyTurn) return;

        const piece = this.board[index];
        
        if (this.selectedPiece === index) {
            this.selectedPiece = null;
            this.clearHighlights();
            return;
        }

        if (this.selectedPiece !== null) {
            if (this.possibleMoves.includes(index)) {
                this.makeMove(this.selectedPiece, index);
                return;
            }
            this.clearHighlights();
        }

        if (piece && this.isPieceOwnedByCurrentPlayer(piece)) {
            this.selectedPiece = index;
            this.possibleMoves = this.calculatePossibleMoves(index);
            this.highlightPossibleMoves();
        }
    }

    isPieceOwnedByCurrentPlayer(piece) {
        return piece && ((this.isWhite && piece[0] === 'w') || (!this.isWhite && piece[0] === 'b'));
    }

    makeMove(from, to) {
        const piece = this.board[from];
        const capturedPiece = this.board[to];

        this.board[to] = piece;
        this.board[from] = null;

        this.selectedPiece = null;
        this.clearHighlights();

        this.gameManager.connectionManager.sendMessage({
            type: 'chess-move',
            from: from,
            to: to
        });

        this.isMyTurn = false;
        this.updateStatus();
        this.createBoard();
    }

    handleMessage(message) {
        if (message.type === 'chess-move') {
            this.board[message.to] = this.board[message.from];
            this.board[message.from] = null;
            this.isMyTurn = true;
            this.updateStatus();
            this.createBoard();
        }
    }

    calculatePossibleMoves(index) {
        const piece = this.board[index];
        if (!piece) return [];

        const moves = [];
        const [color, type] = [piece[0], piece[1]];
        const row = Math.floor(index / 8);
        const col = index % 8;

        switch (type) {
            case 'p':
                const direction = color === 'w' ? -1 : 1;
                const startRow = color === 'w' ? 6 : 1;

                if (!this.board[index + direction * 8]) {
                    moves.push(index + direction * 8);
                    if (row === startRow && !this.board[index + direction * 16]) {
                        moves.push(index + direction * 16);
                    }
                }

                const captures = [index + direction * 8 - 1, index + direction * 8 + 1];
                captures.forEach(captureIndex => {
                    if (captureIndex >= 0 && captureIndex < 64) {
                        const captureCol = captureIndex % 8;
                        if (Math.abs(captureCol - col) === 1) {
                            const targetPiece = this.board[captureIndex];
                            if (targetPiece && targetPiece[0] !== color) {
                                moves.push(captureIndex);
                            }
                        }
                    }
                });
                break;

            case 'r':
                this.addStraightMoves(moves, index, color);
                break;

            case 'n':
                const knightMoves = [
                    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                    [1, -2], [1, 2], [2, -1], [2, 1]
                ];
                knightMoves.forEach(([dRow, dCol]) => {
                    const newRow = row + dRow;
                    const newCol = col + dCol;
                    const newIndex = newRow * 8 + newCol;
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        const targetPiece = this.board[newIndex];
                        if (!targetPiece || targetPiece[0] !== color) {
                            moves.push(newIndex);
                        }
                    }
                });
                break;

            case 'b':
                this.addDiagonalMoves(moves, index, color);
                break;

            case 'q':
                this.addStraightMoves(moves, index, color);
                this.addDiagonalMoves(moves, index, color);
                break;

            case 'k':
                const kingMoves = [
                    [-1, -1], [-1, 0], [-1, 1],
                    [0, -1], [0, 1],
                    [1, -1], [1, 0], [1, 1]
                ];
                kingMoves.forEach(([dRow, dCol]) => {
                    const newRow = row + dRow;
                    const newCol = col + dCol;
                    const newIndex = newRow * 8 + newCol;
                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        const targetPiece = this.board[newIndex];
                        if (!targetPiece || targetPiece[0] !== color) {
                            moves.push(newIndex);
                        }
                    }
                });
                break;
        }

        return moves;
    }

    addStraightMoves(moves, index, color) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        this.addMovesInDirections(moves, index, color, directions);
    }

    addDiagonalMoves(moves, index, color) {
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        this.addMovesInDirections(moves, index, color, directions);
    }

    addMovesInDirections(moves, index, color, directions) {
        const row = Math.floor(index / 8);
        const col = index % 8;

        directions.forEach(([dRow, dCol]) => {
            let newRow = row + dRow;
            let newCol = col + dCol;
            while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                const newIndex = newRow * 8 + newCol;
                const targetPiece = this.board[newIndex];
                if (!targetPiece) {
                    moves.push(newIndex);
                } else {
                    if (targetPiece[0] !== color) {
                        moves.push(newIndex);
                    }
                    break;
                }
                newRow += dRow;
                newCol += dCol;
            }
        });
    }

    highlightPossibleMoves() {
        const cells = document.querySelectorAll('[data-index]');
        this.possibleMoves.forEach(index => {
            const cell = Array.from(cells).find(cell => 
                parseInt(cell.dataset.index) === index
            );
            if (cell) {
                cell.classList.add('bg-yellow-500/50');
            }
        });
    }

    clearHighlights() {
        const cells = document.querySelectorAll('[data-index]');
        cells.forEach(cell => {
            cell.classList.remove('bg-yellow-500/50');
        });
        this.possibleMoves = [];
    }

    getPieceIcon(piece) {
        if (!piece) return '';
        const color = piece[0] === 'w' ? 'text-white' : 'text-black';
        const icons = {
            'p': 'chess-pawn',
            'r': 'chess-rook',
            'n': 'chess-knight',
            'b': 'chess-bishop',
            'q': 'chess-queen',
            'k': 'chess-king'
        };
        return `<i class="fas fa-${icons[piece[1]]} ${color}"></i>`;
    }

    updateStatus() {
        const status = document.getElementById('game-status');
        if (this.gameOver) {
            status.textContent = 'Game Over!';
        } else {
            status.textContent = this.isMyTurn ? 'Your turn' : "Opponent's turn";
        }
    }

    cleanup() {
        this.clearHighlights();
    }
}
