import { nilssonEnergies, sphericalStates, MAGIC, calcSphericalStates } from './physics.js';

// Shared state
export const S = {
    tracks: null, dGrid: [], hw0: 1, fullDMin: -0.4, fullDMax: 0.55, fullYMin: 1.9, fullYMax: 5.7,
    vDMin: -0.4, vDMax: 0.55, vYMin: 1.9, vYMax: 5.7, zoomHist: [], zoomMode: false, zoomDrag: null,
    delta: 0, N: 28, hover: null, selected: null, nucleonType: 'proton', showDOS: false, unit: 'hw0',
    paramSet: 'universal'
};

let cv = null, ctx = null;
let M = { L: 66, R: 92, T: 28, B: 46 };
let raf = null;

function lerp(tr, d) {
    let ds = tr.deltas, es = tr.e_hw;
    if (d <= ds[0]) return es[0]; if (d >= ds[ds.length - 1]) return es[ds.length - 1];
    let lo = 0, hi = ds.length - 1; while (hi - lo > 1) { let m = (lo + hi) >> 1; if (ds[m] <= d) lo = m; else hi = m; }
    return es[lo] + (d - ds[lo]) / (ds[hi] - ds[lo]) * (es[hi] - es[lo]);
}

function doFill(delta, N) {
    let levs = Object.entries(S.tracks).map(([lbl, tr]) => ({ lbl, e: lerp(tr, delta), par: tr.parity })).sort((a, b) => a.e - b.e);
    let fm = new Map(), rem = N; for (let lv of levs) { if (rem <= 0) break; fm.set(lv.lbl, Math.min(2, rem)); rem -= 2; }
    return { levs, fm };
}

function niceStep(range, target) { let raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }

export function resize() { 
    if (!cv) return; 
    let wr = document.getElementById('wrap'); 
    cv.width = wr.clientWidth; 
    cv.height = wr.clientHeight; 
    
    // Dynamic responsive margins to expand diagram area on narrow mobile viewports
    if (cv.width < 768) {
        M.L = 38; M.R = 12; M.T = 15; M.B = 92;
    } else {
        M.L = 66; M.R = 40; M.T = 28; M.B = 46;
    }
    
    draw(); 
}

const cpx = d => M.L + (d - S.vDMin) / (S.vDMax - S.vDMin) * (cv.width - M.L - M.R);
const cpy = e => M.T + (1 - (e - S.vYMin) / (S.vYMax - S.vYMin)) * (cv.height - M.T - M.B);
const fX = cx => S.vDMin + (cx - M.L) / (cv.width - M.L - M.R) * (S.vDMax - S.vDMin);
const fY = cy => S.vYMin + (1 - (cy - M.T) / (cv.height - M.T - M.B)) * (S.vYMax - S.vYMin);

export function draw() { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(_draw); }

function _draw() {
    raf = null;
    let W = cv.width, H = cv.height, pW = W - M.L - M.R, pH = H - M.T - M.B;
    let dRange = S.vDMax - S.vDMin, eRange = S.vYMax - S.vYMin;
    let uScale = (S.unit === 'MeV') ? S.hw0 : 1;
    let unitStr = (S.unit === 'MeV') ? ' MeV' : ' \u210f\u03c9\u2080';

    ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0a0f1a'; ctx.fillRect(M.L, M.T, pW, pH);

    if (!S.tracks) return;
    let { levs, fm } = doFill(S.delta, S.N);

    ctx.save(); ctx.beginPath(); ctx.rect(M.L, M.T, pW, pH); ctx.clip();

    let gSD = niceStep(dRange, 7), gSE_scaled = niceStep(eRange * uScale, 7);
    ctx.lineWidth = 0.5; ctx.strokeStyle = '#161b22';
    for (let d = Math.ceil(S.vDMin / gSD) * gSD; d <= S.vDMax + 1e-9; d += gSD) { let x = cpx(d); ctx.beginPath(); ctx.moveTo(x, M.T); ctx.lineTo(x, M.T + pH); ctx.stroke(); }
    for (let eS = Math.ceil((S.vYMin * uScale) / gSE_scaled) * gSE_scaled; eS <= (S.vYMax * uScale) + 1e-9; eS += gSE_scaled) { let y = cpy(eS / uScale); ctx.beginPath(); ctx.moveTo(M.L, y); ctx.lineTo(M.L + pW, y); ctx.stroke(); }

    // Density of States overlay
    if (S.showDOS) {
        let ySteps = 150;
        let dosVals = [];
        let maxDOS = 0.01;
        for (let i = 0; i <= ySteps; i++) {
            let eVal = S.vYMin + (i / ySteps) * (S.vYMax - S.vYMin);
            let val = getDOS(eVal, levs);
            dosVals.push({ eVal, val });
            if (val > maxDOS) maxDOS = val;
        }
        let maxW = Math.min(80, pW * 0.25);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(M.L, M.T, pW, pH);
        ctx.clip();
        
        // Fill area
        ctx.beginPath();
        ctx.moveTo(M.L, cpy(dosVals[0].eVal));
        for (let i = 0; i <= ySteps; i++) {
            let y = cpy(dosVals[i].eVal);
            let x = M.L + (dosVals[i].val / maxDOS) * maxW;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(M.L, cpy(dosVals[ySteps].eVal));
        ctx.closePath();
        
        let dosGrad = ctx.createLinearGradient(M.L, 0, M.L + maxW, 0);
        dosGrad.addColorStop(0, 'rgba(63, 185, 80, 0.22)');
        dosGrad.addColorStop(1, 'rgba(63, 185, 80, 0.0)');
        ctx.fillStyle = dosGrad;
        ctx.fill();
        
        // Stroke outline
        ctx.beginPath();
        ctx.moveTo(M.L + (dosVals[0].val / maxDOS) * maxW, cpy(dosVals[0].eVal));
        for (let i = 1; i <= ySteps; i++) {
            let y = cpy(dosVals[i].eVal);
            let x = M.L + (dosVals[i].val / maxDOS) * maxW;
            ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(63, 185, 80, 0.7)';
        ctx.lineWidth = 2.0;
        ctx.stroke();
        
        ctx.restore();
    }

    for (let pass of [0, 1]) {
        for (let [lbl, tr] of Object.entries(S.tracks)) {
            let isF = fm.has(lbl), isH = (lbl === S.hover || lbl === S.selected);
            if (pass === 0 && (isF || isH)) continue; if (pass === 1 && !isF && !isH) continue;
            ctx.beginPath();
            for (let i = 0; i < tr.deltas.length; i++) { let x = cpx(tr.deltas[i]), y = cpy(tr.e_hw[i]); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
            if (isH) { ctx.setLineDash([]); ctx.strokeStyle = '#ffa657'; ctx.lineWidth = 2.8; }
            else if (isF) { ctx.setLineDash(tr.parity > 0 ? [] : [5, 4]); ctx.strokeStyle = tr.parity > 0 ? '#58a6ff' : '#ff7b72'; ctx.lineWidth = 2.0; }
            else { ctx.setLineDash(tr.parity > 0 ? [] : [5, 4]); ctx.strokeStyle = tr.parity > 0 ? 'rgba(56,139,253,.22)' : 'rgba(248,81,73,.22)'; ctx.lineWidth = 0.9; }
            ctx.stroke(); ctx.setLineDash([]);
        }
    }

    let x0 = cpx(0);
    if (S.vDMin <= 0 && S.vDMax >= 0) {
        ctx.strokeStyle = 'rgba(139,148,158,.5)'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(x0, M.T); ctx.lineTo(x0, M.T + pH); ctx.stroke();
    }

    let xd = cpx(S.delta);
    if (S.delta >= S.vDMin && S.delta <= S.vDMax) {
        ctx.strokeStyle = 'rgba(88,166,255,.2)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(xd, M.T); ctx.lineTo(xd, M.T + pH); ctx.stroke(); ctx.setLineDash([]);
    }

    let fermiE = null; for (let lv of levs) if (fm.has(lv.lbl)) fermiE = lv.e;
    if (fermiE !== null && fermiE >= S.vYMin && fermiE <= S.vYMax) {
        let yF = cpy(fermiE); ctx.strokeStyle = 'rgba(210,153,34,.45)'; ctx.lineWidth = 1; ctx.setLineDash([8, 4]);
        ctx.beginPath(); ctx.moveTo(M.L, yF); ctx.lineTo(M.L + pW, yF); ctx.stroke(); ctx.setLineDash([]);
    }

    if (S.delta >= S.vDMin && S.delta <= S.vDMax) {
        for (let [lbl, n] of fm) {
            let tr = S.tracks[lbl], e = lerp(tr, S.delta);
            if (e < S.vYMin - 0.15 || e > S.vYMax + 0.15) continue;
            let yC = cpy(e), r = 5, offs = n === 2 ? [-4.5, 4.5] : [0];
            for (let dx of offs) {
                let g = ctx.createRadialGradient(xd + dx - 1.5, yC - 1.5, 0, xd + dx, yC, r);
                if (tr.parity > 0) { g.addColorStop(0, '#93c5fd'); g.addColorStop(1, '#1d4ed8'); ctx.strokeStyle = '#bfdbfe'; }
                else { g.addColorStop(0, '#fca5a5'); g.addColorStop(1, '#b91c1c'); ctx.strokeStyle = '#fecaca'; }
                ctx.beginPath(); ctx.arc(xd + dx, yC, r, 0, Math.PI * 2);
                ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
            }
        }
    }

    // Draw Magic Numbers & Spherical Labels at Delta = 0
    if (S.vDMin <= 0 && S.vDMax >= 0) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '11.5px Consolas, monospace';
        let lastY = 9999;
        for (let st of sphericalStates) {
            if (st.e >= S.vYMin - 0.5 && st.e <= S.vYMax + 0.5) {
                let y = cpy(st.e);
                if (lastY - y < 11.5) y = lastY - 11.5;
                if (y > M.T && y < cv.height - M.B) {
                    let tw = ctx.measureText(st.lbl).width;
                    ctx.fillStyle = 'rgba(13,17,23,0.8)'; ctx.fillRect(x0 + 7, y - 6, tw + 4, 12);
                    ctx.fillStyle = '#a5d6ff'; ctx.fillText(st.lbl, x0 + 9, y);
                }
                lastY = y;
            }
        }
        ctx.textAlign = 'center'; ctx.font = 'bold 12px sans-serif';
        for (let i = 0; i < sphericalStates.length - 1; i++) {
            let st = sphericalStates[i];
            if (MAGIC.has(st.cum)) {
                let e_mid = (st.e + sphericalStates[i + 1].e) / 2;
                if (e_mid >= S.vYMin && e_mid <= S.vYMax) {
                    let y = cpy(e_mid);
                    ctx.beginPath(); ctx.arc(x0, y, 9, 0, Math.PI * 2);
                    ctx.fillStyle = '#0d1117'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#3fb950'; ctx.stroke();
                    ctx.fillStyle = '#3fb950'; ctx.fillText(st.cum, x0, y + 1);
                }
            }
        }
    }

    if (S.zoomDrag) {
        let { x0: zx0, y0: zy0, x1: zx1, y1: zy1 } = S.zoomDrag, zx = Math.min(zx0, zx1), zy = Math.min(zy0, zy1), zw = Math.abs(zx1 - zx0), zh = Math.abs(zy1 - zy0);
        ctx.fillStyle = 'rgba(88,166,255,.07)'; ctx.fillRect(zx, zy, zw, zh);
        ctx.strokeStyle = 'rgba(88,166,255,.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]); ctx.strokeRect(zx, zy, zw, zh); ctx.setLineDash([]);
        let hs = 5; ctx.fillStyle = '#58a6ff'; [[zx, zy], [zx + zw, zy], [zx, zy + zh], [zx + zw, zy + zh]].forEach(([hx, hy]) => { ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs); });
    }

    ctx.restore();
    ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1.5; ctx.strokeRect(M.L, M.T, pW, pH);

    let majD = niceStep(dRange, 6), decD = Math.max(0, -Math.floor(Math.log10(majD)) + 1);
    ctx.fillStyle = '#8b949e'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
    for (let d = Math.ceil(S.vDMin / majD) * majD; d <= S.vDMax + 1e-9; d += majD) {
        let x = cpx(d); ctx.beginPath(); ctx.moveTo(x, M.T + pH); ctx.lineTo(x, M.T + pH + 5); ctx.stroke();
        ctx.fillText(d.toFixed(decD), x, M.T + pH + 7);
    }
    ctx.fillStyle = '#c9d1d9'; ctx.font = 'italic 14px serif'; ctx.textAlign = 'center'; ctx.fillText('\u03b4', M.L + pW / 2, M.T + pH + 27);

    let decE = Math.max(0, -Math.floor(Math.log10(gSE_scaled)) + 1);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = '11px sans-serif'; ctx.fillStyle = '#8b949e'; ctx.strokeStyle = '#30363d';
    for (let eS = Math.ceil((S.vYMin * uScale) / gSE_scaled) * gSE_scaled; eS <= (S.vYMax * uScale) + 1e-9; eS += gSE_scaled) {
        let y = cpy(eS / uScale); ctx.beginPath(); ctx.moveTo(M.L, y); ctx.lineTo(M.L - 5, y); ctx.stroke();
        ctx.fillText(eS.toFixed(decE), M.L - 8, y);
    }
    ctx.save(); ctx.translate(14, M.T + pH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#c9d1d9'; ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('E s.p.  (' + (S.unit === 'MeV' ? 'MeV' : '\u210f\u03c9\u2080') + ')', 0, 0); ctx.restore();

    updatePanel(levs, fm, fermiE, uScale, unitStr);
}

function updatePanel(levs, fm, fermiE, uScale, unitStr) {
    let ll = document.getElementById('ll'); 
    ll.innerHTML = ''; 
    let cumN = 0, lastFilled = null, selectedEl = null;
    for (let lv of levs) {
        cumN += 2; 
        let isFl = fm.has(lv.lbl), isMg = MAGIC.has(cumN);
        let div = document.createElement('div');
        let isSel = (lv.lbl === S.hover || lv.lbl === S.selected);
        div.className = 'lv' + 
            (isFl ? (lv.par > 0 ? ' fp' : ' fn') : ' em') + 
            (isMg ? ' mg' : '') + 
            (isSel ? ' sel-active' : '');
        
        div.textContent = lv.lbl + '  (' + cumN + ')' + (isMg ? ' \u25cf' : '');
        div.addEventListener('mouseenter', () => { S.hover = lv.lbl; draw(); });
        div.addEventListener('mouseleave', () => { S.hover = null; draw(); });
        div.addEventListener('click', () => {
            S.selected = lv.lbl;
            showActiveStateCard(lv.lbl, S.delta);
            draw();
        });
        ll.appendChild(div); 
        if (isFl) lastFilled = div;
        if (isSel) selectedEl = div;
    }
    
    // Auto-scroll the selected/hovered element into view, otherwise default to the last filled level
    if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else if (lastFilled) {
        lastFilled.scrollIntoView({ block: 'nearest' });
    }

    let fArr = levs.filter(l => fm.has(l.lbl)), nArr = levs.filter(l => !fm.has(l.lbl));
    document.getElementById('gv').textContent = (fArr.length && nArr.length) ? '\u0394\u03b5 = ' + ((nArr[0].e - fArr[fArr.length - 1].e) * uScale).toFixed(4) + unitStr : '—';
    document.getElementById('fv').textContent = fermiE !== null ? (fermiE * uScale).toFixed(4) + unitStr : '—';
}

function plotPos(e) { let r = cv.getBoundingClientRect(); return { cx: e.clientX - r.left, cy: e.clientY - r.top }; }
function inPlot(cx, cy) { return cx >= M.L && cx <= cv.width - M.R && cy >= M.T && cy <= cv.height - M.B; }
function clampPlot(cx, cy) { return { cx: Math.max(M.L, Math.min(cv.width - M.R, cx)), cy: Math.max(M.T, Math.min(cv.height - M.B, cy)) }; }

// Zoom / interaction helpers
export function toggleZoom() { S.zoomMode = !S.zoomMode; S.zoomDrag = null; document.getElementById('btnZoom').classList.toggle('active', S.zoomMode); cv.style.cursor = S.zoomMode ? 'crosshair' : 'default'; draw(); }
function applyZoom(dMin, dMax, yMin, yMax) {
    if (dMax - dMin < 0.005 || yMax - yMin < 0.05) return;
    S.zoomHist.push({ vDMin: S.vDMin, vDMax: S.vDMax, vYMin: S.vYMin, vYMax: S.vYMax });
    S.vDMin = dMin; S.vDMax = dMax; S.vYMin = yMin; S.vYMax = yMax; S.zoomMode = false; S.zoomDrag = null;
    document.getElementById('btnZoom').classList.remove('active'); cv.style.cursor = 'default'; syncZoomButtons(); draw();
}
export function zoomOut() { if (!S.zoomHist.length) return; let v = S.zoomHist.pop(); S.vDMin = v.vDMin; S.vDMax = v.vDMax; S.vYMin = v.vYMin; S.vYMax = v.vYMax; syncZoomButtons(); draw(); }
export function resetView() { S.zoomHist = []; S.vDMin = S.fullDMin; S.vDMax = S.fullDMax; S.vYMin = S.fullYMin; S.vYMax = S.fullYMax; S.zoomMode = false; S.zoomDrag = null; document.getElementById('btnZoom').classList.remove('active'); cv.style.cursor = 'default'; syncZoomButtons(); draw(); }
function syncZoomButtons() { let z = S.zoomHist.length > 0; document.getElementById('btnBack').style.display = z ? '' : 'none'; document.getElementById('btnFull').style.display = z ? '' : 'none'; }

// Compute data (uses physics)
export function computeData() {
    document.getElementById('overlay').style.display = 'flex';
    setTimeout(() => {
        let A = parseFloat(document.getElementById('inpA').value) || 80;
        let dMin = parseFloat(document.getElementById('inpDMin').value) || -0.5;
        let dMax = parseFloat(document.getElementById('inpDMax').value) || 0.5;
        let pts = 50;

        S.dGrid = []; for (let i = 0; i <= pts; i++) S.dGrid.push(dMin + i * (dMax - dMin) / pts);
        let sl = document.getElementById('ds'); sl.min = dMin; sl.max = dMax;
        S.delta = Math.max(dMin, Math.min(dMax, 0)); sl.value = S.delta;
        document.getElementById('dv').textContent = '\u03b4 = ' + S.delta.toFixed(3);

        // Update spherical states dynamically based on selected nucleon type and parameter set
        calcSphericalStates(S.nucleonType, S.paramSet);

        let rawTracks = {}, globalHw0 = 1;
        for (let d of S.dGrid) {
            let res = nilssonEnergies(d, A, S.nucleonType, S.paramSet); globalHw0 = res.hw0_base;
            for (let orb of res.orbitals) {
                let eps = orb[0], m = orb[1], lbl = orb[2];
                if (!rawTracks[lbl]) rawTracks[lbl] = { deltas: [], e_hw: [], parity: parseInt(lbl.match(/\[(\d)/)[1]) % 2 === 0 ? 1 : -1 };
                rawTracks[lbl].deltas.push(d); rawTracks[lbl].e_hw.push(eps / globalHw0);
            }
        }

        S.hw0 = globalHw0; S.tracks = rawTracks;
        let all = Object.values(S.tracks).flatMap(t => t.e_hw);
        S.fullDMin = dMin; S.fullDMax = dMax;
        S.fullYMin = Math.max(0.8, Math.floor(Math.min(...all) * 10) / 10 - 0.2);
        S.fullYMax = Math.min(8.5, Math.ceil(Math.max(...all) * 10) / 10 + 0.1);
        S.vDMin = S.fullDMin; S.vDMax = S.fullDMax; S.vYMin = S.fullYMin; S.vYMax = S.fullYMax;
        S.zoomHist = []; S.zoomMode = false; S.zoomDrag = null;

        syncZoomButtons(); document.getElementById('overlay').style.display = 'none';
        document.getElementById('sm').textContent = `A=${A} | \u210f\u03c9\u2080 = ${globalHw0.toFixed(2)} MeV`;
        draw();
    }, 50);
}

// Initialize DOM references and event listeners — call after DOM ready
export function init() {
    cv = document.getElementById('cv'); ctx = cv.getContext('2d');

    // Canvas Mouse interactions
    cv.addEventListener('mousedown', e => {
        if (e.button !== 0 || !S.zoomMode) return;
        let { cx, cy } = plotPos(e); if (!inPlot(cx, cy)) return;
        S.zoomDrag = { x0: cx, y0: cy, x1: cx, y1: cy }; e.preventDefault();
    });
    
    cv.addEventListener('mousemove', e => {
        let { cx, cy } = plotPos(e), tip = document.getElementById('tip');
        if (S.zoomMode) {
            cv.style.cursor = inPlot(cx, cy) ? 'crosshair' : 'default';
            if (S.zoomDrag) { let c = clampPlot(cx, cy); S.zoomDrag.x1 = c.cx; S.zoomDrag.y1 = c.cy; draw(); }
            tip.style.display = 'none'; return;
        }
        if (!inPlot(cx, cy)) { if (S.hover) { S.hover = null; draw(); } tip.style.display = 'none'; return; }
        if (!S.tracks) return;
        let dH = fX(cx), best = null, bestD = Infinity;
        for (let [lbl, tr] of Object.entries(S.tracks)) { let dist = Math.abs(cpy(lerp(tr, dH)) - cy); if (dist < 10 && dist < bestD) { bestD = dist; best = lbl; } }
        if (best !== S.hover) { S.hover = best; draw(); }
        if (best) {
            let tr = S.tracks[best], te = lerp(tr, dH), uScale = S.unit === 'MeV' ? S.hw0 : 1, unitStr = S.unit === 'MeV' ? ' MeV' : ' \u210f\u03c9\u2080';
            tip.style.display = 'block'; tip.style.left = (e.clientX + 15) + 'px'; tip.style.top = (e.clientY - 12) + 'px';
            tip.innerHTML = '<strong style="color:' + (tr.parity > 0 ? '#58a6ff' : '#ff7b72') + '">' + best + '</strong><br>E = ' + (te * uScale).toFixed(4) + unitStr + '<br>\u03c0 = ' + (tr.parity > 0 ? '+' : '\u2212') + '  \u00b7  \u03b4 = ' + dH.toFixed(3);
        } else { tip.style.display = 'none'; }
    });
    
    cv.addEventListener('mouseup', e => {
        if (!S.zoomMode || !S.zoomDrag) return; let { x0, y0, x1, y1 } = S.zoomDrag; S.zoomDrag = null;
        if (Math.abs(x1 - x0) < 10 || Math.abs(y1 - y0) < 10) { draw(); return; }
        applyZoom(fX(Math.min(x0, x1)), fX(Math.max(x0, x1)), fY(Math.max(y0, y1)), fY(Math.min(y0, y1)));
    });
    
    cv.addEventListener('mouseleave', () => { if (S.zoomDrag) { S.zoomDrag = null; draw(); } S.hover = null; document.getElementById('tip').style.display = 'none'; if (!S.zoomMode) draw(); });

    // Select state on click (Unified Desktop + Mobile behavior)
    cv.addEventListener('click', e => {
        if (S.zoomMode) return;
        let { cx, cy } = plotPos(e);
        if (!inPlot(cx, cy)) return;
        selectStateAt(cx, cy, false);
    });

    // Canvas Touch Interactions (Mobile Support)
    cv.addEventListener('touchstart', e => {
        let touch = e.touches[0];
        let { cx, cy } = plotPos(touch);
        if (!inPlot(cx, cy)) return;
        if (S.zoomMode) {
            S.zoomDrag = { x0: cx, y0: cy, x1: cx, y1: cy };
            e.preventDefault(); // Prevent page zooming/scrolling gestures while drawing zoom box
        } else {
            selectStateAt(cx, cy, true);
            e.preventDefault();
        }
    }, { passive: false });

    cv.addEventListener('touchmove', e => {
        if (!S.zoomDrag) return;
        let touch = e.touches[0];
        let { cx, cy } = plotPos(touch);
        let c = clampPlot(cx, cy);
        S.zoomDrag.x1 = c.cx;
        S.zoomDrag.y1 = c.cy;
        draw();
        e.preventDefault();
    }, { passive: false });

    cv.addEventListener('touchend', e => {
        if (!S.zoomMode || !S.zoomDrag) return;
        let { x0, y0, x1, y1 } = S.zoomDrag;
        S.zoomDrag = null;
        if (Math.abs(x1 - x0) < 10 || Math.abs(y1 - y0) < 10) { draw(); return; }
        applyZoom(fX(Math.min(x0, x1)), fX(Math.max(x0, x1)), fY(Math.max(y0, y1)), fY(Math.min(y0, y1)));
        e.preventDefault();
    }, { passive: false });

    // Input listeners
    document.getElementById('ds').addEventListener('input', function () { 
        S.delta = parseFloat(this.value); 
        document.getElementById('dv').textContent = '\u03b4 = ' + S.delta.toFixed(3); 
        // If a state is selected, update its card dynamically with the new deformation
        if (S.selected) {
            showActiveStateCard(S.selected, S.delta);
        }
        draw(); 
    });
    
    document.getElementById('ni').addEventListener('input', function () { 
        S.N = Math.max(0, parseInt(this.value) || 0); 
        draw(); 
    });

    window.addEventListener('resize', () => { if (raf) cancelAnimationFrame(raf); resize(); });

    // Start continuous shape viewer rendering animation loop
    let lastTime = 0;
    function runShapeAnim(t) {
        if (!lastTime) lastTime = t;
        let dt = t - lastTime;
        lastTime = t;
        lastShapeAngle += 0.0007 * dt; // slow smooth rotation
        drawShapeViewer(lastShapeAngle);
        requestAnimationFrame(runShapeAnim);
    }
    requestAnimationFrame(runShapeAnim);
}

// Density of States KDE helper
function getDOS(eVal, levs) {
    let sum = 0;
    const sigma = 0.15; // in units of hbar*omega_0
    const factor = 1 / (sigma * Math.sqrt(2 * Math.PI));
    for (let lv of levs) {
        let diff = eVal - lv.e;
        sum += Math.exp(-(diff * diff) / (2 * sigma * sigma)) * factor;
    }
    return sum;
}

let lastShapeAngle = 0;
function drawShapeViewer(alpha) {
    let shapeCv = document.getElementById('shapeCv');
    if (!shapeCv) return;
    let w = shapeCv.clientWidth;
    let h = shapeCv.clientHeight;
    if (w === 0 || h === 0) return; // not visible yet
    if (shapeCv.width !== w || shapeCv.height !== h) {
        shapeCv.width = w;
        shapeCv.height = h;
    }
    let sCtx = shapeCv.getContext('2d');
    sCtx.clearRect(0, 0, w, h);

    let Xc = w / 2;
    let Yc = h / 2;
    let R0 = Math.min(w, h) * 0.33;

    // Semi-axes (volume conserving quadrupole deformation terms)
    let ax = R0 * (1 - S.delta / 3);
    let ay = ax;
    let az = R0 * (1 + 2 * S.delta / 3);

    // Tilt around space x-axis
    let beta = 25 * Math.PI / 180;

    // Projected ellipse horizontal and vertical semi-axes
    let Rx = ax;
    let Ry = Math.sqrt(ax * ax * Math.sin(beta) * Math.sin(beta) + az * az * Math.cos(beta) * Math.cos(beta));

    // 1. Draw the rotation axis (faint background line)
    sCtx.beginPath();
    sCtx.moveTo(Xc, Yc - Ry * 1.35);
    sCtx.lineTo(Xc, Yc + Ry * 1.35);
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    sCtx.lineWidth = 1;
    sCtx.setLineDash([4, 4]);
    sCtx.stroke();
    sCtx.setLineDash([]);

    // Draw little arrow at top of rotation axis
    sCtx.beginPath();
    sCtx.moveTo(Xc - 4, Yc - Ry * 1.35 + 4);
    sCtx.lineTo(Xc, Yc - Ry * 1.35);
    sCtx.lineTo(Xc + 4, Yc - Ry * 1.35 + 4);
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    sCtx.lineWidth = 1;
    sCtx.stroke();

    // 2. Draw the shaded ellipsoid body
    sCtx.save();
    sCtx.translate(Xc, Yc);
    sCtx.beginPath();
    sCtx.ellipse(0, 0, Rx, Ry, 0, 0, Math.PI * 2);
    
    let grad = sCtx.createRadialGradient(-Rx * 0.18, -Ry * 0.18, 2, -Rx * 0.08, -Ry * 0.08, Math.max(Rx, Ry) * 1.05);
    if (S.nucleonType === 'proton') {
        grad.addColorStop(0, '#e0f2fe'); // Light blue highlight
        grad.addColorStop(0.3, '#388bfd'); // Accent blue
        grad.addColorStop(1, '#050a18'); // Shadow
    } else {
        grad.addColorStop(0, '#ffe4e6'); // Light red/pink highlight
        grad.addColorStop(0.3, '#ff7b72'); // Crimson red
        grad.addColorStop(1, '#180505'); // Shadow
    }
    sCtx.fillStyle = grad;
    sCtx.fill();
    sCtx.strokeStyle = S.nucleonType === 'proton' ? 'rgba(56, 139, 253, 0.65)' : 'rgba(248, 81, 73, 0.65)';
    sCtx.lineWidth = 1.8;
    sCtx.stroke();
    sCtx.restore();

    // 3. Project and draw grid lines of latitude & longitude
    function project(lat, lon) {
        // Rotate around symmetry axis (vertical in space) by adding alpha to longitude
        let lon_rot = lon + alpha;

        // Position in space frame (where y is vertical, i.e., the symmetry axis)
        let xs = ax * Math.cos(lat) * Math.cos(lon_rot);
        let ys = az * Math.sin(lat);
        let zs = ax * Math.cos(lat) * Math.sin(lon_rot);

        // Tilt by beta around the space x-axis
        let xp = xs;
        let yp = ys * Math.cos(beta) - zs * Math.sin(beta);
        let zp = ys * Math.sin(beta) + zs * Math.cos(beta);

        return { x: xp, y: -yp, z: zp };
    }

    function drawSeg(p1, p2) {
        let zAvg = (p1.z + p2.z) / 2;
        sCtx.beginPath();
        sCtx.moveTo(Xc + p1.x, Yc + p1.y);
        sCtx.lineTo(Xc + p2.x, Yc + p2.y);
        if (zAvg > 0) {
            sCtx.strokeStyle = S.nucleonType === 'proton' ? 'rgba(165, 214, 255, 0.45)' : 'rgba(255, 188, 190, 0.45)';
            sCtx.lineWidth = 0.95;
        } else {
            sCtx.strokeStyle = S.nucleonType === 'proton' ? 'rgba(56, 139, 253, 0.14)' : 'rgba(248, 81, 73, 0.14)';
            sCtx.lineWidth = 0.75;
        }
        sCtx.stroke();
    }

    // Latitude lines
    const latLines = [-Math.PI / 3, -Math.PI / 6, 0, Math.PI / 6, Math.PI / 3];
    const lonSteps = 40;
    for (let lat of latLines) {
        let prev = project(lat, 0);
        for (let s = 1; s <= lonSteps; s++) {
            let lon = (s / lonSteps) * Math.PI * 2;
            let curr = project(lat, lon);
            drawSeg(prev, curr);
            prev = curr;
        }
    }

    // Longitude lines
    const lonLines = [0, Math.PI / 6, Math.PI / 3, Math.PI / 2, 2 * Math.PI / 3, 5 * Math.PI / 6];
    const latSteps = 30;
    for (let lon of lonLines) {
        let prev = project(-Math.PI / 2, lon);
        for (let s = 1; s <= latSteps; s++) {
            let lat = -Math.PI / 2 + (s / latSteps) * Math.PI;
            let curr = project(lat, lon);
            drawSeg(prev, curr);
            prev = curr;
        }
    }
}

// Helper to select the nearest state at given coordinates
export function selectStateAt(cx, cy, isTouch = false) {
    if (!S.tracks) return;
    let dH = fX(cx);
    let best = null;
    let bestD = Infinity;
    let searchRadius = isTouch ? 22 : 11; // Expanded hit target on touch screens
    for (let [lbl, tr] of Object.entries(S.tracks)) {
        let dist = Math.abs(cpy(lerp(tr, dH)) - cy);
        if (dist < searchRadius && dist < bestD) {
            bestD = dist;
            best = lbl;
        }
    }
    if (best) {
        S.selected = best;
        showActiveStateCard(best, dH);
        draw();
    }
}

// Display selected state properties on the floating active state card
export function showActiveStateCard(lbl, deltaVal) {
    const card = document.getElementById('active-state-card');
    const content = document.getElementById('cardContent');
    if (!card || !content) return;
    
    let tr = S.tracks[lbl];
    let te = lerp(tr, deltaVal);
    let uScale = S.unit === 'MeV' ? S.hw0 : 1;
    let unitStr = S.unit === 'MeV' ? ' MeV' : ' ℏω₀';
    let paritySymbol = tr.parity > 0 ? '+' : '−';
    
    content.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; padding-right: 24px;">
            <strong style="color: ${tr.parity > 0 ? '#58a6ff' : '#ff7b72'}; font-size: 14px; font-family: var(--font-mono);">${lbl}</strong>
            <span style="font-size: 11px; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: var(--text-secondary);">Parity: ${paritySymbol}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: var(--font-mono); font-size: 12px; margin-top: 4px;">
            <div>Energy: <span style="color: #a5d6ff;">${(te * uScale).toFixed(4)}${unitStr}</span></div>
            <div style="text-align: right;">Deformation δ: <span style="color: var(--accent);">${deltaVal.toFixed(3)}</span></div>
        </div>
    `;
    card.classList.remove('hidden');
}
