class TicTacToe {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.board = Array(9).fill(null);
        this.isMyTurn = this.gameManager.connectionManager.isHost;
        this.symbol = this.gameManager.connectionManager.isHost ? 'X' : 'O';
        this.createBoard();
        this.updateStatus();
    }

    createBoard() {
        const board = document.getElementById('game-board');
        board.innerHTML = `
            <div class="text-center mb-4" id="game-status"></div>
            <div class="grid grid-cols-3 gap-2 max-w-md mx-auto">
                ${this.board.map((_, i) => `
                    <div class="aspect-square bg-gray-700 rounded-lg flex items-center justify-center 
                              text-4xl font-bold cursor-pointer hover:bg-gray-600" data-index="${i}">
                    </div>
                `).join('')}
            </div>
        `;

        board.querySelectorAll('[data-index]').forEach(cell => {
            cell.addEventListener('click', () => this.makeMove(parseInt(cell.dataset.index)));
        });
    }

    makeMove(index) {
        if (!this.isMyTurn || this.board[index] || this.checkWinner()) return;

        this.board[index] = this.symbol;
        this.updateBoard();
        this.gameManager.connectionManager.sendMessage({
            type: 'move',
            index: index
        });
        this.isMyTurn = false;
        this.updateStatus();
    }

    handleMessage(message) {
        if (message.type === 'move') {
            this.board[message.index] = this.symbol === 'X' ? 'O' : 'X';
            this.updateBoard();
            this.isMyTurn = true;
            this.updateStatus();
        }
    }

    updateBoard() {
        this.board.forEach((value, i) => {
            const cell = document.querySelector(`[data-index="${i}"]`);
            cell.textContent = value;
            if (value === 'X') {
                cell.classList.add('text-blue-500');
            } else if (value === 'O') {
                cell.classList.add('text-red-500');
            }
        });
    }

    checkWinner() {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        for (let line of lines) {
            const [a, b, c] = line;
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return this.board[a];
            }
        }

        if (this.board.every(cell => cell !== null)) {
            return 'draw';
        }

        return null;
    }

    updateStatus() {
        const status = document.getElementById('game-status');
        const winner = this.checkWinner();

        if (winner === 'draw') {
            status.textContent = "It's a draw!";
        } else if (winner) {
            status.textContent = `Player ${winner} wins!`;
        } else {
            status.textContent = this.isMyTurn ? "Your turn" : "Opponent's turn";
        }
    }

    cleanup() {
    }
}
