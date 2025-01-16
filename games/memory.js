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
        
        const gameContainer = document.createElement('div');
        gameContainer.classList.add('max-w-4xl', 'mx-auto', 'p-4');
        
        const scoreBoard = document.createElement('div');
        scoreBoard.classList.add('grid', 'grid-cols-2', 'gap-4', 'mb-6');
        
        const players = [
            { id: 0, name: 'Player 1', color: 'blue' },
            { id: 1, name: 'Player 2', color: 'red' }
        ];
        
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.classList.add(
                'p-4',
                'rounded-xl',
                'transition-all',
                'duration-300'
            );
            
            if (this.currentPlayerIndex === player.id) {
                playerCard.classList.add('bg-gray-700', 'shadow-lg', 'scale-105');
            } else {
                playerCard.classList.add('bg-gray-800/50');
            }
            
            playerCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="text-lg font-semibold">${player.name}</span>
                    <span class="text-2xl font-bold">${this.scores[player.id]}</span>
                </div>
            `;
            scoreBoard.appendChild(playerCard);
        });
        
        const turnIndicator = document.createElement('div');
        turnIndicator.id = 'turn-indicator';
        turnIndicator.className = 'text-center mb-6 text-xl font-semibold bg-gray-700/30 py-2 rounded-lg';
        
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
                'aspect-square',
                'cursor-pointer',
                'rounded-xl',
                'transition-all',
                'duration-300',
                'transform',
                'hover:scale-105'
            );
            
            if (card.revealed || card.matched) {
                cardDiv.classList.add('bg-gray-700');
                cardDiv.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center">
                        <i class="fas ${card.icon} ${card.color} text-4xl ${card.matched ? 'opacity-75' : ''}"></i>
                    </div>
                `;
            } else {
                cardDiv.classList.add('bg-gradient-to-br', 'from-gray-700', 'to-gray-800', 'shadow-lg');
                cardDiv.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center">
                        <div class="w-8 h-8 rounded-full bg-gray-600/50 flex items-center justify-center">
                            <span class="text-gray-400">?</span>
                        </div>
                    </div>
                `;
            }
            
            if (this.localPlayerIndex === this.currentPlayerIndex && !card.matched) {
                cardDiv.addEventListener('click', () => this.handleCardClick(index));
            }
            
            cardDiv.dataset.index = index;
            grid.appendChild(cardDiv);
        });
        
        gameContainer.appendChild(scoreBoard);
        gameContainer.appendChild(turnIndicator);
        gameContainer.appendChild(grid);
        this.boardElement.appendChild(gameContainer);
        
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
        
        const currentPlayer = this.currentPlayerIndex === 0 ? 'Player 1' : 'Player 2';
        turnIndicator.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <span class="text-gray-300">Current Turn:</span>
                <span class="font-bold">${currentPlayer}</span>
            </div>
        `;
    }

    cleanup() {
        this.boardElement.innerHTML = '';
        this.deck = [];
        this.scores = [0, 0];
        this.flippedCards = [];
        this.currentPlayerIndex = 0;
    }
}
