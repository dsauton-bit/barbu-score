export async function toggleWebcam() {
    const video = document.getElementById('webcam-video');
    const preview = document.getElementById('photo-preview');
    const btnText = document.getElementById('webcam-btn-text');
    const captureBtn = document.getElementById('capture-btn');

    if (this.webcamStream) {
        this.stopWebcam();
        return;
    }

    try {
        this.webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 300, height: 300 },
            audio: false
        });
        video.srcObject = this.webcamStream;
        video.classList.remove('hidden');
        preview.classList.add('hidden');
        btnText.textContent = "Annuler";
        captureBtn.classList.remove('hidden');
    } catch (err) {
        console.error("Erreur d'accès à la caméra:", err);
        alert("Impossible d'accéder à la caméra. Veuillez importer une photo depuis votre galerie.");
    }
}

export function stopWebcam() {
    const video = document.getElementById('webcam-video');
    const preview = document.getElementById('photo-preview');
    const btnText = document.getElementById('webcam-btn-text');
    const captureBtn = document.getElementById('capture-btn');

    if (this.webcamStream) {
        this.webcamStream.getTracks().forEach(track => track.stop());
        this.webcamStream = null;
    }

    video.srcObject = null;
    video.classList.add('hidden');
    preview.classList.remove('hidden');
    btnText.textContent = "Caméra";
    captureBtn.classList.add('hidden');
}

export function capturePhoto() {
    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('photo-canvas');
    const preview = document.getElementById('photo-preview');
    const context = canvas.getContext('2d');

    const size = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    context.drawImage(video, startX, startY, size, size, 0, 0, 300, 300);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    preview.innerHTML = `<img src="${dataUrl}" alt="Photo de profil">`;
    preview.dataset.photo = dataUrl;

    this.stopWebcam();
}

export function handlePhotoImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.getElementById('photo-canvas');
            const context = canvas.getContext('2d');
            const size = Math.min(img.width, img.height);
            const startX = (img.width - size) / 2;
            const startY = (img.height - size) / 2;

            context.drawImage(img, startX, startY, size, size, 0, 0, 150, 150);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            const preview = document.getElementById('photo-preview');
            preview.innerHTML = `<img src="${dataUrl}" alt="Photo de profil">`;
            preview.dataset.photo = dataUrl;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

export async function savePlayer(event) {
    event.preventDefault();
    const nameInput = document.getElementById('player-name');
    const preview = document.getElementById('photo-preview');

    const name = nameInput.value.trim();
    const photo = preview.dataset.photo || null;

    if (!name) return;

    const saved = await this.savePlayerToDB({ name, photo, gamesPlayed: 0, wins: 0 });
    if (saved) {
        nameInput.value = '';
        preview.innerHTML = '👤';
        delete preview.dataset.photo;
        await this.refreshPlayersList();
        this.updateStatsOverview();
    } else {
        alert("Erreur lors de la sauvegarde du joueur.");
    }
}

export async function deletePlayer(id) {
    this.showConfirmModal(
        "Supprimer le joueur",
        "Voulez-vous vraiment supprimer ce profil ? Cette action est irréversible.",
        async () => {
            await this.deletePlayerFromDB(id);
            await this.refreshPlayersList();
            this.updateStatsOverview();
        }
    );
}

export async function refreshPlayersList() {
    const container = document.getElementById('players-list-container');
    const players = await this.getAllPlayers();

    container.innerHTML = '';
    if (players.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1"><p>Aucun joueur enregistré.</p></div>`;
        return;
    }

    players.forEach(player => {
        const ratio = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
        const avatar = player.photo
            ? `<img class="player-card-avatar" src="${player.photo}" alt="${player.name}">`
            : `<div class="player-card-avatar">👤</div>`;

        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <button class="player-card-delete" onclick="app.deletePlayer(${player.id})">✕</button>
            ${avatar}
            <div class="player-card-name">${this.escapeHTML(player.name)}</div>
            <div class="player-card-stats">${player.gamesPlayed} part. / ${ratio}% vict.</div>
        `;
        container.appendChild(card);
    });
}

export async function updatePlayerStats(playerId, isWinner) {
    if (!this.db) {
        const players = JSON.parse(localStorage.getItem('barbu_players_fallback') || '[]');
        const idx = players.findIndex(p => p.id === playerId);
        if (idx > -1) {
            players[idx].gamesPlayed++;
            if (isWinner) players[idx].wins++;
            localStorage.setItem('barbu_players_fallback', JSON.stringify(players));
        }
        return;
    }

    return new Promise((resolve) => {
        const transaction = this.db.transaction(['players'], 'readwrite');
        const store = transaction.objectStore('players');
        const request = store.get(playerId);

        request.onsuccess = () => {
            const player = request.result;
            if (player) {
                player.gamesPlayed = (player.gamesPlayed || 0) + 1;
                player.wins = (player.wins || 0) + (isWinner ? 1 : 0);
                store.put(player).onsuccess = () => resolve();
            } else {
                resolve();
            }
        };
        request.onerror = () => resolve();
    });
}
