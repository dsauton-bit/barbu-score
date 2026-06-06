export async function prepareGameSetup() {
    this.selectedSetupPlayers = [];
    this.updateSetupSelectedUI();

    const players = await this.getAllPlayers();
    const grid = document.getElementById('setup-players-list');
    const emptyMsg = document.getElementById('setup-empty-players');

    grid.innerHTML = '';

    if (players.length === 0) {
        emptyMsg.classList.remove('hidden');
        grid.classList.add('hidden');
        return;
    }

    emptyMsg.classList.add('hidden');
    grid.classList.remove('hidden');

    players.forEach(player => {
        const card = document.createElement('div');
        card.className = 'selectable-player-card';
        card.dataset.id = player.id;

        const avatar = player.photo
            ? `<img class="selectable-player-avatar" src="${player.photo}">`
            : `<div class="selectable-player-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 20px; background: var(--bg-secondary);">👤</div>`;

        card.innerHTML = `
            ${avatar}
            <div class="selectable-player-name">${this.escapeHTML(player.name)}</div>
        `;

        card.onclick = () => this.toggleSetupPlayer(player, card);
        grid.appendChild(card);
    });
}

export function toggleSetupPlayer(player, cardElement) {
    const index = this.selectedSetupPlayers.findIndex(p => p.id === player.id);

    if (index > -1) {
        this.selectedSetupPlayers.splice(index, 1);
        cardElement.classList.remove('selected');
    } else {
        if (this.selectedSetupPlayers.length >= 4) {
            alert("Vous ne pouvez sélectionner que 4 joueurs !");
            return;
        }
        this.selectedSetupPlayers.push(player);
        cardElement.classList.add('selected');
    }

    this.updateSetupSelectedUI();
}

export function updateSetupSelectedUI() {
    const countSpan = document.getElementById('setup-selected-count');
    const startBtn = document.getElementById('start-game-btn');
    const slots = document.querySelectorAll('.selected-slot');

    countSpan.textContent = this.selectedSetupPlayers.length;
    startBtn.disabled = this.selectedSetupPlayers.length !== 4;

    slots.forEach((slot, i) => {
        slot.innerHTML = '';
        slot.className = 'selected-slot empty';

        if (this.selectedSetupPlayers[i]) {
            const player = this.selectedSetupPlayers[i];
            slot.className = 'selected-slot filled';

            const avatar = player.photo
                ? `<img class="selected-slot-avatar" src="${player.photo}">`
                : `<div class="selected-slot-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 20px; background: var(--bg-secondary);">👤</div>`;

            slot.innerHTML = `
                <button class="selected-slot-remove" onclick="event.stopPropagation(); app.removeSetupPlayer(${player.id})">✕</button>
                ${avatar}
                <div class="selected-slot-name">${this.escapeHTML(player.name)}</div>
            `;
        } else {
            slot.innerHTML = `<span>Joueur ${i + 1}</span>`;
            if (i === this.selectedSetupPlayers.length) {
                slot.classList.add('active-slot');
            }
        }
    });
}

export function removeSetupPlayer(id) {
    this.selectedSetupPlayers = this.selectedSetupPlayers.filter(p => p.id !== id);
    const card = document.querySelector(`.selectable-player-card[data-id="${id}"]`);
    if (card) card.classList.remove('selected');
    this.updateSetupSelectedUI();
}
