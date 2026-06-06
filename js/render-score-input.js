export function renderScoreInputScreen() {
    if (!this.activeGame || !this.activeGame.activeRound) return;

    const round = this.activeGame.activeRound;
    const chooser = this.activeGame.players[round.chooserIndex];
    const isEditing = this.editingRoundIdx !== null && this.editingRoundIdx !== undefined;

    document.getElementById('score-input-title').textContent =
        isEditing ? 'Modification de la manche' : 'Saisie de la manche';
    document.getElementById('input-contract-name').textContent = this.CONTRACT_LABELS[round.contract];
    document.getElementById('input-chooser-name').textContent = chooser.name;
    document.getElementById('cancel-edit-round-btn').classList.toggle('hidden', !isEditing);
    document.getElementById('submit-scores-btn').textContent =
        isEditing ? '✔ Enregistrer la modification' : 'Valider les scores ➔';

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

    // Initialise l'état interne des sous-contrats si besoin
    if (!round.saladSub) {
        round.saladSub = {
            barbu:      null,          // gameIndex du joueur pénalisé (ou null)
            dernier_pli: null,         // gameIndex
            dames:      [0, 0, 0, 0], // nb dames par joueur
            plis:       [0, 0, 0, 0], // nb plis par joueur
            coeurs:     [0, 0, 0, 0], // nb cœurs par joueur
        };
    }

    container.innerHTML = '';

    // ── Titre et total courant ────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'salad-header';
    header.innerHTML = `
        <p class="text-muted text-center mb-4">🥗 Saisissez chaque sous-contrat de la Salade :</p>
        <div class="salad-total-bar" id="salad-total-bar">
            Total : <span id="salad-total-display">0</span>
        </div>`;
    container.appendChild(header);

    // ── Sous-contrat Barbu ────────────────────────────────────────────────
    container.appendChild(this._saladSection('👑 Le Barbu', this._saladSingleSelect(round, 'barbu')));

    // ── Sous-contrat Dernier Pli ──────────────────────────────────────────
    container.appendChild(this._saladSection('☠️ Dernier Pli', this._saladSingleSelect(round, 'dernier_pli')));

    // ── Sous-contrat Dames ────────────────────────────────────────────────
    container.appendChild(this._saladSection('👸 Dames (4)', this._saladStepper(round, 'dames', 4)));

    // ── Sous-contrat Plis ─────────────────────────────────────────────────
    container.appendChild(this._saladSection('🃏 Plis (8)', this._saladStepper(round, 'plis', 8)));

    // ── Sous-contrat Cœurs ────────────────────────────────────────────────
    container.appendChild(this._saladSection('♥️ Cœurs (8)', this._saladStepper(round, 'coeurs', 8)));

    this._saladRecompute(round);
}

export function _saladSection(title, content) {
    const section = document.createElement('div');
    section.className = 'salad-sub-section';
    section.innerHTML = `<div class="salad-sub-title">${title}</div>`;
    section.appendChild(content);
    return section;
}

export function _saladSingleSelect(round, subKey) {
    const grid = document.createElement('div');
    grid.className = 'salad-single-grid';

    this.activeGame.players.forEach(p => {
        const selected = round.saladSub[subKey] === p.gameIndex;
        const avatar = p.photo
            ? `<img class="input-player-avatar" src="${p.photo}">`
            : `<div class="input-player-avatar" style="display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--bg-secondary);border:1px solid var(--border-color)">👤</div>`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `salad-player-btn${selected ? ' selected' : ''}`;
        btn.innerHTML = `${avatar}<span>${this.escapeHTML(p.name)}</span>`;
        btn.onclick = () => {
            round.saladSub[subKey] = selected ? null : p.gameIndex;
            grid.querySelectorAll('.salad-player-btn').forEach((b, i) => {
                b.classList.toggle('selected', round.saladSub[subKey] === this.activeGame.players[i].gameIndex);
            });
            this._saladRecompute(round);
        };
        grid.appendChild(btn);
    });
    return grid;
}

export function _saladStepper(round, subKey, maxVal) {
    const wrapper = document.createElement('div');
    wrapper.className = 'salad-stepper-grid';

    this.activeGame.players.forEach(p => {
        const val = round.saladSub[subKey][p.gameIndex] || 0;
        const avatar = p.photo
            ? `<img class="input-player-avatar" src="${p.photo}">`
            : `<div class="input-player-avatar" style="display:flex;align-items:center;justify-content:center;font-size:14px;background:var(--bg-secondary);border:1px solid var(--border-color)">👤</div>`;

        const cell = document.createElement('div');
        cell.className = 'salad-stepper-cell';
        cell.innerHTML = `
            ${avatar}
            <span class="salad-player-label">${this.escapeHTML(p.name)}</span>
            <div class="salad-stepper-controls">
                <button type="button" class="stepper-btn minus"
                    onclick="app.saladSubStep('${subKey}', ${p.gameIndex}, -1, ${maxVal})">−</button>
                <span class="stepper-val" id="salad-sub-${subKey}-${p.gameIndex}">${val}</span>
                <button type="button" class="stepper-btn plus"
                    onclick="app.saladSubStep('${subKey}', ${p.gameIndex}, 1, ${maxVal})">+</button>
            </div>
            <button type="button" class="salad-tout-btn"
                onclick="app.saladSubAll('${subKey}', ${p.gameIndex}, ${maxVal})">Tout</button>`;
        wrapper.appendChild(cell);
    });
    return wrapper;
}

export function saladSubStep(subKey, playerIndex, delta, maxVal) {
    const round = this.activeGame.activeRound;
    let val = (round.saladSub[subKey][playerIndex] || 0) + delta;
    const others = round.saladSub[subKey].reduce((s, v, i) => i === playerIndex ? s : s + (v || 0), 0);
    val = Math.max(0, Math.min(maxVal - others, val));
    round.saladSub[subKey][playerIndex] = val;
    document.getElementById(`salad-sub-${subKey}-${playerIndex}`).textContent = val;
    this._saladRecompute(round);
}

export function saladSubAll(subKey, playerIndex, maxVal) {
    const round = this.activeGame.activeRound;
    round.saladSub[subKey] = [0, 0, 0, 0];
    round.saladSub[subKey][playerIndex] = maxVal;
    this.activeGame.players.forEach(p => {
        const el = document.getElementById(`salad-sub-${subKey}-${p.gameIndex}`);
        if (el) el.textContent = round.saladSub[subKey][p.gameIndex];
    });
    this._saladRecompute(round);
}

export function _saladRecompute(round) {
    const s = this.settings;
    const sub = round.saladSub;

    // Calcul des points par joueur
    round.scores = [0, 0, 0, 0];
    this.activeGame.players.forEach(p => {
        const i = p.gameIndex;
        // Barbu
        if (sub.barbu === i) round.scores[i] += s[this.CONTRACT_KEYS.BARBU] || -40;
        // Dernier pli
        if (sub.dernier_pli === i) round.scores[i] += s[this.CONTRACT_KEYS.LAST_TRICK] || -20;
        // Dames
        round.scores[i] += (sub.dames[i] || 0) * (s[this.CONTRACT_KEYS.DAMES] || -6);
        // Plis
        const capotPlis = sub.plis.findIndex(v => v === 8);
        if (capotPlis === i) {
            round.scores[i] += s.plis_bonus || 70;
        } else if (capotPlis === -1) {
            round.scores[i] += (sub.plis[i] || 0) * (s[this.CONTRACT_KEYS.PLIS] || -2);
        }
        // Cœurs
        round.scores[i] += (sub.coeurs[i] || 0) * (s[this.CONTRACT_KEYS.COEURS] || -2);
    });

    // Afficher le total courant
    const total = round.scores.reduce((a, b) => a + b, 0);
    const el = document.getElementById('salad-total-display');
    if (el) {
        el.textContent = total;
        const bar = document.getElementById('salad-total-bar');
        const targetTotal = s[this.CONTRACT_KEYS.SALAD + '_total'] || -116;
        const capotTotal  = s[this.CONTRACT_KEYS.SALAD + '_capot'] || -130;
        const ok = total === targetTotal || total === capotTotal;
        bar.classList.toggle('salad-total-ok',  ok);
        bar.classList.toggle('salad-total-err', !ok);
    }

    this.validateInputScores();
    this.saveActiveGame();
}

export function renderRankForm(container) {
    const round = this.activeGame.activeRound;
    if (!round.scores || round.scores.length !== 4 || round.scores.every(s => s === 0)) {
        round.scores = [null, null, null, null];
    }

    const reussiteValues = this.settings[this.CONTRACT_KEYS.REUSSITE] || [100, 50, 0, 0];
    const scoredRanks = reussiteValues
        .map((v, i) => ({ rank: i, value: v }))
        .filter(r => r.value > 0);
    const RANK_MEDALS = ['🥇', '🥈', '🥉', '🎖️'];
    const rankLabels  = ['1er', '2e', '3e', '4e'];

    // ── Instruction ──────────────────────────────────────────────────────
    const desc = document.createElement('p');
    desc.className = 'text-muted text-center mb-4';
    desc.textContent = 'Tapez les joueurs dans leur ordre de sortie :';
    container.appendChild(desc);

    // ── Podium : emplacements des rangs bonifiés ──────────────────────────
    const podium = document.createElement('div');
    podium.className = 'reussite-podium';
    podium.id = 'reussite-podium';
    scoredRanks.forEach(r => {
        const assigned = this.activeGame.players.find(
            p => round.scores[p.gameIndex] === r.rank
        );
        const slot = document.createElement('div');
        slot.className = `reussite-slot${assigned ? ' filled' : ''}`;
        slot.id = `reussite-slot-${r.rank}`;
        slot.innerHTML = assigned
            ? this._reussiteSlotFilled(assigned, r, RANK_MEDALS, rankLabels)
            : this._reussiteSlotEmpty(r, RANK_MEDALS, rankLabels);
        podium.appendChild(slot);
    });
    container.appendChild(podium);

    // ── Grille des joueurs à taper ────────────────────────────────────────
    const desc2 = document.createElement('p');
    desc2.className = 'text-muted text-center mb-4';
    desc2.style.marginTop = '20px';
    desc2.textContent = 'Joueurs disponibles :';
    container.appendChild(desc2);

    const grid = document.createElement('div');
    grid.className = 'reussite-player-grid';
    grid.id = 'reussite-player-grid';
    this._renderReussiteGrid(grid, round, scoredRanks, RANK_MEDALS, rankLabels);
    container.appendChild(grid);
}

export function _reussiteSlotEmpty(r, medals, labels) {
    return `
        <div class="reussite-slot-medal">${medals[r.rank]}</div>
        <div class="reussite-slot-label">${labels[r.rank]}</div>
        <div class="reussite-slot-pts">+${r.value} pts</div>
        <div class="reussite-slot-name">—</div>`;
}

export function _reussiteSlotFilled(player, r, medals, labels) {
    const avatar = player.photo
        ? `<img class="reussite-slot-avatar" src="${player.photo}">`
        : `<div class="reussite-slot-avatar">👤</div>`;
    return `
        <div class="reussite-slot-medal">${medals[r.rank]}</div>
        ${avatar}
        <div class="reussite-slot-name">${this.escapeHTML(player.name)}</div>
        <div class="reussite-slot-pts">+${r.value} pts</div>`;
}

export function _renderReussiteGrid(grid, round, scoredRanks, medals, labels) {
    grid.innerHTML = '';
    this.activeGame.players.forEach(p => {
        const assignedRank = round.scores[p.gameIndex];
        const isAssigned   = assignedRank !== null;
        const rankInfo     = isAssigned ? scoredRanks.find(r => r.rank === assignedRank) : null;
        const avatar = p.photo
            ? `<img class="reussite-card-avatar" src="${p.photo}">`
            : `<div class="reussite-card-avatar">👤</div>`;

        const card = document.createElement('button');
        card.type = 'button';
        card.className = `reussite-player-card${isAssigned ? ' assigned' : ''}`;

        card.innerHTML = isAssigned
            ? `<div class="reussite-card-rank-badge">${medals[assignedRank]}</div>
               ${avatar}
               <div class="reussite-card-name">${this.escapeHTML(p.name)}</div>
               <div class="reussite-card-pts">${labels[assignedRank]} · +${rankInfo?.value ?? 0} pts</div>`
            : `${avatar}
               <div class="reussite-card-name">${this.escapeHTML(p.name)}</div>
               <div class="reussite-card-pts">En attente…</div>`;

        card.onclick = () => this._reussiteTap(p.gameIndex, scoredRanks, medals, labels);
        grid.appendChild(card);
    });
}

export function _reussiteTap(playerIndex, scoredRanks, medals, labels) {
    const round = this.activeGame.activeRound;

    if (round.scores[playerIndex] !== null) {
        // Désassigner : libère le rang
        round.scores[playerIndex] = null;
    } else {
        // Assigner le prochain rang disponible
        const usedRanks = round.scores.filter(s => s !== null);
        const nextRank = scoredRanks.find(r => !usedRanks.includes(r.rank));
        if (!nextRank) return; // plus de rangs bonifiés disponibles
        round.scores[playerIndex] = nextRank.rank;
    }

    // Mettre à jour le podium
    scoredRanks.forEach(r => {
        const slot = document.getElementById(`reussite-slot-${r.rank}`);
        if (!slot) return;
        const assigned = this.activeGame.players.find(p => round.scores[p.gameIndex] === r.rank);
        slot.classList.toggle('filled', !!assigned);
        slot.innerHTML = assigned
            ? this._reussiteSlotFilled(assigned, r, medals, labels)
            : this._reussiteSlotEmpty(r, medals, labels);
    });

    // Mettre à jour la grille joueurs
    const grid = document.getElementById('reussite-player-grid');
    if (grid) this._renderReussiteGrid(grid, round, scoredRanks, medals, labels);

    this.validateInputScores();
    this.saveActiveGame();
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
        const capotTotal  = this.settings[this.CONTRACT_KEYS.SALAD + '_capot'] || -130;
        const capotIdx = round.scores.findIndex(val => val === capotTotal);
        const othersZero = round.scores.every((val, idx) => idx === capotIdx || val === 0);
        isValid = sum === targetTotal || (capotIdx > -1 && othersZero);
        if (!isValid) errorMsg = `Total : ${sum} pts. Attendu : ${targetTotal} pts (ou ${capotTotal} en cas de Capot général).`;
    } else if (contract === this.CONTRACT_KEYS.REUSSITE) {
        const reussiteValues = this.settings[this.CONTRACT_KEYS.REUSSITE] || [100, 50, 0, 0];
        const scoredRanks = reussiteValues.map((v, i) => i).filter(i => reussiteValues[i] > 0);
        // Toutes les positions avec bonus doivent être attribuées à un joueur différent
        isValid = scoredRanks.every(rank => round.scores.some(s => s === rank));
        if (!isValid) errorMsg = `Attribuez les places ${scoredRanks.map(i => ['1re','2e','3e','4e'][i]).join(', ')} à des joueurs différents.`;
    }

    msgBox.classList.toggle('active', !isValid);
    if (!isValid) msgBox.textContent = errorMsg;
    submitBtn.disabled = !isValid;
}
