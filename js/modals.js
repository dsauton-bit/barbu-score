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

    const round = this.activeGame.roundHistory.find(
        r => r.contract === contractKey && r.chooserIndex === chooserIndex
    );
    if (!round) return;

    this.editingRoundRef = round;

    document.getElementById('edit-round-title').textContent = `Modifier : ${this.CONTRACT_LABELS[contractKey]}`;
    const chooser = this.activeGame.players[chooserIndex];
    document.getElementById('edit-round-desc').innerHTML =
        `Manche choisie par <strong>${chooser.name}</strong>.<br>Veuillez corriger directement les points attribués :`;

    const container = document.getElementById('edit-round-inputs-container');
    container.innerHTML = '';

    this.activeGame.players.forEach(p => {
        const val = round.scoresAdded[p.gameIndex] || 0;
        const avatar = p.photo
            ? `<img class="input-player-avatar" src="${p.photo}">`
            : `<div class="input-player-avatar" style="display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--bg-secondary);border:1px solid var(--border-color)">👤</div>`;

        const row = document.createElement('div');
        row.className = 'input-player-row';
        row.innerHTML = `
            <div class="input-player-info">
                ${avatar}
                <span class="input-player-name">${this.escapeHTML(p.name)}</span>
            </div>
            <div>
                <input type="number" class="edit-player-score-input" id="edit-score-input-${p.gameIndex}"
                       value="${val}" style="width:100px;text-align:center;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:rgba(0,0,0,0.2);color:white;"
                       oninput="app.validateEditedRound()">
            </div>
        `;
        container.appendChild(row);
    });

    document.getElementById('edit-round-modal').classList.remove('hidden');
    this.validateEditedRound();
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

export function closeEditRoundModal() {
    document.getElementById('edit-round-modal').classList.add('hidden');
    this.editingRoundRef = null;
}
