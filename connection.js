class ConnectionManager {
    constructor() {
        this.peer = new Peer();
        this.connection = null;
        this.isHost = false;
        this.gameManager = null;

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
            document.getElementById('connection-section').classList.add('hidden');
            document.getElementById('game-selection').classList.remove('hidden');
            
            if (!this.gameManager) {
                this.gameManager = new GameManager(this);
            }
        });

        this.connection.on('data', (data) => {
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
