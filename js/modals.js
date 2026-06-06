export function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modal.classList.remove('hidden');

    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    confirmBtn.onclick = () => { onConfirm(); modal.classList.add('hidden'); };
    cancelBtn.onclick = () => modal.classList.add('hidden');
}

export function openEditRoundModal(contractKey, chooserIndex) {
    if (!this.activeGame || !this.activeGame.roundHistory) return;

    const idx = this.activeGame.roundHistory.findIndex(
        r => r.contract === contractKey && r.chooserIndex === chooserIndex
    );
    if (idx === -1) return;

    const round = this.activeGame.roundHistory[idx];
    this.editingRoundIdx = idx;

    // Restaure les scores originaux pour pré-remplir le formulaire de saisie
    const originalScores = round.scores
        ? [...round.scores]
        : [...round.scoresAdded]; // fallback pour les anciennes parties

    this.activeGame.activeRound = {
        contract: contractKey,
        chooserIndex,
        scores: originalScores
    };

    this.saveActiveGame();
    this.navigate('score-input');
}

export function validateEditedRound() {
    if (!this.editingRoundRef) return;

    const contract = this.editingRoundRef.contract;
    const msgBox = document.getElementById('edit-round-validation-msg');
    const saveBtn = document.getElementById('edit-round-save-btn');

    const scores = this.activeGame.players.map(p => {
        const input = document.getElementById(`edit-score-input-${p.gameIndex}`);
        let val = parseInt(input.value) || 0;
        if (contract !== this.CONTRACT_KEYS.REUSSITE && val > 0) {
            val = -val;
            input.value = val;
        }
        return val;
    });

    const sum = scores.reduce((a, b) => a + b, 0);
    let isValid = false;
    let errorMsg = "";

    if (contract === this.CONTRACT_KEYS.BARBU) {
        const penalty = this.settings[this.CONTRACT_KEYS.BARBU];
        isValid = sum === penalty && scores.some(v => v === penalty);
        if (!isValid) errorMsg = `Le score total doit faire ${penalty} avec un seul joueur pénalisé.`;
    } else if (contract === this.CONTRACT_KEYS.LAST_TRICK) {
        const penalty = this.settings[this.CONTRACT_KEYS.LAST_TRICK];
        isValid = sum === penalty && scores.some(v => v === penalty);
        if (!isValid) errorMsg = `Le score total doit faire ${penalty} avec un seul joueur pénalisé.`;
    } else if (contract === this.CONTRACT_KEYS.DAMES) {
        const total = this.settings[this.CONTRACT_KEYS.DAMES] * 4;
        isValid = sum === total;
        if (!isValid) errorMsg = `La somme des points doit être égale à ${total} (Actuel : ${sum}).`;
    } else if (contract === this.CONTRACT_KEYS.COEURS) {
        const total = this.settings[this.CONTRACT_KEYS.COEURS] * 8;
        isValid = sum === total;
        if (!isValid) errorMsg = `La somme des points doit être égale à ${total} (Actuel : ${sum}).`;
    } else if (contract === this.CONTRACT_KEYS.PLIS) {
        const total = this.settings[this.CONTRACT_KEYS.PLIS] * 8;
        const bonus = this.settings[this.CONTRACT_KEYS.PLIS + '_bonus'] || 70;
        isValid = sum === total || (sum === bonus && scores.some(v => v === bonus));
        if (!isValid) errorMsg = `La somme doit faire ${total}, ou un joueur doit avoir le bonus capot de ${bonus} seul.`;
    } else if (contract === this.CONTRACT_KEYS.SALAD) {
        const targetTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_total'] || -116;
        const capotTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_capot'] || -130;
        isValid = sum === targetTotal || (sum === capotTotal && scores.some(v => v === capotTotal));
        if (!isValid) errorMsg = `La somme doit faire ${targetTotal}, ou un joueur doit avoir le score capot de ${capotTotal}.`;
    } else if (contract === this.CONTRACT_KEYS.REUSSITE) {
        const expected = [...this.settings[this.CONTRACT_KEYS.REUSSITE]].sort((a, b) => a - b);
        const actual = [...scores].sort((a, b) => a - b);
        isValid = expected.every((val, i) => val === actual[i]);
        if (!isValid) errorMsg = `Les scores doivent correspondre aux points de Réussite : ${this.settings[this.CONTRACT_KEYS.REUSSITE].join(', ')}.`;
    }

    msgBox.classList.toggle('active', !isValid);
    if (!isValid) msgBox.textContent = errorMsg;
    saveBtn.disabled = !isValid;
}

export function saveEditedRound() {
    if (!this.editingRoundRef || !this.activeGame) return;

    this.editingRoundRef.scoresAdded = this.activeGame.players.map(p =>
        parseInt(document.getElementById(`edit-score-input-${p.gameIndex}`).value) || 0
    );

    this.recalculateGameScores();
    this.saveActiveGame();
    this.closeEditRoundModal();
    this.renderGameScreen();
}

export function cancelEditRound() {
    this.editingRoundIdx = null;
    this.activeGame.activeRound = null;
    this.saveActiveGame();
    this.navigate('game');
}

export function closeEditRoundModal() {
    document.getElementById('edit-round-modal').classList.add('hidden');
    this.editingRoundRef = null;
}
