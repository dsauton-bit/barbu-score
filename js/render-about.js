import { APP_VERSION, BUILD_DATE } from './version.js';

export function renderAboutScreen() {
    const vEl = document.getElementById('about-version');
    if (vEl) vEl.textContent = `v${APP_VERSION} — ${BUILD_DATE}`;

    const yEl = document.getElementById('about-year');
    if (yEl) yEl.textContent = new Date().getFullYear();
}
