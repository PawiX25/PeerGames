class GameManager {
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
        this.currentGame = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameType = card.dataset.game;
                this.startGame(gameType);
            });
        });

        document.getElementById('leave-game').addEventListener('click', () => {
            this.leaveGame();
        });
    }

    startGame(gameType) {
        document.getElementById('game-selection').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');

        switch(gameType) {
            case 'tictactoe':
                this.currentGame = new TicTacToe(this);
                break;
            case 'chess':
                this.currentGame = new Chess(this);
                break;
        }

        if (this.connectionManager.isHost) {
            this.connectionManager.sendMessage({
                type: 'game-start',
                game: gameType
            });
        }
    }

    handleMessage(message) {
        if (message.type === 'game-start') {
            this.startGame(message.game);
            return;
        }

        if (this.currentGame) {
            this.currentGame.handleMessage(message);
        }
    }

    leaveGame() {
        if (this.currentGame) {
            this.currentGame.cleanup();
            this.currentGame = null;
        }

        document.getElementById('game-container').classList.add('hidden');
        document.getElementById('game-selection').classList.remove('hidden');
        document.getElementById('game-board').innerHTML = '';
    }
}
