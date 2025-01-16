class Memory {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.connectionManager = gameManager.connectionManager;
        this.boardElement = document.getElementById('game-board');
        this.localPlayerIndex = this.connectionManager.isHost ? 0 : 1;
        this.currentPlayerIndex = 0;
        this.cardsData = [
            { icon: 'fa-heart', color: 'text-red-500' },
            { icon: 'fa-star', color: 'text-yellow-400' },
            { icon: 'fa-leaf', color: 'text-green-500' },
            { icon: 'fa-moon', color: 'text-purple-400' },
            { icon: 'fa-bomb', color: 'text-gray-500' },
            { icon: 'fa-ghost', color: 'text-indigo-400' },
            { icon: 'fa-cat', color: 'text-pink-400' },
            { icon: 'fa-fish', color: 'text-blue-400' },
        ];
        this.deck = [];
        this.scores = [0, 0];
        this.flippedCards = [];
    }

    initializeGame() {
        if (this.localPlayerIndex === 0) {
            this.setupDeck();
            const payload = {
                type: 'memory-init',
                deck: this.deck
            };
            this.connectionManager.sendMessage(payload);
        }
        if (this.localPlayerIndex === 0) {
            this.render();
        }
        this.updateUI();
    }

    setupDeck() {
        let fullData = [];
        this.cardsData.forEach(card => {
            fullData.push({...card});
            fullData.push({...card});
        });
        for (let i = fullData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [fullData[i], fullData[j]] = [fullData[j], fullData[i]];
        }
        this.deck = fullData.map(card => {
            return {
                icon: card.icon,
                color: card.color,
                revealed: false,
                matched: false
            };
        });
    }

    render() {
        this.boardElement.innerHTML = '';
        const scoreBoard = document.createElement('div');
        scoreBoard.classList.add('flex', 'justify-center', 'items-center', 'mb-4', 'gap-8');
        const scoreP1 = document.createElement('div');
        scoreP1.id = 'score-p0';
        scoreP1.className = 'p-2 bg-gray-700/50 rounded';
        scoreP1.innerText = `Player 1: ${this.scores[0]}`;
        const scoreP2 = document.createElement('div');
        scoreP2.id = 'score-p1';
        scoreP2.className = 'p-2 bg-gray-700/50 rounded';
        scoreP2.innerText = `Player 2: ${this.scores[1]}`;
        scoreBoard.appendChild(scoreP1);
        scoreBoard.appendChild(scoreP2);
        this.boardElement.appendChild(scoreBoard);
        const turnIndicator = document.createElement('div');
        turnIndicator.id = 'turn-indicator';
        turnIndicator.className = 'text-center mb-4';
        this.boardElement.appendChild(turnIndicator);
        const grid = document.createElement('div');
        grid.classList.add(
            'grid', 
            'grid-cols-4', 
            'gap-4', 
            'justify-center', 
            'items-center'
        );
        this.deck.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add(
                'cursor-pointer',
                'bg-gray-700',
                'p-4',
                'rounded-lg',
                'flex',
                'items-center',
                'justify-center',
                'transition-all',
                'relative'
            );
            cardDiv.style.height = '100px';
            cardDiv.dataset.index = index;
            if (card.revealed || card.matched) {
                cardDiv.innerHTML = `
                    <i class="fas ${card.icon} ${card.color} text-3xl"></i>
                `;
            } else {
                cardDiv.innerHTML = `<span class="text-xl text-gray-400">?</span>`;
            }
            if (this.localPlayerIndex === this.currentPlayerIndex && !card.matched) {
                cardDiv.addEventListener('click', () => this.handleCardClick(index));
            }
            grid.appendChild(cardDiv);
        });
        this.boardElement.appendChild(grid);
        this.updateUI(); 
    }

    handleCardClick(index) {
        if (this.deck[index].revealed || this.deck[index].matched) return;
        if (this.flippedCards.length === 2) return;
        this.flipCard(index);
        this.connectionManager.sendMessage({
            type: 'memory-flip',
            index
        });
        if (this.flippedCards.length === 2) {
            setTimeout(() => {
                this.checkMatch();
            }, 800);
        }
    }

    flipCard(index) {
        this.deck[index].revealed = true;
        this.flippedCards.push(index);
        this.render();
    }

    checkMatch() {
        const [i1, i2] = this.flippedCards;
        const card1 = this.deck[i1];
        const card2 = this.deck[i2];
        if (card1.icon === card2.icon && card1.color === card2.color) {
            card1.matched = true;
            card2.matched = true;
            this.scores[this.currentPlayerIndex] += 1;
            this.connectionManager.sendMessage({
                type: 'memory-match',
                indices: [i1, i2],
                scoringPlayer: this.currentPlayerIndex
            });
        } else {
            card1.revealed = false;
            card2.revealed = false;
            this.currentPlayerIndex = this.currentPlayerIndex === 0 ? 1 : 0;
            this.connectionManager.sendMessage({
                type: 'memory-mismatch',
                indices: [i1, i2],
                nextPlayer: this.currentPlayerIndex
            });
        }
        this.flippedCards = [];
        this.render();
        this.checkGameEnd();
    }

    checkGameEnd() {
        const allMatched = this.deck.every(card => card.matched);
        if (allMatched) {
            let winnerText = '';
            if (this.scores[0] > this.scores[1]) {
                winnerText = 'Player 1 wins!';
            } else if (this.scores[1] > this.scores[0]) {
                winnerText = 'Player 2 wins!';
            } else {
                winnerText = 'It\'s a tie!';
            }
            alert(`Game Over! ${winnerText}`);
        }
    }

    handleMessage(message) {
        switch (message.type) {
            case 'memory-init':
                this.deck = message.deck;
                this.render();
                break;
            case 'memory-flip':
                this.flipCard(message.index);
                if (this.flippedCards.length === 2) {
                    setTimeout(() => {
                        this.checkMatch();
                    }, 800);
                }
                break;
            case 'memory-match':
                {
                    const [i1, i2] = message.indices;
                    this.deck[i1].matched = true;
                    this.deck[i2].matched = true;
                    this.scores[message.scoringPlayer] += 1;
                    this.flippedCards = [];
                    this.render();
                    this.checkGameEnd();
                }
                break;
            case 'memory-mismatch':
                {
                    const [i1, i2] = message.indices;
                    this.deck[i1].revealed = false;
                    this.deck[i2].revealed = false;
                    this.currentPlayerIndex = message.nextPlayer;
                    this.flippedCards = [];
                    this.render();
                }
                break;
            default:
                break;
        }
    }

    updateUI() {
        const turnIndicator = document.getElementById('turn-indicator');
        if (!turnIndicator) return;
        if (this.currentPlayerIndex === 0) {
            turnIndicator.innerText = 'Player 1\'s Turn';
        } else {
            turnIndicator.innerText = 'Player 2\'s Turn';
        }
        const scoreP0 = document.getElementById('score-p0');
        const scoreP1 = document.getElementById('score-p1');
        if (scoreP0) {
            scoreP0.innerText = `Player 1: ${this.scores[0]}`;
        }
        if (scoreP1) {
            scoreP1.innerText = `Player 2: ${this.scores[1]}`;
        }
    }

    cleanup() {
        this.boardElement.innerHTML = '';
        this.deck = [];
        this.scores = [0, 0];
        this.flippedCards = [];
        this.currentPlayerIndex = 0;
    }
}
