/* ==========================================================================
   GESTION DES JOUEURS & PHOTOS
   Toutes les données sont stockées exclusivement sur l'appareil client :
   - Profils joueurs : IndexedDB (BarbuScoreDB) avec fallback localStorage
   - Parties / historique / paramètres : localStorage
   Aucune donnée n'est envoyée ni stockée sur le serveur.
   ========================================================================== */

export async function toggleWebcam() {
    if (this.webcamStream) {
        this.stopWebcam();
        return;
    }
    // Caméra avant par défaut (selfie)
    this._webcamFacing = this._webcamFacing || 'user';
    await this._startWebcam(this._webcamFacing);
}

export async function _startWebcam(facingMode) {
    const video = document.getElementById('webcam-video');
    const preview = document.getElementById('photo-preview');
    const btnText = document.getElementById('webcam-btn-text');
    const captureBtn = document.getElementById('capture-btn');
    const flipBtn = document.getElementById('flip-camera-btn');
    const flipLabel = document.getElementById('flip-camera-label');

    // Arrêter le flux existant avant d'en ouvrir un nouveau
    if (this.webcamStream) {
        this.webcamStream.getTracks().forEach(t => t.stop());
        this.webcamStream = null;
    }

    try {
        this.webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
            audio: false
        });
        this._webcamFacing = facingMode;

        video.srcObject = this.webcamStream;
        video.classList.remove('hidden');
        preview.classList.add('hidden');
        btnText.textContent = "Annuler";
        captureBtn.classList.remove('hidden');

        // Afficher le bouton flip uniquement si l'appareil a plusieurs caméras
        this._checkMultipleCameras().then(hasMultiple => {
            if (hasMultiple) {
                flipBtn.classList.remove('hidden');
                flipLabel.textContent = facingMode === 'user' ? 'Dos' : 'Avant';
            }
        });
    } catch (err) {
        console.error("Erreur d'accès à la caméra:", err);
        alert("Impossible d'accéder à la caméra. Veuillez importer une photo depuis votre galerie.");
    }
}

export async function _checkMultipleCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        return videoInputs.length > 1;
    } catch {
        return false;
    }
}

export async function flipCamera() {
    const newFacing = this._webcamFacing === 'user' ? 'environment' : 'user';
    await this._startWebcam(newFacing);
}

export function stopWebcam() {
    const video = document.getElementById('webcam-video');
    const preview = document.getElementById('photo-preview');
    const btnText = document.getElementById('webcam-btn-text');
    const captureBtn = document.getElementById('capture-btn');
    const flipBtn = document.getElementById('flip-camera-btn');

    if (this.webcamStream) {
        this.webcamStream.getTracks().forEach(track => track.stop());
        this.webcamStream = null;
    }

    video.srcObject = null;
    video.classList.add('hidden');
    preview.classList.remove('hidden');
    btnText.textContent = "Caméra";
    captureBtn.classList.add('hidden');
    flipBtn.classList.add('hidden');
}

export function capturePhoto() {
    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('photo-canvas');
    const preview = document.getElementById('photo-preview');
    const context = canvas.getContext('2d');

    const size = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    canvas.width = 200;
    canvas.height = 200;
    context.drawImage(video, startX, startY, size, size, 0, 0, 200, 200);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

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

            // naturalWidth/naturalHeight peuvent valoir 0 pour les SVG sans dimensions explicites
            // → on force une taille de rendu cohérente
            const srcW = img.naturalWidth > 0 ? img.naturalWidth : 300;
            const srcH = img.naturalHeight > 0 ? img.naturalHeight : 300;
            const size = Math.min(srcW, srcH);
            const startX = (srcW - size) / 2;
            const startY = (srcH - size) / 2;

            canvas.width = 200;
            canvas.height = 200;
            context.clearRect(0, 0, 200, 200);
            context.drawImage(img, startX, startY, size, size, 0, 0, 200, 200);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            const preview = document.getElementById('photo-preview');
            preview.innerHTML = `<img src="${dataUrl}" alt="Photo de profil">`;
            preview.dataset.photo = dataUrl;
        };
        img.onerror = () => {
            alert("Impossible de charger cette image. Essayez un autre format (JPG, PNG, WebP).");
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

    let playerData;
    if (this.editingPlayerId) {
        // Mode édition : conserver les stats existantes
        const players = await this.getAllPlayers();
        const existing = players.find(p => p.id === this.editingPlayerId);
        playerData = {
            id: this.editingPlayerId,
            name,
            photo,
            gamesPlayed: existing ? (existing.gamesPlayed || 0) : 0,
            wins: existing ? (existing.wins || 0) : 0
        };
    } else {
        playerData = { name, photo, gamesPlayed: 0, wins: 0 };
    }

    const saved = await this.savePlayerToDB(playerData);
    if (saved) {
        this._resetPlayerForm();
        await this.refreshPlayersList();
        this.updateStatsOverview();
    } else {
        alert("Erreur lors de la sauvegarde du joueur.");
    }
}

export async function editPlayer(id) {
    const players = await this.getAllPlayers();
    const player = players.find(p => p.id === id);
    if (!player) return;

    this.editingPlayerId = id;

    // Pré-remplir le formulaire
    document.getElementById('player-name').value = player.name;
    document.getElementById('player-form-title').textContent = `Modifier "${player.name}"`;
    document.getElementById('player-form-submit').textContent = 'Enregistrer les modifications';
    document.getElementById('player-form-cancel').classList.remove('hidden');

    const preview = document.getElementById('photo-preview');
    if (player.photo) {
        preview.innerHTML = `<img src="${player.photo}" alt="${player.name}">`;
        preview.dataset.photo = player.photo;
    } else {
        preview.innerHTML = '👤';
        delete preview.dataset.photo;
    }

    // Remonter vers le formulaire
    document.getElementById('player-form').closest('.glass-card').scrollIntoView({ behavior: 'smooth' });
}

export function cancelEditPlayer() {
    this._resetPlayerForm();
}

export function _resetPlayerForm() {
    this.editingPlayerId = null;
    document.getElementById('player-name').value = '';
    document.getElementById('player-form-title').textContent = 'Créer un Joueur';
    document.getElementById('player-form-submit').textContent = 'Enregistrer le Joueur';
    document.getElementById('player-form-cancel').classList.add('hidden');

    const preview = document.getElementById('photo-preview');
    preview.innerHTML = '👤';
    delete preview.dataset.photo;

    // Réinitialiser l'input file pour permettre de re-sélectionner le même fichier
    const fileInput = document.getElementById('player-photo-file');
    if (fileInput) fileInput.value = '';

    this.stopWebcam();
}

export async function deletePlayer(id) {
    // Empêcher la suppression si en cours d'édition de ce joueur
    if (this.editingPlayerId === id) this.cancelEditPlayer();

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
        const isEditing = this.editingPlayerId === player.id;
        const avatar = player.photo
            ? `<img class="player-card-avatar" src="${player.photo}" alt="${player.name}">`
            : `<div class="player-card-avatar">👤</div>`;

        const card = document.createElement('div');
        card.className = `player-card${isEditing ? ' editing' : ''}`;
        card.innerHTML = `
            <button class="player-card-delete" title="Supprimer" onclick="app.deletePlayer(${player.id})">✕</button>
            <button class="player-card-edit" title="Modifier la photo" onclick="app.editPlayer(${player.id})">✏️</button>
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
