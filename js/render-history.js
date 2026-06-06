export function renderHistoryScreen() {
    const container = document.getElementById('history-list-container');
    const history = JSON.parse(localStorage.getItem('barbu_history') || '[]');

    container.innerHTML = '';
    if (history.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>Aucune partie enregistrée dans l'historique.</p></div>`;
        return;
    }

    history.forEach(game => {
        const card = document.createElement('div');
        card.className = 'history-card';

        const dateStr = new Date(game.date).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);

        let playersHtml = "";
        sortedPlayers.forEach(p => {
            const avatar = p.photo
                ? `<img class="history-player-avatar" src="${p.photo}">`
                : `<div class="history-player-avatar" style="display:flex;align-items:center;justify-content:center;font-size:12px;background:var(--bg-secondary);">👤</div>`;

            playersHtml += `
                <div class="history-player ${p.id === game.winnerId ? 'winner' : ''}">
                    ${avatar}
                    <div class="history-player-name">${this.escapeHTML(p.name)}</div>
                    <div class="history-player-score">${p.score}</div>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="history-card-header">
                <span class="history-date">${dateStr}</span>
                <button class="history-delete-btn" onclick="event.stopPropagation(); app.deleteHistory(${game.id})">✕ Supprimer</button>
            </div>
            <div class="history-players-row">${playersHtml}</div>
            <div class="history-details-expanded">
                ${this._buildContractDetailTable(game)}
            </div>
        `;

        card.onclick = () => card.classList.toggle('expanded');
        container.appendChild(card);
    });
}

export function _buildContractDetailTable(game) {
    const n = game.players.length;

    // Calcul des totaux par contrat et par joueur depuis roundHistory (source la plus fiable)
    const totals = {}; // totals[cKey][pIdx]
    Object.keys(this.CONTRACT_LABELS).forEach(cKey => {
        totals[cKey] = new Array(n).fill(null);
    });

    if (game.roundHistory && game.roundHistory.length > 0) {
        game.roundHistory.forEach(round => {
            const cKey = round.contract;
            if (!totals[cKey]) return;
            round.scoresAdded.forEach((pts, pIdx) => {
                if (pIdx < n) {
                    totals[cKey][pIdx] = (totals[cKey][pIdx] === null ? 0 : totals[cKey][pIdx]) + pts;
                }
            });
        });
    } else if (game.playedContracts) {
        // Fallback : playedContracts[pIdx][cKey]
        Object.keys(this.CONTRACT_LABELS).forEach(cKey => {
            game.players.forEach((p, pIdx) => {
                const src = game.playedContracts[pIdx];
                if (src) totals[cKey][pIdx] = src[cKey] !== undefined ? src[cKey] : null;
            });
        });
    }

    // Masquer les contrats non joués (tous les joueurs à null)
    const playedKeys = Object.keys(this.CONTRACT_LABELS).filter(cKey =>
        totals[cKey].some(v => v !== null)
    );

    if (playedKeys.length === 0) {
        return `<p style="padding:12px;color:var(--text-muted);font-size:13px;">Aucun détail disponible.</p>`;
    }

    const headerCells = game.players.map(p => `<th style="font-size:11px;padding:6px 4px;text-align:center;">${this.escapeHTML(p.name)}</th>`).join('');

    const rows = playedKeys.map(cKey => {
        const cells = totals[cKey].map(val => {
            if (val === null) return `<td style="padding:6px 4px;text-align:center;color:var(--text-muted);">—</td>`;
            const display = val > 0 ? `+${val}` : val;
            const style = val > 0 ? 'color:var(--color-success);font-weight:bold;' : val < 0 ? 'color:var(--color-danger);' : 'color:var(--text-muted);';
            return `<td style="padding:6px 4px;text-align:center;${style}">${display}</td>`;
        }).join('');
        return `<tr>
            <td style="padding:6px 8px;font-weight:normal;white-space:nowrap;">${this.CONTRACT_LABELS[cKey]}</td>
            ${cells}
        </tr>`;
    }).join('');

    return `<table class="contracts-table" style="font-size:12px;width:100%;border-top:1px solid var(--border-color);">
        <thead><tr>
            <th style="padding:6px 8px;">Contrat</th>
            ${headerCells}
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>`;
}

export function deleteHistory(gameId) {
    this.showConfirmModal(
        "Supprimer la partie de l'historique",
        "Voulez-vous vraiment supprimer définitivement cette partie de l'historique ?",
        () => {
            let history = JSON.parse(localStorage.getItem('barbu_history') || '[]');
            history = history.filter(g => g.id !== gameId);
            localStorage.setItem('barbu_history', JSON.stringify(history));
            this.renderHistoryScreen();
            this.updateStatsOverview();
        }
    );
}

export async function updateStatsOverview() {
    const history = JSON.parse(localStorage.getItem('barbu_history') || '[]');
    const players = await this.getAllPlayers();

    document.getElementById('stat-total-games').textContent = history.length;
    document.getElementById('stat-total-players').textContent = players.length;

    let bestPlayerName = "-";
    if (players.length > 0) {
        const sorted = [...players]
            .filter(p => p.gamesPlayed > 0)
            .sort((a, b) => {
                const diff = b.wins / b.gamesPlayed - a.wins / a.gamesPlayed;
                return diff !== 0 ? diff : b.wins - a.wins;
            });
        if (sorted[0]) {
            const winrate = Math.round((sorted[0].wins / sorted[0].gamesPlayed) * 100);
            bestPlayerName = `${sorted[0].name} (${winrate}%)`;
        }
    }
    document.getElementById('stat-best-player').textContent = bestPlayerName;

    const recentContainer = document.getElementById('recent-games-container');
    recentContainer.innerHTML = '';

    if (history.length === 0) {
        recentContainer.innerHTML = `<div class="empty-state"><p>Aucune partie jouée pour le moment. Lancez-vous !</p></div>`;
        return;
    }

    history.slice(0, 3).forEach(game => {
        const dateStr = new Date(game.date).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        const winner = game.players.find(p => p.id === game.winnerId);
        const card = document.createElement('div');
        card.className = 'recent-game-card';
        card.onclick = () => this.navigate('history');
        card.innerHTML = `
            <div class="recent-game-info">
                <h4>Partie à 4 joueurs</h4>
                <p>${dateStr}</p>
            </div>
            <div class="recent-game-scores">
                <span class="score-badge winner">👑 ${winner ? this.escapeHTML(winner.name) : '-'} : ${winner ? winner.score : 0} pts</span>
            </div>
        `;
        recentContainer.appendChild(card);
    });
}

export function renderGameOverScreen(finalResults, historyItem) {
    const podiumContainer = document.getElementById('podium-players-container');
    podiumContainer.innerHTML = '';

    const visualOrder = [];
    if (finalResults[1]) visualOrder.push({ ...finalResults[1], rank: 2, posClass: 'second' });
    if (finalResults[0]) visualOrder.push({ ...finalResults[0], rank: 1, posClass: 'first' });
    if (finalResults[2]) visualOrder.push({ ...finalResults[2], rank: 3, posClass: 'third' });
    if (finalResults[3]) visualOrder.push({ ...finalResults[3], rank: 4, posClass: 'fourth' });

    visualOrder.forEach(item => {
        const col = document.createElement('div');
        col.className = `podium-column ${item.posClass}`;
        const avatar = item.photo
            ? `<img class="podium-avatar" src="${item.photo}">`
            : `<div class="podium-avatar" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:var(--bg-secondary);border:2px solid var(--border-color)">👤</div>`;
        col.innerHTML = `${avatar}<div class="podium-name">${this.escapeHTML(item.name)}</div><div class="podium-score">${item.score} pts</div><div class="podium-block">${item.rank}</div>`;
        podiumContainer.appendChild(col);
    });

    const tableBody = document.getElementById('final-table-body');
    tableBody.innerHTML = '';

    finalResults.forEach(item => {
        let negatives = 0;
        let positives = 0;
        const playerContracts = historyItem.playedContracts[item.gameIndex];
        for (const key in playerContracts) {
            const val = playerContracts[key];
            if (val !== null) {
                if (val > 0) positives += val;
                else negatives += val;
            }
        }

        const avatar = item.photo
            ? `<img class="th-player-avatar" src="${item.photo}">`
            : `<div class="th-player-avatar" style="display:flex;align-items:center;justify-content:center;font-size:14px;background:var(--bg-secondary);border:1px solid var(--border-color)">👤</div>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${avatar}<span>${this.escapeHTML(item.name)}</span></td>
            <td><strong>${item.score}</strong></td>
            <td class="text-danger">${negatives}</td>
            <td class="text-success">${positives > 0 ? `+${positives}` : 0}</td>
        `;
        tableBody.appendChild(tr);
    });
}
