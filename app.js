/**
 * BARBU SCORE - LOGIQUE APPLICATIVE SPA
 */

class BarbuApp {
    constructor() {
        this.db = null;
        this.settings = null;
        this.activeGame = null;
        this.selectedSetupPlayers = [];
        this.webcamStream = null;
        this.dbName = 'BarbuScoreDB';
        this.dbVersion = 1;
        
        // Liste des contrats disponibles dans le jeu du Barbu
        this.CONTRACT_KEYS = {
            BARBU: 'barbu',
            DAMES: 'dames',
            PLIS: 'plis',
            COEURS: 'coeurs',
            LAST_TRICK: 'dernier_pli',
            SALAD: 'salade',
            REUSSITE: 'reussite'
        };

        this.CONTRACT_LABELS = {
            [this.CONTRACT_KEYS.BARBU]: 'Le Barbu 👑',
            [this.CONTRACT_KEYS.DAMES]: 'Pas de Dames 👸',
            [this.CONTRACT_KEYS.PLIS]: 'Pas de Plis 🃏',
            [this.CONTRACT_KEYS.COEURS]: 'Pas de Cœurs ♥️',
            [this.CONTRACT_KEYS.LAST_TRICK]: 'Dernier Pli ☠️',
            [this.CONTRACT_KEYS.SALAD]: 'La Salade 🥗',
            [this.CONTRACT_KEYS.REUSSITE]: 'La Réussite 🌟'
        };

        // Raccourcis DOM
        this.screens = {};
        this.navButtons = [];
    }

    // Initialisation globale
    async init() {
        this.initDOM();
        await this.initDB();
        this.loadSettings();
        this.loadActiveGame();
        this.updateStatsOverview();
        
        // Rediriger vers l'accueil ou reprendre la partie active
        if (this.activeGame) {
            this.showResumeButton(true);
            if (this.activeGame.activeRound) {
                this.navigate('score-input');
            } else {
                this.navigate('game');
            }
        } else {
            this.navigate('home');
        }
        
        // Paramètres réactifs (calcul de la salade automatique)
        this.setupSettingsListeners();
    }

    initDOM() {
        // Sélectionner tous les écrans
        document.querySelectorAll('.screen').forEach(screen => {
            this.screens[screen.id.replace('screen-', '')] = screen;
        });

        // Boutons de navigation
        this.navButtons = document.querySelectorAll('.nav-btn');
    }

    // Initialisation d'IndexedDB pour les profils joueurs
    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('players')) {
                    db.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                // Fallback en mémoire si IndexedDB échoue
                this.db = null;
                resolve();
            };
        });
    }

    /* ==========================================================================
       GESTION DES JOUEURS & PHOTOS (INDEXEDDB)
       ========================================================================== */

    getAllPlayers() {
        return new Promise((resolve) => {
            if (!this.db) {
                // Fallback LocalStorage si IndexedDB n'est pas dispo
                const fallback = localStorage.getItem('barbu_players_fallback');
                resolve(fallback ? JSON.parse(fallback) : []);
                return;
            }

            const transaction = this.db.transaction(['players'], 'readonly');
            const store = transaction.objectStore('players');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        });
    }

    savePlayerToDB(player) {
        return new Promise((resolve) => {
            if (!this.db) {
                const players = JSON.parse(localStorage.getItem('barbu_players_fallback') || '[]');
                player.id = player.id || Date.now();
                const idx = players.findIndex(p => p.id === player.id);
                if (idx > -1) players[idx] = player;
                else players.push(player);
                localStorage.setItem('barbu_players_fallback', JSON.stringify(players));
                resolve(player);
                return;
            }

            const transaction = this.db.transaction(['players'], 'readwrite');
            const store = transaction.objectStore('players');
            let request;
            
            if (player.id) {
                request = store.put(player);
            } else {
                request = store.add(player);
            }

            request.onsuccess = (e) => {
                player.id = player.id || e.target.result;
                resolve(player);
            };
            request.onerror = () => resolve(null);
        });
    }

    deletePlayerFromDB(id) {
        return new Promise((resolve) => {
            if (!this.db) {
                let players = JSON.parse(localStorage.getItem('barbu_players_fallback') || '[]');
                players = players.filter(p => p.id !== id);
                localStorage.setItem('barbu_players_fallback', JSON.stringify(players));
                resolve(true);
                return;
            }

            const transaction = this.db.transaction(['players'], 'readwrite');
            const store = transaction.objectStore('players');
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }

    // Capture Photo via Webcam
    async toggleWebcam() {
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

    stopWebcam() {
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

    capturePhoto() {
        const video = document.getElementById('webcam-video');
        const canvas = document.getElementById('photo-canvas');
        const preview = document.getElementById('photo-preview');
        const context = canvas.getContext('2d');

        // Récupérer les dimensions et recadrer en carré central
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;

        context.drawImage(video, startX, startY, size, size, 0, 0, 300, 300);
        
        // Exporter en JPEG basse résolution pour garder IndexedDB léger
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        preview.innerHTML = `<img src="${dataUrl}" alt="Photo de profil">`;
        preview.dataset.photo = dataUrl;
        
        this.stopWebcam();
    }

    handlePhotoImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.getElementById('photo-canvas');
                const context = canvas.getContext('2d');
                
                // Recadrage en carré
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

    async savePlayer(event) {
        event.preventDefault();
        const nameInput = document.getElementById('player-name');
        const preview = document.getElementById('photo-preview');
        
        const name = nameInput.value.trim();
        const photo = preview.dataset.photo || null; // Base64 de l'image ou null

        if (!name) return;

        const player = {
            name,
            photo,
            gamesPlayed: 0,
            wins: 0
        };

        const saved = await this.savePlayerToDB(player);
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

    async deletePlayer(id) {
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

    async refreshPlayersList() {
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

    /* ==========================================================================
       GESTION DES RÈGLES & PARAMÈTRES
       ========================================================================== */

    loadSettings() {
        const defaults = {
            [this.CONTRACT_KEYS.BARBU]: -40,
            [this.CONTRACT_KEYS.DAMES]: -6,
            [this.CONTRACT_KEYS.PLIS]: -2,
            [this.CONTRACT_KEYS.PLIS + '_bonus']: 70,
            [this.CONTRACT_KEYS.COEURS]: -2,
            [this.CONTRACT_KEYS.LAST_TRICK]: -20,
            [this.CONTRACT_KEYS.SALAD + '_total']: -116,
            [this.CONTRACT_KEYS.SALAD + '_capot']: -130,
            [this.CONTRACT_KEYS.REUSSITE]: [100, 50, 0, 0]
        };

        const saved = localStorage.getItem('barbu_settings');
        this.settings = saved ? JSON.parse(saved) : defaults;

        // Préremplir le formulaire
        document.getElementById('setting-val-barbu').value = this.settings[this.CONTRACT_KEYS.BARBU];
        document.getElementById('setting-val-dame').value = this.settings[this.CONTRACT_KEYS.DAMES];
        document.getElementById('setting-val-plis').value = this.settings[this.CONTRACT_KEYS.PLIS];
        document.getElementById('setting-val-plis-bonus').value = this.settings[this.CONTRACT_KEYS.PLIS + '_bonus'] || 70;
        document.getElementById('setting-val-coeurs').value = this.settings[this.CONTRACT_KEYS.COEURS];
        document.getElementById('setting-val-dernier-pli').value = this.settings[this.CONTRACT_KEYS.LAST_TRICK];
        
        document.getElementById('setting-val-salad-total').value = this.settings[this.CONTRACT_KEYS.SALAD + '_total'] || -116;
        document.getElementById('setting-val-salad-capot').value = this.settings[this.CONTRACT_KEYS.SALAD + '_capot'] || -130;

        document.getElementById('setting-val-r1').value = this.settings[this.CONTRACT_KEYS.REUSSITE][0];
        document.getElementById('setting-val-r2').value = this.settings[this.CONTRACT_KEYS.REUSSITE][1];
        document.getElementById('setting-val-r3').value = this.settings[this.CONTRACT_KEYS.REUSSITE][2];
        document.getElementById('setting-val-r4').value = this.settings[this.CONTRACT_KEYS.REUSSITE][3];

        this.updateSaladDisplay();
    }

    setupSettingsListeners() {
        const inputs = [
            'setting-val-barbu',
            'setting-val-dame',
            'setting-val-plis',
            'setting-val-coeurs',
            'setting-val-dernier-pli'
        ];

        inputs.forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateSaladDisplay());
        });
    }

    updateSaladDisplay() {
        const barbu = parseInt(document.getElementById('setting-val-barbu').value) || 0;
        const dame = parseInt(document.getElementById('setting-val-dame').value) || 0;
        const plis = parseInt(document.getElementById('setting-val-plis').value) || 0;
        const coeurs = parseInt(document.getElementById('setting-val-coeurs').value) || 0;
        const dernierPli = parseInt(document.getElementById('setting-val-dernier-pli').value) || 0;

        const totalDames = dame * 4;
        const totalPlis = plis * 8;
        const totalCoeurs = coeurs * 8;
        const totalSalad = barbu + totalDames + totalPlis + totalCoeurs + dernierPli;

        document.getElementById('setting-total-dames').textContent = totalDames;
        document.getElementById('setting-total-plis').textContent = totalPlis;
        document.getElementById('setting-total-coeurs').textContent = totalCoeurs;
        document.getElementById('setting-total-salad').textContent = totalSalad;
    }

    saveSettings(event) {
        event.preventDefault();
        
        const barbu = parseInt(document.getElementById('setting-val-barbu').value);
        const dame = parseInt(document.getElementById('setting-val-dame').value);
        const plis = parseInt(document.getElementById('setting-val-plis').value);
        const plisBonus = parseInt(document.getElementById('setting-val-plis-bonus').value);
        const coeurs = parseInt(document.getElementById('setting-val-coeurs').value);
        const dernierPli = parseInt(document.getElementById('setting-val-dernier-pli').value);

        const saladTotal = parseInt(document.getElementById('setting-val-salad-total').value);
        const saladCapot = parseInt(document.getElementById('setting-val-salad-capot').value);

        const r1 = parseInt(document.getElementById('setting-val-r1').value);
        const r2 = parseInt(document.getElementById('setting-val-r2').value);
        const r3 = parseInt(document.getElementById('setting-val-r3').value);
        const r4 = parseInt(document.getElementById('setting-val-r4').value);

        this.settings = {
            [this.CONTRACT_KEYS.BARBU]: barbu,
            [this.CONTRACT_KEYS.DAMES]: dame,
            [this.CONTRACT_KEYS.PLIS]: plis,
            [this.CONTRACT_KEYS.PLIS + '_bonus']: plisBonus,
            [this.CONTRACT_KEYS.COEURS]: coeurs,
            [this.CONTRACT_KEYS.LAST_TRICK]: dernierPli,
            [this.CONTRACT_KEYS.SALAD + '_total']: saladTotal,
            [this.CONTRACT_KEYS.SALAD + '_capot']: saladCapot,
            [this.CONTRACT_KEYS.REUSSITE]: [r1, r2, r3, r4]
        };

        localStorage.setItem('barbu_settings', JSON.stringify(this.settings));
        alert("Paramètres de jeu sauvegardés !");
    }

    resetSettingsDefault() {
        localStorage.removeItem('barbu_settings');
        this.loadSettings();
    }

    /* ==========================================================================
       NOUVELLE PARTIE / CONFIGURATION
       ========================================================================== */

    async prepareGameSetup() {
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

    toggleSetupPlayer(player, cardElement) {
        const index = this.selectedSetupPlayers.findIndex(p => p.id === player.id);

        if (index > -1) {
            // Déselectionner
            this.selectedSetupPlayers.splice(index, 1);
            cardElement.classList.remove('selected');
        } else {
            // Sélectionner (maximum 4)
            if (this.selectedSetupPlayers.length >= 4) {
                alert("Vous ne pouvez sélectionner que 4 joueurs !");
                return;
            }
            this.selectedSetupPlayers.push(player);
            cardElement.classList.add('selected');
        }

        this.updateSetupSelectedUI();
    }

    updateSetupSelectedUI() {
        const countSpan = document.getElementById('setup-selected-count');
        const startBtn = document.getElementById('start-game-btn');
        const slots = document.querySelectorAll('.selected-slot');

        countSpan.textContent = this.selectedSetupPlayers.length;
        startBtn.disabled = this.selectedSetupPlayers.length !== 4;

        // Remplir les slots
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

    removeSetupPlayer(id) {
        this.selectedSetupPlayers = this.selectedSetupPlayers.filter(p => p.id !== id);
        
        // Désélectionner dans la grille
        const card = document.querySelector(`.selectable-player-card[data-id="${id}"]`);
        if (card) card.classList.remove('selected');

        this.updateSetupSelectedUI();
    }

    // Démarrage de la partie active
    startGame() {
        if (this.selectedSetupPlayers.length !== 4) return;

        // Préparer l'objet Partie
        const players = this.selectedSetupPlayers.map((p, idx) => ({
            id: p.id,
            name: p.name,
            photo: p.photo,
            gameIndex: idx
        }));

        // Initialiser la matrice des contrats joués par chaque joueur (28 cases au total)
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
            players: players,
            scores: [0, 0, 0, 0],
            roundsPlayed: 0,
            currentDealerIndex: 0, // Joueur 1 commence par choisir
            playedContracts: playedContracts,
            activeRound: null, // Ronde en cours de saisie
            roundHistory: [],
            startDate: new Date().toISOString()
        };

        this.saveActiveGame();
        this.showResumeButton(true);
        this.navigate('game');
    }

    loadActiveGame() {
        const saved = localStorage.getItem('barbu_active_game');
        if (saved) {
            this.activeGame = JSON.parse(saved);
            if (this.activeGame && !this.activeGame.roundHistory) {
                this.activeGame.roundHistory = [];
            }
        }
    }

    saveActiveGame() {
        if (this.activeGame) {
            localStorage.setItem('barbu_active_game', JSON.stringify(this.activeGame));
        } else {
            localStorage.removeItem('barbu_active_game');
        }
    }

    resumeGame() {
        if (this.activeGame) {
            this.navigate('game');
        }
    }

    showResumeButton(show) {
        const btn = document.getElementById('resume-game-btn');
        if (show) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    }

    confirmQuitGame() {
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

    /* ==========================================================================
       DÉROULEMENT DU JEU (TABLEAU DE BORD DE PARTIE)
       ========================================================================== */

    renderGameScreen() {
        if (!this.activeGame) return;

        // 1. Mettre à jour les infos de manche
        document.getElementById('game-current-round-num').textContent = this.activeGame.roundsPlayed + 1;

        // 2. Mettre à jour le donneur / choix actuel
        const dealer = this.activeGame.players[this.activeGame.currentDealerIndex];
        document.getElementById('current-dealer-name').textContent = dealer.name;

        // 3. Dessiner le classement provisoire
        this.renderScoreboard();

        // 4. Dessiner le tableau des contrats (matrice 4x7)
        this.renderContractsGrid();
    }

    renderScoreboard() {
        const container = document.getElementById('game-scorecards-container');
        container.innerHTML = '';

        // Trier les joueurs par score décroissant pour l'affichage (sans modifier l'ordre initial du tableau de jeu)
        const sortedScores = this.activeGame.players.map((p, i) => ({
            player: p,
            score: this.activeGame.scores[i],
            originalIndex: i
        })).sort((a, b) => b.score - a.score);

        sortedScores.forEach((item, sortedIdx) => {
            const p = item.player;
            const scoreClass = item.score > 0 ? 'positive' : (item.score < 0 ? 'negative' : '');
            
            const avatar = p.photo 
                ? `<img class="score-card-avatar" src="${p.photo}">`
                : `<div class="score-card-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color)">👤</div>`;

            const rankLabels = ['1er', '2e', '3e', '4e'];

            const card = document.createElement('div');
            card.className = `score-card rank-${sortedIdx}`;
            card.innerHTML = `
                <div class="score-card-rank">${rankLabels[sortedIdx]}</div>
                ${avatar}
                <div class="score-card-details">
                    <div class="score-card-name">${this.escapeHTML(p.name)}</div>
                    <div class="score-card-value ${scoreClass}">${item.score}</div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderContractsGrid() {
        const header = document.getElementById('contracts-table-header');
        const body = document.getElementById('contracts-table-body');

        // Nettoyer
        header.innerHTML = '<th>Contrats</th>';
        body.innerHTML = '';

        // Remplir les en-têtes de joueurs
        this.activeGame.players.forEach(p => {
            const avatar = p.photo 
                ? `<img class="th-player-avatar" src="${p.photo}">`
                : `<div class="th-player-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 14px; background: var(--bg-secondary); border: 1px solid var(--border-color)">👤</div>`;

            const th = document.createElement('th');
            th.innerHTML = `
                <div class="th-player-info">
                    ${avatar}
                    <div class="th-player-name">${this.escapeHTML(p.name)}</div>
                </div>
            `;
            header.appendChild(th);
        });

        // Générer les lignes pour chaque type de contrat
        const contracts = [
            this.CONTRACT_KEYS.BARBU,
            this.CONTRACT_KEYS.DAMES,
            this.CONTRACT_KEYS.PLIS,
            this.CONTRACT_KEYS.COEURS,
            this.CONTRACT_KEYS.LAST_TRICK,
            this.CONTRACT_KEYS.SALAD,
            this.CONTRACT_KEYS.REUSSITE
        ];

        contracts.forEach(contractKey => {
            const tr = document.createElement('tr');
            
            // Label du contrat
            const labelTd = document.createElement('td');
            labelTd.innerHTML = `<strong>${this.CONTRACT_LABELS[contractKey]}</strong>`;
            tr.appendChild(labelTd);

            // Cellule pour chaque joueur
            this.activeGame.players.forEach(p => {
                const td = document.createElement('td');
                const score = this.activeGame.playedContracts[p.gameIndex][contractKey];
                const isDealer = p.gameIndex === this.activeGame.currentDealerIndex;

                if (score !== null) {
                    // Contrat déjà joué, afficher le score obtenu (cliquer pour modifier)
                    const scoreSign = score > 0 ? `+${score}` : score;
                    const scoreClass = score > 0 ? 'positive-score' : (score < 0 ? 'negative-score' : '');
                    td.innerHTML = `
                        <button class="contract-cell-btn played ${scoreClass}" 
                                onclick="app.openEditRoundModal('${contractKey}', ${p.gameIndex})">
                            ${scoreSign}
                        </button>
                    `;
                } else if (isDealer) {
                    // Contrat disponible pour le donneur actif
                    td.innerHTML = `
                        <button class="contract-cell-btn available-to-choose" 
                                onclick="app.selectContract('${contractKey}', ${p.gameIndex})">
                            Jouer
                        </button>
                    `;
                } else {
                    // Contrat disponible mais pour un autre joueur (bloqué)
                    td.innerHTML = `<button class="contract-cell-btn disabled" disabled>Disponible</button>`;
                }
                tr.appendChild(td);
            });

            body.appendChild(tr);
        });
    }

    selectContract(contractKey, chooserIndex) {
        this.activeGame.activeRound = {
            contract: contractKey,
            chooserIndex: chooserIndex,
            scores: [0, 0, 0, 0] // Valeurs de saisie brutes temporaires
        };

        this.saveActiveGame();
        this.navigate('score-input');
    }

    /* ==========================================================================
       SAISIE DES SCORES ET VALIDATION DYNAMIQUE
       ========================================================================== */

    renderScoreInputScreen() {
        if (!this.activeGame || !this.activeGame.activeRound) return;

        const round = this.activeGame.activeRound;
        const contract = round.contract;
        const chooser = this.activeGame.players[round.chooserIndex];

        document.getElementById('input-contract-name').textContent = this.CONTRACT_LABELS[contract];
        document.getElementById('input-chooser-name').textContent = chooser.name;

        const container = document.getElementById('score-input-form-container');
        container.innerHTML = '';

        // Générer le formulaire selon le contrat
        switch (contract) {
            case this.CONTRACT_KEYS.BARBU:
            case this.CONTRACT_KEYS.LAST_TRICK:
                this.renderSingleSelectForm(container);
                break;
            case this.CONTRACT_KEYS.DAMES:
            case this.CONTRACT_KEYS.PLIS:
            case this.CONTRACT_KEYS.COEURS:
                this.renderStepperForm(container, contract);
                break;
            case this.CONTRACT_KEYS.SALAD:
                this.renderSaladForm(container);
                break;
            case this.CONTRACT_KEYS.REUSSITE:
                this.renderRankForm(container);
                break;
        }

        // Première validation
        this.validateInputScores();
    }

    // Formulaire de type : Sélectionnez l'unique coupable (Barbu ou Dernier Pli)
    renderSingleSelectForm(container) {
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
            
            // Sélectionner si c'était lui qui avait la valeur de pénalité de base
            if (round.scores[p.gameIndex] === 1) {
                card.classList.add('selected');
            }

            const avatar = p.photo 
                ? `<img class="score-card-avatar" src="${p.photo}">`
                : `<div class="score-card-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color)">👤</div>`;

            card.innerHTML = `
                ${avatar}
                <div class="input-player-name">${this.escapeHTML(p.name)}</div>
            `;

            card.onclick = () => {
                // Réinitialiser tout le monde
                round.scores = [0, 0, 0, 0];
                round.scores[p.gameIndex] = 1; // 1 signifie "a pris la pénalité"
                
                grid.querySelectorAll('.radio-card').forEach(el => el.classList.remove('selected'));
                card.classList.add('selected');
                
                this.validateInputScores();
                this.saveActiveGame();
            };

            grid.appendChild(card);
        });

        container.appendChild(grid);
    }

    // Formulaire de type : Compteurs de quantité (Dames, Plis, Cœurs)
    renderStepperForm(container, contract) {
        const round = this.activeGame.activeRound;
        
        let maxVal = 8;
        let unit = 'plis';
        if (contract === this.CONTRACT_KEYS.DAMES) { maxVal = 4; unit = 'Dames'; }
        if (contract === this.CONTRACT_KEYS.COEURS) { maxVal = 8; unit = 'Cœurs'; }

        const desc = document.createElement('p');
        desc.className = 'text-muted text-center mb-4';
        desc.textContent = `Indiquez la répartition des ${maxVal} ${unit} parmi les joueurs :`;
        container.appendChild(desc);

        const stepperList = document.createElement('div');
        stepperList.className = 'score-input-row';

        this.activeGame.players.forEach(p => {
            const val = round.scores[p.gameIndex] || 0;

            const row = document.createElement('div');
            row.className = 'input-player-row';

            const avatar = p.photo 
                ? `<img class="input-player-avatar" src="${p.photo}">`
                : `<div class="input-player-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color)">👤</div>`;

            row.innerHTML = `
                <div class="input-player-info">
                    ${avatar}
                    <span class="input-player-name">${this.escapeHTML(p.name)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
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

    stepVal(playerIndex, delta, maxLimit) {
        const round = this.activeGame.activeRound;
        let current = round.scores[playerIndex] || 0;
        
        current += delta;
        if (current < 0) current = 0;
        if (current > maxLimit) current = maxLimit;

        round.scores[playerIndex] = current;
        document.getElementById(`stepper-val-${playerIndex}`).textContent = current;

        this.validateInputScores();
        this.saveActiveGame();
    }

    assignAll(playerIndex, maxVal) {
        const round = this.activeGame.activeRound;
        this.activeGame.players.forEach(p => {
            round.scores[p.gameIndex] = (p.gameIndex === playerIndex) ? maxVal : 0;
            const element = document.getElementById(`stepper-val-${p.gameIndex}`);
            if (element) {
                element.textContent = round.scores[p.gameIndex];
            }
        });
        this.validateInputScores();
        this.saveActiveGame();
    }

    // Formulaire de saisie directe des points de la Salade
    renderSaladForm(container) {
        const round = this.activeGame.activeRound;
        
        // Initialiser avec des zéros si nécessaire (au format points directement)
        if (!round.scores || round.scores.length !== 4) {
            round.scores = [0, 0, 0, 0];
        }

        const desc = document.createElement('p');
        desc.className = 'text-muted text-center mb-4';
        const targetTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_total'] || -116;
        const capotTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_capot'] || -130;
        desc.innerHTML = `Saisissez directement les points de la Salade pour chaque joueur.<br>
            Le total doit être égal à <strong>${targetTotal}</strong> points (ou <strong>${capotTotal}</strong> points si un joueur a fait Capot).`;
        container.appendChild(desc);

        const list = document.createElement('div');
        list.className = 'score-input-row';

        this.activeGame.players.forEach(p => {
            const val = round.scores[p.gameIndex] || 0;

            const row = document.createElement('div');
            row.className = 'input-player-row';

            const avatar = p.photo 
                ? `<img class="input-player-avatar" src="${p.photo}">`
                : `<div class="input-player-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color)">👤</div>`;

            row.innerHTML = `
                <div class="input-player-info">
                    ${avatar}
                    <span class="input-player-name">${this.escapeHTML(p.name)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="app.saladCapotAssign(${p.gameIndex}, ${capotTotal})">Capot</button>
                    <input type="number" class="salad-score-input" id="salad-score-input-${p.gameIndex}" 
                           value="${val}" style="width: 80px; text-align: center; padding: 6px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.2); color: white;"
                           oninput="app.saladDirectInput(${p.gameIndex}, this.value)">
                </div>
            `;
            list.appendChild(row);
        });

        container.appendChild(list);
    }

    saladCapotAssign(playerIndex, capotTotal) {
        const round = this.activeGame.activeRound;
        this.activeGame.players.forEach(p => {
            round.scores[p.gameIndex] = (p.gameIndex === playerIndex) ? capotTotal : 0;
            const input = document.getElementById(`salad-score-input-${p.gameIndex}`);
            if (input) {
                input.value = round.scores[p.gameIndex];
            }
        });
        this.validateInputScores();
        this.saveActiveGame();
    }

    saladDirectInput(playerIndex, val) {
        const round = this.activeGame.activeRound;
        let num = parseInt(val) || 0;
        if (num > 0) {
            num = -num;
            const input = document.getElementById(`salad-score-input-${playerIndex}`);
            if (input) {
                input.value = num;
            }
        }
        round.scores[playerIndex] = num;
        this.validateInputScores();
        this.saveActiveGame();
    }

    // Formulaire de classement unique (Réussite / Domino)
    renderRankForm(container) {
        const round = this.activeGame.activeRound;
        
        // Initialiser avec des rangs null si nécessaire
        // round.scores stocke le rang (0 à 3, signifiant 1er, 2e, 3e, 4e)
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

            const row = document.createElement('div');
            row.className = 'rank-row';

            const avatar = p.photo ? `<img class="input-player-avatar" src="${p.photo}">` : `<div class="input-player-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 14px; background: var(--bg-secondary);">👤</div>`;
            
            row.innerHTML = `
                <div class="input-player-info" style="justify-self: start;">
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

    setRank(playerIndex, rank) {
        const round = this.activeGame.activeRound;
        
        // Si ce rang est déjà attribué à quelqu'un d'autre, on le désactive pour l'autre
        round.scores.forEach((currentRank, idx) => {
            if (currentRank === rank) {
                round.scores[idx] = null;
            }
        });

        round.scores[playerIndex] = rank;
        
        // Rafraîchir l'affichage du formulaire de rang sans reconstruire complètement tout le DOM
        const rows = document.querySelectorAll('.rank-row');
        this.activeGame.players.forEach(p => {
            const currentRank = round.scores[p.gameIndex];
            const btns = rows[p.gameIndex].querySelectorAll('.rank-option-btn');
            btns.forEach((btn, rIdx) => {
                if (currentRank === rIdx) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });

        this.validateInputScores();
        this.saveActiveGame();
    }

    // Validation syntaxique et logique des saisies de score
    validateInputScores() {
        const round = this.activeGame.activeRound;
        const contract = round.contract;
        const msgBox = document.getElementById('score-input-validation-msg');
        const submitBtn = document.getElementById('submit-scores-btn');

        let isValid = false;
        let errorMsg = "";

        if (contract === this.CONTRACT_KEYS.BARBU || contract === this.CONTRACT_KEYS.LAST_TRICK) {
            // Un et un seul joueur doit être sélectionné
            const sum = round.scores.reduce((a, b) => a + b, 0);
            if (sum === 1) {
                isValid = true;
            } else {
                errorMsg = "Veuillez désigner le joueur pénalisé.";
            }
        } 
        else if (contract === this.CONTRACT_KEYS.DAMES) {
            const sum = round.scores.reduce((a, b) => a + b, 0);
            if (sum === 4) {
                isValid = true;
            } else {
                errorMsg = `Le total des Dames saisies doit être égal à 4 (Actuel : ${sum}).`;
            }
        } 
        else if (contract === this.CONTRACT_KEYS.PLIS) {
            const sum = round.scores.reduce((a, b) => a + b, 0);
            if (sum === 8) {
                isValid = true;
            } else {
                errorMsg = `Le total des Plis saisis doit être égal à 8 (Actuel : ${sum}).`;
            }
        } 
        else if (contract === this.CONTRACT_KEYS.COEURS) {
            const sum = round.scores.reduce((a, b) => a + b, 0);
            if (sum === 8) {
                isValid = true;
            } else {
                errorMsg = `Le total des Cœurs saisis doit être égal à 8 (Actuel : ${sum}).`;
            }
        } 
        else if (contract === this.CONTRACT_KEYS.SALAD) {
            const sum = round.scores.reduce((a, b) => a + b, 0);
            const targetTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_total'] || -116;
            const capotTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_capot'] || -130;

            const capotPlayerIndex = round.scores.findIndex(val => val === capotTotal);
            const othersZero = round.scores.every((val, idx) => idx === capotPlayerIndex || val === 0);

            if (sum === targetTotal) {
                isValid = true;
            } else if (capotPlayerIndex > -1 && othersZero) {
                isValid = true;
            } else {
                errorMsg = `Le total de la Salade doit faire ${targetTotal} (Actuel : ${sum}), ou un joueur doit avoir ${capotTotal} seul.`;
            }
        } 
        else if (contract === this.CONTRACT_KEYS.REUSSITE) {
            // Tous les rangs doivent être définis et uniques
            const ranks = round.scores.filter(r => r !== null);
            if (ranks.length === 4) {
                isValid = true;
            } else {
                errorMsg = "Veuillez attribuer un rang d'arrivée à chacun des 4 joueurs.";
            }
        }

        // Affichage
        if (isValid) {
            msgBox.classList.remove('active');
            submitBtn.disabled = false;
        } else {
            msgBox.textContent = errorMsg;
            msgBox.classList.add('active');
            submitBtn.disabled = true;
        }
    }

    // Calcul effectif des points à attribuer et application
    submitScores() {
        if (!this.activeGame || !this.activeGame.activeRound) return;

        const round = this.activeGame.activeRound;
        const contract = round.contract;
        const chooserIdx = round.chooserIndex;
        const finalPointsAdded = [0, 0, 0, 0];

        // Calculs des points d'après les barèmes paramétrés
        if (contract === this.CONTRACT_KEYS.BARBU) {
            const penalty = this.settings[this.CONTRACT_KEYS.BARBU]; // -40 par défaut
            round.scores.forEach((val, pIdx) => {
                if (val === 1) finalPointsAdded[pIdx] = penalty;
            });
        } 
        else if (contract === this.CONTRACT_KEYS.LAST_TRICK) {
            const penalty = this.settings[this.CONTRACT_KEYS.LAST_TRICK]; // -20 par défaut
            round.scores.forEach((val, pIdx) => {
                if (val === 1) finalPointsAdded[pIdx] = penalty;
            });
        } 
        else if (contract === this.CONTRACT_KEYS.DAMES) {
            const factor = this.settings[this.CONTRACT_KEYS.DAMES]; // -6 par défaut
            round.scores.forEach((val, pIdx) => {
                finalPointsAdded[pIdx] = val * factor;
            });
        } 
        else if (contract === this.CONTRACT_KEYS.PLIS) {
            const factor = this.settings[this.CONTRACT_KEYS.PLIS]; // -2 par défaut
            const bonus = this.settings[this.CONTRACT_KEYS.PLIS + '_bonus'] || 70;
            // Vérifier si un joueur a fait Capot (pris les 8 plis)
            const capotPlayerIndex = round.scores.findIndex(val => val === 8);
            if (capotPlayerIndex > -1) {
                round.scores.forEach((val, pIdx) => {
                    finalPointsAdded[pIdx] = (pIdx === capotPlayerIndex) ? bonus : 0;
                });
            } else {
                round.scores.forEach((val, pIdx) => {
                    finalPointsAdded[pIdx] = val * factor;
                });
            }
        } 
        else if (contract === this.CONTRACT_KEYS.COEURS) {
            const factor = this.settings[this.CONTRACT_KEYS.COEURS]; // -2 par défaut
            round.scores.forEach((val, pIdx) => {
                finalPointsAdded[pIdx] = val * factor;
            });
        } 
        else if (contract === this.CONTRACT_KEYS.SALAD) {
            // Saisie directe des points
            round.scores.forEach((val, pIdx) => {
                finalPointsAdded[pIdx] = val;
            });
        } 
        else if (contract === this.CONTRACT_KEYS.REUSSITE) {
            const ranks = this.settings[this.CONTRACT_KEYS.REUSSITE]; // [+100, +50, 0, 0]
            round.scores.forEach((rank, pIdx) => {
                finalPointsAdded[pIdx] = ranks[rank];
            });
        }

        // 1. S'assurer que roundHistory existe
        if (!this.activeGame.roundHistory) {
            this.activeGame.roundHistory = [];
        }

        // 2. Enregistrer la ronde dans l'historique de la partie
        this.activeGame.roundHistory.push({
            contract: contract,
            chooserIndex: chooserIdx,
            scoresAdded: finalPointsAdded
        });

        // 3. Recalculer les scores totaux et la grille
        this.recalculateGameScores();

        // Nettoyer la ronde active
        this.activeGame.activeRound = null;

        // 5. Sauvegarder
        this.saveActiveGame();

        // 6. Si on a fait 28 manches, c'est la fin de partie !
        if (this.activeGame.roundsPlayed === 28) {
            this.endGame();
        } else {
            this.navigate('game');
        }
    }

    /* ==========================================================================
       FIN DE PARTIE, PODIUM ET ENREGISTREMENT HISTORIQUE
       ========================================================================== */

    async endGame() {
        if (!this.activeGame) return;

        // 1. Déterminer le podium final
        const finalResults = this.activeGame.players.map((p, i) => ({
            id: p.id,
            name: p.name,
            photo: p.photo,
            score: this.activeGame.scores[i],
            gameIndex: p.gameIndex
        })).sort((a, b) => b.score - a.score);

        // 2. Sauvegarder dans l'historique global
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
        history.unshift(historyItem); // Ajouter en premier
        localStorage.setItem('barbu_history', JSON.stringify(history));

        // 3. Mettre à jour les statistiques globales des joueurs dans IndexedDB
        for (const p of this.activeGame.players) {
            const isWinner = p.id === finalResults[0].id;
            await this.updatePlayerStats(p.id, isWinner);
        }

        // 4. Nettoyer la partie en cours
        this.activeGame = null;
        this.saveActiveGame();
        this.showResumeButton(false);

        // 5. Remplir l'écran de fin
        this.renderGameOverScreen(finalResults, historyItem);
        this.navigate('game-over');
        this.updateStatsOverview();
    }

    async updatePlayerStats(playerId, isWinner) {
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

    renderGameOverScreen(finalResults, historyItem) {
        // Remplir le Podium visuel
        const podiumContainer = document.getElementById('podium-players-container');
        podiumContainer.innerHTML = '';

        // Ordre visuel du podium : 2ème (gauche), 1er (centre), 3ème (droite), 4ème (extrême droite)
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
                : `<div class="podium-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 24px; background: var(--bg-secondary); border: 2px solid var(--border-color)">👤</div>`;

            col.innerHTML = `
                ${avatar}
                <div class="podium-name">${this.escapeHTML(item.name)}</div>
                <div class="podium-score">${item.score} pts</div>
                <div class="podium-block">${item.rank}</div>
            `;
            podiumContainer.appendChild(col);
        });

        // Remplir la table de score finale
        const tableBody = document.getElementById('final-table-body');
        tableBody.innerHTML = '';

        finalResults.forEach(item => {
            // Calculer la part de points négatifs et positifs
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

            const tr = document.createElement('tr');
            const avatar = item.photo 
                ? `<img class="th-player-avatar" src="${item.photo}">`
                : `<div class="th-player-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 14px; background: var(--bg-secondary); border: 1px solid var(--border-color)">👤</div>`;

            tr.innerHTML = `
                <td>
                    ${avatar}
                    <span>${this.escapeHTML(item.name)}</span>
                </td>
                <td><strong>${item.score}</strong></td>
                <td class="text-danger">${negatives}</td>
                <td class="text-success">${positives > 0 ? `+${positives}` : 0}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    /* ==========================================================================
       ÉCRAN HISTORIQUE & STATISTIQUES
       ========================================================================== */

    renderHistoryScreen() {
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

            // Trier les joueurs du jeu par score décroissant pour identifier le podium dans le résumé
            const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);

            // Créer les cartes résumés des 4 joueurs
            let playersHtml = "";
            sortedPlayers.forEach((p, idx) => {
                const isWinner = p.id === game.winnerId;
                const avatar = p.photo 
                    ? `<img class="history-player-avatar" src="${p.photo}">`
                    : `<div class="history-player-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 12px; background: var(--bg-secondary);">👤</div>`;

                playersHtml += `
                    <div class="history-player ${isWinner ? 'winner' : ''}">
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
                <div class="history-players-row">
                    ${playersHtml}
                </div>
                <div class="history-details-expanded">
                    <!-- Tableau détaillé du score final de cette partie -->
                    <table class="contracts-table" style="font-size: 12px; border: 1px solid var(--border-color);">
                        <thead>
                            <tr>
                                <th>Contrat</th>
                                ${game.players.map(p => `<th style="font-size:11px; padding:6px 2px;">${this.escapeHTML(p.name)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(this.CONTRACT_LABELS).map(cKey => `
                                <tr>
                                    <td style="padding:6px; font-weight:normal">${this.CONTRACT_LABELS[cKey]}</td>
                                    ${game.players.map((p, pIdx) => {
                                        const scoreVal = game.playedContracts[pIdx][cKey];
                                        const scoreSign = scoreVal > 0 ? `+${scoreVal}` : (scoreVal || 0);
                                        const cellColor = scoreVal > 0 ? 'color: var(--color-success); font-weight:bold;' : (scoreVal < 0 ? 'color: var(--color-danger);' : '');
                                        return `<td style="padding:6px; ${cellColor}">${scoreSign}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            // Cliquer pour déplier le détail
            card.onclick = () => {
                card.classList.toggle('expanded');
            };

            container.appendChild(card);
        });
    }

    deleteHistory(gameId) {
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

    async updateStatsOverview() {
        const history = JSON.parse(localStorage.getItem('barbu_history') || '[]');
        const players = await this.getAllPlayers();

        // 1. Nombre de parties jouées
        document.getElementById('stat-total-games').textContent = history.length;

        // 2. Nombre de joueurs enregistrés
        document.getElementById('stat-total-players').textContent = players.length;

        // 3. Meilleur joueur (plus grand nombre de victoires ou plus haut winrate)
        let bestPlayerName = "-";
        if (players.length > 0) {
            const sorted = [...players]
                .filter(p => p.gamesPlayed > 0)
                .sort((a, b) => {
                    const winrateA = a.wins / a.gamesPlayed;
                    const winrateB = b.wins / b.gamesPlayed;
                    if (winrateB !== winrateA) return winrateB - winrateA;
                    return b.wins - a.wins; // En cas d'égalité, celui qui a le plus de victoires
                });
            if (sorted[0]) {
                const winrate = Math.round((sorted[0].wins / sorted[0].gamesPlayed) * 100);
                bestPlayerName = `${sorted[0].name} (${winrate}%)`;
            }
        }
        document.getElementById('stat-best-player').textContent = bestPlayerName;

        // 4. Remplir les cartes rapides de la page d'accueil
        const recentContainer = document.getElementById('recent-games-container');
        recentContainer.innerHTML = '';

        if (history.length === 0) {
            recentContainer.innerHTML = `<div class="empty-state"><p>Aucune partie jouée pour le moment. Lancez-vous !</p></div>`;
            return;
        }

        // Afficher max 3 parties récentes sur l'accueil
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

    /* ==========================================================================
       ROUTAGE SPA & UTILS
       ========================================================================== */

    navigate(screenId) {
        // Fermer la webcam si on quitte l'écran des joueurs
        if (screenId !== 'players') {
            this.stopWebcam();
        }

        // Toggles écrans
        for (const id in this.screens) {
            if (id === screenId) {
                this.screens[id].classList.add('active');
            } else {
                this.screens[id].classList.remove('active');
            }
        }

        // Mettre à jour les styles des boutons de nav
        this.navButtons.forEach(btn => {
            if (btn.dataset.screen === screenId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Appels spécifiques selon l'écran chargé
        if (screenId === 'players') {
            this.refreshPlayersList();
        } else if (screenId === 'setup') {
            this.prepareGameSetup();
        } else if (screenId === 'game') {
            this.renderGameScreen();
        } else if (screenId === 'score-input') {
            this.renderScoreInputScreen();
        } else if (screenId === 'history') {
            this.renderHistoryScreen();
        } else if (screenId === 'settings') {
            this.loadSettings();
        } else if (screenId === 'home') {
            this.updateStatsOverview();
        }

        // Faire défiler vers le haut
        window.scrollTo(0, 0);
    }

    // Modal de confirmation
    showConfirmModal(title, message, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        titleEl.textContent = title;
        messageEl.textContent = message;
        
        modal.classList.remove('hidden');

        confirmBtn.onclick = () => {
            onConfirm();
            modal.classList.add('hidden');
        };

        cancelBtn.onclick = () => {
            modal.classList.add('hidden');
        };
    }

    openEditRoundModal(contractKey, chooserIndex) {
        if (!this.activeGame || !this.activeGame.roundHistory) return;
        
        const round = this.activeGame.roundHistory.find(
            r => r.contract === contractKey && r.chooserIndex === chooserIndex
        );
        if (!round) return;

        // Référence de la ronde en cours d'édition
        this.editingRoundRef = round;

        // Titre et description de la modale
        document.getElementById('edit-round-title').textContent = `Modifier : ${this.CONTRACT_LABELS[contractKey]}`;
        const chooser = this.activeGame.players[chooserIndex];
        document.getElementById('edit-round-desc').innerHTML = `Manche choisie par <strong>${chooser.name}</strong>.<br>Veuillez corriger directement les points attribués :`;

        // Conteneur de saisie
        const container = document.getElementById('edit-round-inputs-container');
        container.innerHTML = '';

        this.activeGame.players.forEach(p => {
            const val = round.scoresAdded[p.gameIndex] || 0;

            const row = document.createElement('div');
            row.className = 'input-player-row';

            const avatar = p.photo 
                ? `<img class="input-player-avatar" src="${p.photo}">`
                : `<div class="input-player-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color)">👤</div>`;

            row.innerHTML = `
                <div class="input-player-info">
                    ${avatar}
                    <span class="input-player-name">${this.escapeHTML(p.name)}</span>
                </div>
                <div>
                    <input type="number" class="edit-player-score-input" id="edit-score-input-${p.gameIndex}" 
                           value="${val}" style="width: 100px; text-align: center; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.2); color: white;"
                           oninput="app.validateEditedRound()">
                </div>
            `;
            container.appendChild(row);
        });

        // Ouvrir la modale
        document.getElementById('edit-round-modal').classList.remove('hidden');
        this.validateEditedRound();
    }

    validateEditedRound() {
        if (!this.editingRoundRef) return;

        const contract = this.editingRoundRef.contract;
        const msgBox = document.getElementById('edit-round-validation-msg');
        const saveBtn = document.getElementById('edit-round-save-btn');

        const scores = [];
        this.activeGame.players.forEach(p => {
            const input = document.getElementById(`edit-score-input-${p.gameIndex}`);
            let val = parseInt(input.value) || 0;
            if (contract !== this.CONTRACT_KEYS.REUSSITE && val > 0) {
                val = -val;
                input.value = val;
            }
            scores.push(val);
        });

        const sum = scores.reduce((a, b) => a + b, 0);
        let isValid = false;
        let errorMsg = "";

        if (contract === this.CONTRACT_KEYS.BARBU) {
            const penalty = this.settings[this.CONTRACT_KEYS.BARBU];
            const hasPenalty = scores.some(v => v === penalty);
            if (sum === penalty && hasPenalty) {
                isValid = true;
            } else {
                errorMsg = `Le score total doit faire ${penalty} avec un seul joueur pénalisé.`;
            }
        }
        else if (contract === this.CONTRACT_KEYS.LAST_TRICK) {
            const penalty = this.settings[this.CONTRACT_KEYS.LAST_TRICK];
            const hasPenalty = scores.some(v => v === penalty);
            if (sum === penalty && hasPenalty) {
                isValid = true;
            } else {
                errorMsg = `Le score total doit faire ${penalty} avec un seul joueur pénalisé.`;
            }
        }
        else if (contract === this.CONTRACT_KEYS.DAMES) {
            const total = this.settings[this.CONTRACT_KEYS.DAMES] * 4;
            if (sum === total) {
                isValid = true;
            } else {
                errorMsg = `La somme des points doit être égale à ${total} (Actuel : ${sum}).`;
            }
        }
        else if (contract === this.CONTRACT_KEYS.COEURS) {
            const total = this.settings[this.CONTRACT_KEYS.COEURS] * 8;
            if (sum === total) {
                isValid = true;
            } else {
                errorMsg = `La somme des points doit être égale à ${total} (Actuel : ${sum}).`;
            }
        }
        else if (contract === this.CONTRACT_KEYS.PLIS) {
            const total = this.settings[this.CONTRACT_KEYS.PLIS] * 8;
            const bonus = this.settings[this.CONTRACT_KEYS.PLIS + '_bonus'] || 70;
            const hasBonus = scores.some(v => v === bonus);
            
            if (sum === total) {
                isValid = true;
            } else if (sum === bonus && hasBonus) {
                isValid = true;
            } else {
                errorMsg = `La somme des points doit faire ${total}, ou un joueur doit avoir le bonus capot de ${bonus} seul.`;
            }
        }
        else if (contract === this.CONTRACT_KEYS.SALAD) {
            const targetTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_total'] || -116;
            const capotTotal = this.settings[this.CONTRACT_KEYS.SALAD + '_capot'] || -130;
            const hasCapot = scores.some(v => v === capotTotal);
            if (sum === targetTotal) {
                isValid = true;
            } else if (sum === capotTotal && hasCapot) {
                isValid = true;
            } else {
                errorMsg = `La somme doit faire ${targetTotal}, ou un joueur doit avoir le score capot de ${capotTotal}.`;
            }
        }
        else if (contract === this.CONTRACT_KEYS.REUSSITE) {
            const expected = [...this.settings[this.CONTRACT_KEYS.REUSSITE]].sort((a,b)=>a-b);
            const actual = [...scores].sort((a,b)=>a-b);
            const isMatch = expected.every((val, i) => val === actual[i]);
            if (isMatch) {
                isValid = true;
            } else {
                errorMsg = `Les scores doivent correspondre aux points de Réussite : ${this.settings[this.CONTRACT_KEYS.REUSSITE].join(', ')}.`;
            }
        }

        if (isValid) {
            msgBox.classList.remove('active');
            saveBtn.disabled = false;
        } else {
            msgBox.textContent = errorMsg;
            msgBox.classList.add('active');
            saveBtn.disabled = true;
        }
    }

    saveEditedRound() {
        if (!this.editingRoundRef || !this.activeGame) return;

        const scores = [];
        this.activeGame.players.forEach(p => {
            const val = parseInt(document.getElementById(`edit-score-input-${p.gameIndex}`).value) || 0;
            scores.push(val);
        });

        // Enregistrer les scores modifiés
        this.editingRoundRef.scoresAdded = scores;

        // Recalculer tous les scores cumulés de la partie
        this.recalculateGameScores();

        // Sauvegarder localement et rafraîchir
        this.saveActiveGame();
        this.closeEditRoundModal();
        this.renderGameScreen();
    }

    closeEditRoundModal() {
        document.getElementById('edit-round-modal').classList.add('hidden');
        this.editingRoundRef = null;
    }

    recalculateGameScores() {
        if (!this.activeGame || !this.activeGame.roundHistory) return;

        // 1. Réinitialiser les scores
        this.activeGame.scores = [0, 0, 0, 0];

        // 2. Réinitialiser la matrice des contrats
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

        // 3. Ré-appliquer toutes les manches complétées
        this.activeGame.roundHistory.forEach(round => {
            this.activeGame.players.forEach(p => {
                this.activeGame.scores[p.gameIndex] += round.scoresAdded[p.gameIndex];
            });
            const chooserIdx = round.chooserIndex;
            const contract = round.contract;
            this.activeGame.playedContracts[chooserIdx][contract] = round.scoresAdded[chooserIdx];
        });

        // 4. Mettre à jour le nombre de manches
        this.activeGame.roundsPlayed = this.activeGame.roundHistory.length;

        // 5. Mettre à jour le donneur
        this.activeGame.currentDealerIndex = this.activeGame.roundsPlayed % 4;
    }

    escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialisation au chargement de la page
const app = new BarbuApp();
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
