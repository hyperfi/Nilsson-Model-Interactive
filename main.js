import { init, computeData, toggleZoom, zoomOut, resetView, draw, resize, S } from './render.js';

window.addEventListener('DOMContentLoaded', async () => {
    await init();

    // Wire controls that previously used inline handlers
    const btnComp = document.getElementById('btnComp');
    const btnZoom = document.getElementById('btnZoom');
    const btnBack = document.getElementById('btnBack');
    const btnFull = document.getElementById('btnFull');
    const selUnit = document.getElementById('selUnit');

    btnComp.addEventListener('click', () => computeData());
    btnZoom.addEventListener('click', () => toggleZoom());
    btnBack.addEventListener('click', () => zoomOut());
    btnFull.addEventListener('click', () => resetView());
    selUnit.addEventListener('change', function () { S.unit = this.value; draw(); });

    // Initial run & sizing
    computeData();
    resize();
});
