export function initDB() {
    return new Promise((resolve) => {
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
            this.db = null;
            resolve();
        };
    });
}

export function getAllPlayers() {
    return new Promise((resolve) => {
        if (!this.db) {
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

export function savePlayerToDB(player) {
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
        const request = player.id ? store.put(player) : store.add(player);

        request.onsuccess = (e) => {
            player.id = player.id || e.target.result;
            resolve(player);
        };
        request.onerror = () => resolve(null);
    });
}

export function deletePlayerFromDB(id) {
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
