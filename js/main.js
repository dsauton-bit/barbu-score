import { CONTRACT_KEYS, CONTRACT_LABELS } from './constants.js';
import * as storage from './storage.js';
import * as settings from './settings.js';
import * as players from './players.js';
import * as setup from './setup.js';
import * as gameEngine from './game-engine.js';
import * as renderGame from './render-game.js';
import * as renderScoreInput from './render-score-input.js';
import * as renderHistory from './render-history.js';
import * as modals from './modals.js';
import * as router from './router.js';
import { escapeHTML } from './utils.js';

class BarbuApp {
    constructor() {
        this.db = null;
        this.settings = null;
        this.activeGame = null;
        this.selectedSetupPlayers = [];
        this.webcamStream = null;
        this.editingRoundRef = null;
        this.dbName = 'BarbuScoreDB';
        this.dbVersion = 1;
        this.CONTRACT_KEYS = CONTRACT_KEYS;
        this.CONTRACT_LABELS = CONTRACT_LABELS;
        this.screens = {};
        this.navButtons = [];
    }

    async init() {
        this.initDOM();
        await this.initDB();
        this.loadSettings();
        this.loadActiveGame();
        this.updateStatsOverview();

        if (this.activeGame) {
            this.showResumeButton(true);
            this.navigate(this.activeGame.activeRound ? 'score-input' : 'game');
        } else {
            this.navigate('home');
        }

        this.setupSettingsListeners();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }
    }
}

Object.assign(BarbuApp.prototype,
    storage,
    settings,
    players,
    setup,
    gameEngine,
    renderGame,
    renderScoreInput,
    renderHistory,
    modals,
    router,
    { escapeHTML }
);

window.app = new BarbuApp();
window.addEventListener('DOMContentLoaded', () => window.app.init());
