export function renderScoreInputScreen() {
    if (!this.activeGame || !this.activeGame.activeRound) return;

    const round = this.activeGame.activeRound;
    const chooser = this.activeGame.players[round.chooserIndex];

    document.getElementById('input-contract-name').textContent = this.CONTRACT_LABELS[round.contract];
    document.getElementById('input-chooser-name').textContent = chooser.name;

    const container = document.getElementById('score-input-form-container');
    container.innerHTML = '';

    switch (round.contract) {
        case this.CONTRACT_KEYS.BARBU:
        case this.CONTRACT_KEYS.LAST_TRICK:
            this.renderSingleSelectForm(container);
            break;
        case this.CONTRACT_KEYS.DAMES:
        case this.CONTRACT_KEYS.PLIS:
        case this.CONTRACT_KEYS.COEURS:
            this.renderStepperForm(container, round.contract);
            break;
        case this.CONTRACT_KEYS.SALAD:
            this.renderSaladForm(container);
            break;
        case this.CONTRACT_KEYS.REUSSITE:
            this.renderRankForm(container);
            break;
    }

    this.validateInputScores();
}

export function renderSingleSelectForm(container) {
    const round = this.activeGame.activeRound;

    const desc = document.createElement('p');
    desc.className = 'text-muted text-center mb-4';
    desc.textContent = "Sélectionnez le joueur qui a remporté le pli contenant la carte de pénalité :";
    container.appendChild(desc);

    const grid = document.createElement('div');
    grid.className = 'radio-cards-grid';

    this.activeGame.players.forEach(p => {
        const card = document.createElement('div');
        card.className = 'radio-card';
        if (round.scores[p.gameIndex] === 1) card.classList.add('selected');

        const avatar = p.photo
            ? `<img class="score-card-avatar" src="${p.photo}">`
            : `<div class="score-card-avatar" style="display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--bg-secondary);border:1px solid var(--border-color)">👤</div>`;

        card.innerHTML = `${avatar}<div class="input-player-name">${this.escapeHTML(p.name)}</div>`;

        card.onclick = () => {
            round.scores = [0, 0, 0, 0];
            round.scores[p.gameIndex] = 1;
            grid.querySelectorAll('.radio-card').forEach(el => el.classList.remove('selected'));
            card.classList.add('selected');
            this.validateInputScores();
            this.saveActiveGame();
        };

        grid.appendChild(card);
    });

    container.appendChild(grid);
}

export function renderStepperForm(container, contract) {
    const round = this.activeGame.activeRound;

    let maxVal = 8;
    let unit = 'plis';
    if (contract === this.CONTRACT_KEYS.DAMES) { maxVal = 4; unit = 'Dames'; }
    if (contract === this.CONTRACT_KEYS.COEURS) { unit = 'Cœurs'; }

    const desc = document.createElement('p');
    desc.className = 'text-muted text-center mb-4';
    desc.textContent = `Indiquez la répartition des ${maxVal} ${unit} parmi les joueurs :`;
    container.appendChild(desc);

    const stepperList = document.createElement('div');
    stepperList.className = 'score-input-row';

    this.activeGame.players.forEach(p => {
        const val = round.scores[p.gameIndex] || 0;
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
            <div style="display:flex;align-items:center;gap:12px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="app.assignAll(${p.gameIndex}, ${maxVal})">Tout</button>
                <div class="number-stepper">
                    <button type="button" class="stepper-btn minus" onclick="app.stepVal(${p.gameIndex}, -1, ${maxVal})">−</button>
                    <span class="stepper-val" id="stepper-val-${p.gameIndex}">${val}</span>
                    <button type="button" class="stepper-btn plus" onclick="app.stepVal(${p.gameIndex}, 1, ${maxVal})">+</button>
                </div>
            </div>
        `;
        stepperList.appendChild(row);
    });

    container.appendChild(stepperList);
}

export function renderSaladForm(container) {
    const round = this.activeGame.activeRound;
    if (!round.scores || round.scores.length !== 4) round.scores = [0, 0, 0, 0];

    const targetTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_total'] || -116;
    const capotTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_capot'] || -130;

    const desc = document.createElement('p');
    desc.className = 'text-muted text-center mb-4';
    desc.innerHTML = `Saisissez directement les points de la Salade pour chaque joueur.<br>
        Le total doit être égal à <strong>${targetTotal}</strong> points (ou <strong>${capotTotal}</strong> points si un joueur a fait Capot).`;
    container.appendChild(desc);

    const list = document.createElement('div');
    list.className = 'score-input-row';

    this.activeGame.players.forEach(p => {
        const val = round.scores[p.gameIndex] || 0;
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
            <div style="display:flex;align-items:center;gap:12px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="app.saladCapotAssign(${p.gameIndex}, ${capotTotal})">Capot</button>
                <input type="number" class="salad-score-input" id="salad-score-input-${p.gameIndex}"
                       value="${val}" style="width:80px;text-align:center;padding:6px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:rgba(0,0,0,0.2);color:white;"
                       oninput="app.saladDirectInput(${p.gameIndex}, this.value)">
            </div>
        `;
        list.appendChild(row);
    });

    container.appendChild(list);
}

export function renderRankForm(container) {
    const round = this.activeGame.activeRound;
    if (!round.scores || round.scores.length !== 4 || round.scores.every(s => s === 0)) {
        round.scores = [null, null, null, null];
    }

    const desc = document.createElement('p');
    desc.className = 'text-muted text-center mb-4';
    desc.textContent = "Attribuez un rang unique d'arrivée à chaque joueur :";
    container.appendChild(desc);

    const list = document.createElement('div');
    list.className = 'rank-selector-row';

    this.activeGame.players.forEach(p => {
        const playerRank = round.scores[p.gameIndex];
        const avatar = p.photo
            ? `<img class="input-player-avatar" src="${p.photo}">`
            : `<div class="input-player-avatar" style="display:flex;align-items:center;justify-content:center;font-size:14px;background:var(--bg-secondary);">👤</div>`;

        const row = document.createElement('div');
        row.className = 'rank-row';
        row.innerHTML = `
            <div class="input-player-info" style="justify-self:start;">
                ${avatar}
                <span class="input-player-name">${this.escapeHTML(p.name)}</span>
            </div>
            <div class="rank-options">
                <button type="button" class="rank-option-btn ${playerRank === 0 ? 'active' : ''}" onclick="app.setRank(${p.gameIndex}, 0)">1er</button>
                <button type="button" class="rank-option-btn ${playerRank === 1 ? 'active' : ''}" onclick="app.setRank(${p.gameIndex}, 1)">2e</button>
                <button type="button" class="rank-option-btn ${playerRank === 2 ? 'active' : ''}" onclick="app.setRank(${p.gameIndex}, 2)">3e</button>
                <button type="button" class="rank-option-btn ${playerRank === 3 ? 'active' : ''}" onclick="app.setRank(${p.gameIndex}, 3)">4e</button>
            </div>
        `;
        list.appendChild(row);
    });

    container.appendChild(list);
}

export function stepVal(playerIndex, delta, maxLimit) {
    const round = this.activeGame.activeRound;
    let current = round.scores[playerIndex] || 0;
    current = Math.max(0, Math.min(maxLimit, current + delta));
    round.scores[playerIndex] = current;
    document.getElementById(`stepper-val-${playerIndex}`).textContent = current;
    this.validateInputScores();
    this.saveActiveGame();
}

export function assignAll(playerIndex, maxVal) {
    const round = this.activeGame.activeRound;
    this.activeGame.players.forEach(p => {
        round.scores[p.gameIndex] = p.gameIndex === playerIndex ? maxVal : 0;
        const el = document.getElementById(`stepper-val-${p.gameIndex}`);
        if (el) el.textContent = round.scores[p.gameIndex];
    });
    this.validateInputScores();
    this.saveActiveGame();
}

export function saladCapotAssign(playerIndex, capotTotal) {
    const round = this.activeGame.activeRound;
    this.activeGame.players.forEach(p => {
        round.scores[p.gameIndex] = p.gameIndex === playerIndex ? capotTotal : 0;
        const input = document.getElementById(`salad-score-input-${p.gameIndex}`);
        if (input) input.value = round.scores[p.gameIndex];
    });
    this.validateInputScores();
    this.saveActiveGame();
}

export function saladDirectInput(playerIndex, val) {
    const round = this.activeGame.activeRound;
    let num = parseInt(val) || 0;
    if (num > 0) {
        num = -num;
        const input = document.getElementById(`salad-score-input-${playerIndex}`);
        if (input) input.value = num;
    }
    round.scores[playerIndex] = num;
    this.validateInputScores();
    this.saveActiveGame();
}

export function setRank(playerIndex, rank) {
    const round = this.activeGame.activeRound;
    round.scores.forEach((currentRank, idx) => {
        if (currentRank === rank) round.scores[idx] = null;
    });
    round.scores[playerIndex] = rank;

    const rows = document.querySelectorAll('.rank-row');
    this.activeGame.players.forEach(p => {
        const currentRank = round.scores[p.gameIndex];
        rows[p.gameIndex].querySelectorAll('.rank-option-btn').forEach((btn, rIdx) => {
            btn.classList.toggle('active', currentRank === rIdx);
        });
    });

    this.validateInputScores();
    this.saveActiveGame();
}

export function validateInputScores() {
    const round = this.activeGame.activeRound;
    const contract = round.contract;
    const msgBox = document.getElementById('score-input-validation-msg');
    const submitBtn = document.getElementById('submit-scores-btn');

    let isValid = false;
    let errorMsg = "";
    const sum = round.scores.reduce((a, b) => (a || 0) + (b || 0), 0);

    if (contract === this.CONTRACT_KEYS.BARBU || contract === this.CONTRACT_KEYS.LAST_TRICK) {
        isValid = sum === 1;
        if (!isValid) errorMsg = "Veuillez désigner le joueur pénalisé.";
    } else if (contract === this.CONTRACT_KEYS.DAMES) {
        isValid = sum === 4;
        if (!isValid) errorMsg = `Le total des Dames saisies doit être égal à 4 (Actuel : ${sum}).`;
    } else if (contract === this.CONTRACT_KEYS.PLIS) {
        isValid = sum === 8;
        if (!isValid) errorMsg = `Le total des Plis saisis doit être égal à 8 (Actuel : ${sum}).`;
    } else if (contract === this.CONTRACT_KEYS.COEURS) {
        isValid = sum === 8;
        if (!isValid) errorMsg = `Le total des Cœurs saisis doit être égal à 8 (Actuel : ${sum}).`;
    } else if (contract === this.CONTRACT_KEYS.SALAD) {
        const targetTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_total'] || -116;
        const capotTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_capot'] || -130;
        const capotIdx = round.scores.findIndex(val => val === capotTotal);
        const othersZero = round.scores.every((val, idx) => idx === capotIdx || val === 0);
        isValid = sum === targetTotal || (capotIdx > -1 && othersZero);
        if (!isValid) errorMsg = `Le total de la Salade doit faire ${targetTotal} (Actuel : ${sum}), ou un joueur doit avoir ${capotTotal} seul.`;
    } else if (contract === this.CONTRACT_KEYS.REUSSITE) {
        isValid = round.scores.filter(r => r !== null).length === 4;
        if (!isValid) errorMsg = "Veuillez attribuer un rang d'arrivée à chacun des 4 joueurs.";
    }

    msgBox.classList.toggle('active', !isValid);
    if (!isValid) msgBox.textContent = errorMsg;
    submitBtn.disabled = !isValid;
}
