class GameManager {
    constructor() {
        this.connectionManager = null;
        this.currentGame = null;
        this.selectedGame = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameType = card.dataset.game;
                this.selectedGame = gameType;
                document.getElementById('game-selection').classList.add('hidden');
                document.getElementById('connection-section').classList.remove('hidden');
                if (!this.connectionManager) {
                    this.connectionManager = new ConnectionManager(this);
                }
            });
        });

        document.getElementById('leave-game').addEventListener('click', () => {
            this.leaveGame();
        });
    }

    startGame(gameType) {
        document.getElementById('connection-section').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');

        if (this.currentGame) {
            this.currentGame.cleanup();
            this.currentGame = null;
        }

        switch(gameType) {
            case 'tictactoe':
                this.currentGame = new TicTacToe(this);
                break;
            case 'chess':
                this.currentGame = new Chess(this);
                break;
            case 'connectfour':
                this.currentGame = new ConnectFour(this);
                break;
            case 'memory':
                this.currentGame = new Memory(this);
                break;
        }

        if (this.connectionManager.isHost) {
            this.connectionManager.sendMessage({
                type: 'game-start',
                game: gameType
            });
        } else {
            this.connectionManager.sendMessage({
                type: 'game-start-ack',
                game: gameType
            });
        }
    }

    handleMessage(message) {
        switch(message.type) {
            case 'game-start':
                this.startGame(message.game);
                break;
            case 'game-start-ack':
                if (this.currentGame) {
                    this.currentGame.initializeGame();
                }
                break;
            default:
                if (this.currentGame) {
                    this.currentGame.handleMessage(message);
                }
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

new GameManager();
