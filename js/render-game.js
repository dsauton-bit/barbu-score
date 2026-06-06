export function renderGameScreen() {
    if (!this.activeGame) return;

    document.getElementById('game-current-round-num').textContent = this.activeGame.roundsPlayed + 1;
    document.getElementById('current-dealer-name').textContent =
        this.activeGame.players[this.activeGame.currentDealerIndex].name;

    this.renderScoreboard();
    this.renderRoundHistory();
    this.renderContractsGrid();
}

export function toggleRoundHistory() {
    const container = document.getElementById('round-history-container');
    const arrow = document.getElementById('round-history-arrow');
    const hidden = container.classList.toggle('hidden');
    arrow.textContent = hidden ? '▼' : '▲';
}

export function renderRoundHistory() {
    const history = this.activeGame.roundHistory || [];
    const players = this.activeGame.players;

    document.getElementById('round-history-count').textContent = history.length;

    if (history.length === 0) return;

    const thead = document.getElementById('round-history-thead');
    const tbody = document.getElementById('round-history-tbody');

    // En-tête : # | Contrat | Joueur1 | Joueur2 | Joueur3 | Joueur4
    thead.innerHTML = `
        <tr>
            <th style="width:36px">#</th>
            <th>Contrat</th>
            ${players.map(p => {
                const avatar = p.photo
                    ? `<img class="th-player-avatar" src="${p.photo}">`
                    : `<div class="th-player-avatar" style="display:flex;align-items:center;justify-content:center;font-size:12px;background:var(--bg-secondary);border:1px solid var(--border-color)">👤</div>`;
                return `<th><div class="th-player-info">${avatar}<div class="th-player-name">${this.escapeHTML(p.name)}</div></div></th>`;
            }).join('')}
        </tr>
    `;

    // Calcul des cumuls manche par manche
    const running = players.map(() => 0);

    tbody.innerHTML = '';
    history.forEach((round, idx) => {
        players.forEach((p, i) => { running[i] += round.scoresAdded[p.gameIndex]; });

        const chooser = players[round.chooserIndex];
        const chooserAvatar = chooser.photo
            ? `<img class="th-player-avatar" src="${chooser.photo}" style="width:18px;height:18px;">`
            : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center;color:var(--text-muted);font-size:12px">${idx + 1}</td>
            <td>
                <div style="display:flex;flex-direction:column;gap:2px">
                    <span style="font-size:13px">${this.CONTRACT_LABELS[round.contract]}</span>
                    <span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px">${chooserAvatar}${this.escapeHTML(chooser.name)}</span>
                </div>
            </td>
            ${players.map((p, i) => {
                const delta = round.scoresAdded[p.gameIndex];
                const cum = running[i];
                const deltaStr = delta > 0 ? `+${delta}` : delta === 0 ? '—' : delta;
                const deltaClass = delta > 0 ? 'color:var(--color-success)' : delta < 0 ? 'color:var(--color-danger)' : 'color:var(--text-muted)';
                const cumClass = cum > 0 ? 'color:var(--color-success)' : cum < 0 ? 'color:var(--color-danger)' : 'color:var(--text-muted)';
                return `
                    <td>
                        <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
                            <span style="font-size:13px;font-weight:600;${deltaClass}">${deltaStr}</span>
                            <span style="font-size:10px;${cumClass}">${cum > 0 ? '+' : ''}${cum}</span>
                        </div>
                    </td>
                `;
            }).join('')}
        `;
        tbody.appendChild(tr);
    });
}

export function renderScoreboard() {
    const container = document.getElementById('game-scorecards-container');
    container.innerHTML = '';

    const sorted = this.activeGame.players
        .map((p, i) => ({ player: p, score: this.activeGame.scores[i] }))
        .sort((a, b) => b.score - a.score);

    sorted.forEach((item, sortedIdx) => {
        const p = item.player;
        const scoreClass = item.score > 0 ? 'positive' : item.score < 0 ? 'negative' : '';
        const avatar = p.photo
            ? `<img class="score-card-avatar" src="${p.photo}">`
            : `<div class="score-card-avatar" style="display:flex;align-items:center;justify-content:center;font-size:20px;background:var(--bg-secondary);border:1px solid var(--border-color)">👤</div>`;

        const card = document.createElement('div');
        card.className = `score-card rank-${sortedIdx}`;
        card.innerHTML = `
            <div class="score-card-rank">${['1er','2e','3e','4e'][sortedIdx]}</div>
            ${avatar}
            <div class="score-card-details">
                <div class="score-card-name">${this.escapeHTML(p.name)}</div>
                <div class="score-card-value ${scoreClass}">${item.score}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

export function renderContractsGrid() {
    const header = document.getElementById('contracts-table-header');
    const body = document.getElementById('contracts-table-body');

    header.innerHTML = '<th>Contrats</th>';
    body.innerHTML = '';

    this.activeGame.players.forEach(p => {
        const avatar = p.photo
            ? `<img class="th-player-avatar" src="${p.photo}">`
            : `<div class="th-player-avatar" style="display:flex;align-items:center;justify-content:center;font-size:14px;background:var(--bg-secondary);border:1px solid var(--border-color)">👤</div>`;

        const th = document.createElement('th');
        th.innerHTML = `<div class="th-player-info">${avatar}<div class="th-player-name">${this.escapeHTML(p.name)}</div></div>`;
        header.appendChild(th);
    });

    const contracts = [
        this.CONTRACT_KEYS.BARBU, this.CONTRACT_KEYS.DAMES, this.CONTRACT_KEYS.PLIS,
        this.CONTRACT_KEYS.COEURS, this.CONTRACT_KEYS.LAST_TRICK,
        this.CONTRACT_KEYS.SALAD, this.CONTRACT_KEYS.REUSSITE
    ];

    contracts.forEach(contractKey => {
        const tr = document.createElement('tr');
        const labelTd = document.createElement('td');
        labelTd.innerHTML = `<strong>${this.CONTRACT_LABELS[contractKey]}</strong>`;
        tr.appendChild(labelTd);

        this.activeGame.players.forEach(p => {
            const td = document.createElement('td');
            const score = this.activeGame.playedContracts[p.gameIndex][contractKey];
            const isDealer = p.gameIndex === this.activeGame.currentDealerIndex;

            if (score !== null) {
                const scoreSign = score > 0 ? `+${score}` : score;
                const scoreClass = score > 0 ? 'positive-score' : score < 0 ? 'negative-score' : '';
                td.innerHTML = `<button class="contract-cell-btn played ${scoreClass}" onclick="app.openEditRoundModal('${contractKey}', ${p.gameIndex})">${scoreSign}</button>`;
            } else if (isDealer) {
                td.innerHTML = `<button class="contract-cell-btn available-to-choose" onclick="app.selectContract('${contractKey}', ${p.gameIndex})">Jouer</button>`;
            } else {
                td.innerHTML = `<button class="contract-cell-btn disabled" disabled>Disponible</button>`;
            }
            tr.appendChild(td);
        });

        body.appendChild(tr);
    });
}

export function selectContract(contractKey, chooserIndex) {
    this.activeGame.activeRound = {
        contract: contractKey,
        chooserIndex,
        scores: [0, 0, 0, 0]
    };
    this.saveActiveGame();
    this.navigate('score-input');
}
