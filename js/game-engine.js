export function startGame() {
    if (this.selectedSetupPlayers.length !== 4) return;

    const players = this.selectedSetupPlayers.map((p, idx) => ({
        id: p.id,
        name: p.name,
        photo: p.photo,
        gameIndex: idx
    }));

    const playedContracts = {};
    players.forEach(p => {
        playedContracts[p.gameIndex] = {
            [this.CONTRACT_KEYS.BARBU]: null,
            [this.CONTRACT_KEYS.DAMES]: null,
            [this.CONTRACT_KEYS.PLIS]: null,
            [this.CONTRACT_KEYS.COEURS]: null,
            [this.CONTRACT_KEYS.LAST_TRICK]: null,
            [this.CONTRACT_KEYS.SALAD]: null,
            [this.CONTRACT_KEYS.REUSSITE]: null
        };
    });

    this.activeGame = {
        players,
        scores: [0, 0, 0, 0],
        roundsPlayed: 0,
        currentDealerIndex: 0,
        playedContracts,
        activeRound: null,
        roundHistory: [],
        startDate: new Date().toISOString()
    };

    this.saveActiveGame();
    this.showResumeButton(true);
    this.navigate('game');
}

export function loadActiveGame() {
    const saved = localStorage.getItem('barbu_active_game');
    if (saved) {
        this.activeGame = JSON.parse(saved);
        if (this.activeGame && !this.activeGame.roundHistory) {
            this.activeGame.roundHistory = [];
        }
    }
}

export function saveActiveGame() {
    if (this.activeGame) {
        localStorage.setItem('barbu_active_game', JSON.stringify(this.activeGame));
    } else {
        localStorage.removeItem('barbu_active_game');
    }
}

export function resumeGame() {
    if (this.activeGame) {
        this.navigate('game');
    }
}

export function showResumeButton(show) {
    const btn = document.getElementById('resume-game-btn');
    btn.classList.toggle('hidden', !show);
}

export function confirmQuitGame() {
    this.showConfirmModal(
        "Quitter la partie",
        "Voulez-vous vraiment quitter la partie en cours ? Votre progression sera perdue.",
        () => {
            this.activeGame = null;
            this.saveActiveGame();
            this.showResumeButton(false);
            this.navigate('home');
        }
    );
}

export async function endGame() {
    if (!this.activeGame) return;

    const finalResults = this.activeGame.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        photo: p.photo,
        score: this.activeGame.scores[i],
        gameIndex: p.gameIndex
    })).sort((a, b) => b.score - a.score);

    const historyItem = {
        id: Date.now(),
        date: this.activeGame.startDate,
        endDate: new Date().toISOString(),
        players: this.activeGame.players.map(p => ({
            id: p.id,
            name: p.name,
            photo: p.photo,
            score: this.activeGame.scores[p.gameIndex]
        })),
        winnerId: finalResults[0].id,
        playedContracts: this.activeGame.playedContracts
    };

    const history = JSON.parse(localStorage.getItem('barbu_history') || '[]');
    history.unshift(historyItem);
    localStorage.setItem('barbu_history', JSON.stringify(history));

    for (const p of this.activeGame.players) {
        await this.updatePlayerStats(p.id, p.id === finalResults[0].id);
    }

    this.activeGame = null;
    this.saveActiveGame();
    this.showResumeButton(false);

    this.renderGameOverScreen(finalResults, historyItem);
    this.navigate('game-over');
    this.updateStatsOverview();
}

export function recalculateGameScores() {
    if (!this.activeGame || !this.activeGame.roundHistory) return;

    this.activeGame.scores = [0, 0, 0, 0];

    this.activeGame.players.forEach(p => {
        this.activeGame.playedContracts[p.gameIndex] = {
            [this.CONTRACT_KEYS.BARBU]: null,
            [this.CONTRACT_KEYS.DAMES]: null,
            [this.CONTRACT_KEYS.PLIS]: null,
            [this.CONTRACT_KEYS.COEURS]: null,
            [this.CONTRACT_KEYS.LAST_TRICK]: null,
            [this.CONTRACT_KEYS.SALAD]: null,
            [this.CONTRACT_KEYS.REUSSITE]: null
        };
    });

    this.activeGame.roundHistory.forEach(round => {
        this.activeGame.players.forEach(p => {
            this.activeGame.scores[p.gameIndex] += round.scoresAdded[p.gameIndex];
        });
        this.activeGame.playedContracts[round.chooserIndex][round.contract] = round.scoresAdded[round.chooserIndex];
    });

    this.activeGame.roundsPlayed = this.activeGame.roundHistory.length;
    this.activeGame.currentDealerIndex = this.activeGame.roundsPlayed % 4;
}

export function submitScores() {
    if (!this.activeGame || !this.activeGame.activeRound) return;

    const round = this.activeGame.activeRound;
    const contract = round.contract;
    const chooserIdx = round.chooserIndex;
    const finalPointsAdded = [0, 0, 0, 0];

    if (contract === this.CONTRACT_KEYS.BARBU) {
        const penalty = this.settings[this.CONTRACT_KEYS.BARBU];
        round.scores.forEach((val, pIdx) => { if (val === 1) finalPointsAdded[pIdx] = penalty; });
    } else if (contract === this.CONTRACT_KEYS.LAST_TRICK) {
        const penalty = this.settings[this.CONTRACT_KEYS.LAST_TRICK];
        round.scores.forEach((val, pIdx) => { if (val === 1) finalPointsAdded[pIdx] = penalty; });
    } else if (contract === this.CONTRACT_KEYS.DAMES) {
        const factor = this.settings[this.CONTRACT_KEYS.DAMES];
        round.scores.forEach((val, pIdx) => { finalPointsAdded[pIdx] = val * factor; });
    } else if (contract === this.CONTRACT_KEYS.PLIS) {
        const factor = this.settings[this.CONTRACT_KEYS.PLIS];
        const bonus = this.settings[this.CONTRACT_KEYS.PLIS + '_bonus'] || 70;
        const capotIdx = round.scores.findIndex(val => val === 8);
        if (capotIdx > -1) {
            round.scores.forEach((_, pIdx) => { finalPointsAdded[pIdx] = pIdx === capotIdx ? bonus : 0; });
        } else {
            round.scores.forEach((val, pIdx) => { finalPointsAdded[pIdx] = val * factor; });
        }
    } else if (contract === this.CONTRACT_KEYS.COEURS) {
        const factor = this.settings[this.CONTRACT_KEYS.COEURS];
        round.scores.forEach((val, pIdx) => { finalPointsAdded[pIdx] = val * factor; });
    } else if (contract === this.CONTRACT_KEYS.SALAD) {
        round.scores.forEach((val, pIdx) => { finalPointsAdded[pIdx] = val; });
    } else if (contract === this.CONTRACT_KEYS.REUSSITE) {
        const ranks = this.settings[this.CONTRACT_KEYS.REUSSITE];
        round.scores.forEach((rank, pIdx) => { finalPointsAdded[pIdx] = ranks[rank]; });
    }

    if (!this.activeGame.roundHistory) this.activeGame.roundHistory = [];

    this.activeGame.roundHistory.push({
        contract,
        chooserIndex: chooserIdx,
        scoresAdded: finalPointsAdded
    });

    this.recalculateGameScores();
    this.activeGame.activeRound = null;
    this.saveActiveGame();

    if (this.activeGame.roundsPlayed === 28) {
        this.endGame();
    } else {
        this.navigate('game');
    }
}
