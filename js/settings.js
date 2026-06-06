import { DEFAULT_SETTINGS } from './constants.js';

export function loadSettings() {
    const saved = localStorage.getItem('barbu_settings');
    this.settings = saved ? JSON.parse(saved) : { ...DEFAULT_SETTINGS, reussite: [...DEFAULT_SETTINGS.reussite] };

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

export function setupSettingsListeners() {
    ['setting-val-barbu', 'setting-val-dame', 'setting-val-plis', 'setting-val-coeurs', 'setting-val-dernier-pli']
        .forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.updateSaladDisplay());
        });
}

export function updateSaladDisplay() {
    const barbu = parseInt(document.getElementById('setting-val-barbu').value) || 0;
    const dame = parseInt(document.getElementById('setting-val-dame').value) || 0;
    const plis = parseInt(document.getElementById('setting-val-plis').value) || 0;
    const coeurs = parseInt(document.getElementById('setting-val-coeurs').value) || 0;
    const dernierPli = parseInt(document.getElementById('setting-val-dernier-pli').value) || 0;

    document.getElementById('setting-total-dames').textContent = dame * 4;
    document.getElementById('setting-total-plis').textContent = plis * 8;
    document.getElementById('setting-total-coeurs').textContent = coeurs * 8;
    document.getElementById('setting-total-salad').textContent = barbu + dame * 4 + plis * 8 + coeurs * 8 + dernierPli;
}

export function saveSettings(event) {
    event.preventDefault();

    this.settings = {
        [this.CONTRACT_KEYS.BARBU]: parseInt(document.getElementById('setting-val-barbu').value),
        [this.CONTRACT_KEYS.DAMES]: parseInt(document.getElementById('setting-val-dame').value),
        [this.CONTRACT_KEYS.PLIS]: parseInt(document.getElementById('setting-val-plis').value),
        [this.CONTRACT_KEYS.PLIS + '_bonus']: parseInt(document.getElementById('setting-val-plis-bonus').value),
        [this.CONTRACT_KEYS.COEURS]: parseInt(document.getElementById('setting-val-coeurs').value),
        [this.CONTRACT_KEYS.LAST_TRICK]: parseInt(document.getElementById('setting-val-dernier-pli').value),
        [this.CONTRACT_KEYS.SALAD + '_total']: parseInt(document.getElementById('setting-val-salad-total').value),
        [this.CONTRACT_KEYS.SALAD + '_capot']: parseInt(document.getElementById('setting-val-salad-capot').value),
        [this.CONTRACT_KEYS.REUSSITE]: [
            parseInt(document.getElementById('setting-val-r1').value),
            parseInt(document.getElementById('setting-val-r2').value),
            parseInt(document.getElementById('setting-val-r3').value),
            parseInt(document.getElementById('setting-val-r4').value)
        ]
    };

    localStorage.setItem('barbu_settings', JSON.stringify(this.settings));
    alert("Paramètres de jeu sauvegardés !");
}

export function resetSettingsDefault() {
    localStorage.removeItem('barbu_settings');
    this.loadSettings();
}
