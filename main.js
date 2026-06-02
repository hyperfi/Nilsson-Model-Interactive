import { init, computeData, toggleZoom, zoomOut, resetView, draw, resize, S, showActiveStateCard } from './render.js';

// Dynamic UI controls relocation layout wrapper
function arrangeControls() {
    const controls = document.getElementById('navbar-controls-group');
    const headerPlaceholder = document.getElementById('header-controls-placeholder');
    const drawerPlaceholder = document.getElementById('drawer-controls-placeholder');
    
    if (!controls || !headerPlaceholder || !drawerPlaceholder) return;
    
    if (window.innerWidth >= 1024) {
        // Desktop Mode: Relocate controls to top navbar
        if (controls.parentNode !== headerPlaceholder) {
            headerPlaceholder.appendChild(controls);
        }
    } else {
        // Mobile Mode: Relocate controls back to slide-out drawer
        if (controls.parentNode !== drawerPlaceholder) {
            drawerPlaceholder.appendChild(controls);
        }
    }
}

async function startApp() {
    await init();

    // Core buttons and controls
    const btnComp = document.getElementById('btnComp');
    const btnZoom = document.getElementById('btnZoom');
    const btnBack = document.getElementById('btnBack');
    const btnFull = document.getElementById('btnFull');
    const selUnit = document.getElementById('selUnit');
    const inpA = document.getElementById('inpA');
    const inpDMin = document.getElementById('inpDMin');
    const inpDMax = document.getElementById('inpDMax');

    // Drawer elements & Toggles
    const settingsDrawer = document.getElementById('settings-drawer');
    const levelsDrawer = document.getElementById('levels-drawer');
    const btnToggleSettings = document.getElementById('btnToggleSettings');
    const btnToggleLevels = document.getElementById('btnToggleLevels');
    const settingsCloseBtn = document.getElementById('settingsCloseBtn');
    const levelsCloseBtn = document.getElementById('levelsCloseBtn');
    const cardCloseBtn = document.getElementById('cardCloseBtn');
    const activeStateCard = document.getElementById('active-state-card');
    const scrim = document.getElementById('scrim');

    // Event handler to close all drawers
    function closeDrawers() {
        settingsDrawer.classList.remove('open');
        levelsDrawer.classList.remove('open');
        btnToggleSettings.classList.remove('active');
        btnToggleLevels.classList.remove('active');
        scrim.classList.remove('active');
    }

    // Toggle Settings Drawer
    btnToggleSettings.addEventListener('click', () => {
        const isOpen = settingsDrawer.classList.toggle('open');
        btnToggleSettings.classList.toggle('active', isOpen);
        
        // If opening settings, close levels drawer (mobile-specific comfort)
        if (isOpen) {
            levelsDrawer.classList.remove('open');
            btnToggleLevels.classList.remove('active');
            scrim.classList.add('active');
        } else {
            scrim.classList.remove('active');
        }
    });

    // Toggle Levels Drawer
    btnToggleLevels.addEventListener('click', () => {
        const isOpen = levelsDrawer.classList.toggle('open');
        btnToggleLevels.classList.toggle('active', isOpen);
        
        // If opening levels, close settings drawer
        if (isOpen) {
            settingsDrawer.classList.remove('open');
            btnToggleSettings.classList.remove('active');
            scrim.classList.add('active');
        } else {
            scrim.classList.remove('active');
        }
    });

    // Close buttons & Scrim
    settingsCloseBtn.addEventListener('click', closeDrawers);
    levelsCloseBtn.addEventListener('click', closeDrawers);
    scrim.addEventListener('click', closeDrawers);
    
    // Active State Card Close
    cardCloseBtn.addEventListener('click', () => {
        activeStateCard.classList.add('hidden');
        S.hover = null;
        draw();
    });

    // Re-compute and update calculations
    btnComp.addEventListener('click', () => {
        computeData();
        if (window.innerWidth < 1024) {
            closeDrawers();
        }
    });

    // Automatic re-compute on input parameter changes to reduce friction
    inpA.addEventListener('change', computeData);
    inpDMin.addEventListener('change', computeData);
    inpDMax.addEventListener('change', computeData);

    // Zooming & Units
    btnZoom.addEventListener('click', () => toggleZoom());
    btnBack.addEventListener('click', () => zoomOut());
    btnFull.addEventListener('click', () => resetView());
    
    selUnit.addEventListener('change', function () { 
        S.unit = this.value; 
        draw(); 
    });

    // Custom Parameter Set Dropdown Selection
    const customParamSet = document.getElementById('customParamSet');
    if (customParamSet) {
        const trigger = customParamSet.querySelector('.custom-select-trigger');
        const triggerText = trigger.querySelector('span');
        const options = customParamSet.querySelectorAll('.custom-option');

        trigger.addEventListener('click', (e) => {
            customParamSet.classList.toggle('open');
            e.stopPropagation();
        });

        options.forEach(opt => {
            opt.addEventListener('click', function() {
                options.forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                triggerText.textContent = this.textContent;
                customParamSet.classList.remove('open');
                
                S.paramSet = this.getAttribute('data-value');
                computeData();
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            customParamSet.classList.remove('open');
        });
    }

    // Nucleon Type Toggle
    const nucleonBtns = document.querySelectorAll('#nucleonToggle .toggle-btn');
    nucleonBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            nucleonBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            S.nucleonType = this.getAttribute('data-val');
            computeData();
        });
    });

    // Density of States (DOS) overlay toggle
    const btnToggleDOS = document.getElementById('btnToggleDOS');
    if (btnToggleDOS) {
        btnToggleDOS.addEventListener('click', () => {
            S.showDOS = !S.showDOS;
            btnToggleDOS.classList.toggle('active', S.showDOS);
            draw();
        });
    }

    // 3D Shape Viewer expand on click
    const shapeViewerContainer = document.getElementById('shape-viewer-container');
    if (shapeViewerContainer) {
        shapeViewerContainer.addEventListener('click', () => {
            shapeViewerContainer.classList.toggle('expanded');
        });
    }

    // Double-click delta labels/displays to reset value to 0
    const dvText = document.getElementById('dv');
    const dsLabel = document.querySelector('label[for="ds"]');
    const dsSlider = document.getElementById('ds');

    function resetDeltaToZero() {
        if (!dsSlider) return;
        S.delta = 0;
        dsSlider.value = 0;
        if (dvText) {
            dvText.textContent = 'δ = 0.000';
        }
        if (S.selected) {
            showActiveStateCard(S.selected, 0);
        }
        draw();
    }

    if (dvText) dvText.addEventListener('dblclick', resetDeltaToZero);
    if (dsLabel) dsLabel.addEventListener('dblclick', resetDeltaToZero);

    // Initial controls layout arrangement
    arrangeControls();
    window.addEventListener('resize', arrangeControls);

    // Initial run & sizing
    computeData();
    resize();
}

// Robust execution trigger checking document readyState
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
