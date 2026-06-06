export function initDOM() {
    document.querySelectorAll('.screen').forEach(screen => {
        this.screens[screen.id.replace('screen-', '')] = screen;
    });
    this.navButtons = document.querySelectorAll('.nav-btn');
}

export function navigate(screenId) {
    if (screenId !== 'players') this.stopWebcam();

    for (const id in this.screens) {
        this.screens[id].classList.toggle('active', id === screenId);
    }

    this.navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.screen === screenId);
    });

    if (screenId === 'players') this.refreshPlayersList();
    else if (screenId === 'setup') this.prepareGameSetup();
    else if (screenId === 'game') this.renderGameScreen();
    else if (screenId === 'score-input') this.renderScoreInputScreen();
    else if (screenId === 'history') this.renderHistoryScreen();
    else if (screenId === 'settings') this.loadSettings();
    else if (screenId === 'home') this.updateStatsOverview();
    else if (screenId === 'about') this.renderAboutScreen();

    window.scrollTo(0, 0);
}
