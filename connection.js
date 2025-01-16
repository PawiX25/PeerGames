class ConnectionManager {
    constructor(gameManager) {
        this.peer = new Peer();
        this.connection = null;
        this.isHost = false;
        this.gameManager = gameManager;

        this.setupPeer();
        this.setupUI();
    }

    setupPeer() {
        this.peer.on('open', (id) => {
            document.getElementById('peer-id').innerHTML = 
                `Your ID: <span class="font-mono bg-gray-700 px-2 py-1 rounded">${id}</span>`;
        });

        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.isHost = true;
            this.setupConnection();
        });
    }

    setupUI() {
        document.getElementById('connect-btn').addEventListener('click', () => {
            const peerId = document.getElementById('connect-id').value;
            this.connection = this.peer.connect(peerId);
            this.isHost = false;
            this.setupConnection();
        });
    }

    setupConnection() {
        this.connection.on('open', () => {
            if (this.gameManager.selectedGame) {
                this.gameManager.startGame(this.gameManager.selectedGame);
            }

            this.sendMessage({
                type: 'connection-ready'
            });
        });

        this.connection.on('data', (data) => {
            if (data.type === 'connection-ready') {
                console.log('Connection established and ready');
            }
            if (this.gameManager) {
                this.gameManager.handleMessage(data);
            }
        });
    }

    sendMessage(message) {
        if (this.connection && this.connection.open) {
            this.connection.send(message);
        }
    }
}

new ConnectionManager();
