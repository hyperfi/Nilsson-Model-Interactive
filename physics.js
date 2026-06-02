// Physics utilities and Nilsson model calculations
const fCache = [1, 1];
// Proton & Neutron Nilsson model parameter sets (kappa, mu) indexed by principal quantum number N (0 to 7)
export const PARAMETER_SETS = {
    universal: {
        name: "Lund Universal (Default)",
        proton_kappa: [0.05, 0.05, 0.05, 0.05, 0.05, 0.0637, 0.0637, 0.06],
        proton_mu:    [0.00, 0.00, 0.00, 0.35, 0.625, 0.600, 0.600, 0.54],
        neutron_kappa: [0.05, 0.05, 0.05, 0.05, 0.05, 0.0637, 0.0637, 0.06],
        neutron_mu:    [0.00, 0.00, 0.00, 0.25, 0.450, 0.450, 0.450, 0.40]
    },
    rare_earth: {
        name: "Rare Earth (A ≈ 150 - 180)",
        proton_kappa: [0.05, 0.05, 0.05, 0.06, 0.0637, 0.0637, 0.0637, 0.06],
        proton_mu:    [0.00, 0.00, 0.00, 0.35, 0.600, 0.600, 0.600, 0.54],
        neutron_kappa: [0.05, 0.05, 0.05, 0.06, 0.0637, 0.0637, 0.0637, 0.06],
        neutron_mu:    [0.00, 0.00, 0.00, 0.25, 0.390, 0.420, 0.440, 0.35]
    },
    actinide: {
        name: "Actinides (A ≈ 250)",
        proton_kappa: [0.05, 0.05, 0.05, 0.05, 0.0577, 0.0577, 0.0577, 0.0577],
        proton_mu:    [0.00, 0.00, 0.00, 0.35, 0.650, 0.650, 0.650, 0.650],
        neutron_kappa: [0.05, 0.05, 0.05, 0.05, 0.0635, 0.0635, 0.0635, 0.062],
        neutron_mu:    [0.00, 0.00, 0.00, 0.25, 0.390, 0.400, 0.400, 0.30]
    },
    light_sd: {
        name: "Light Nuclei (A ≈ 20 - 40)",
        proton_kappa: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
        proton_mu:    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
        neutron_kappa: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
        neutron_mu:    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00]
    }
};

export function fact(n) { if (n < 0) return 0; while (fCache.length <= n) fCache.push(fCache[fCache.length - 1] * fCache.length); return fCache[n]; }
function cgDelta(j1, j2, j3) { return Math.sqrt((fact(j1 + j2 - j3) * fact(j1 - j2 + j3) * fact(-j1 + j2 + j3)) / fact(j1 + j2 + j3 + 1)); }
function CG(j1, j2, j3, m1, m2, m3) {
    if (m1 + m2 !== m3) return 0;
    if (Math.abs(m1) > j1 || Math.abs(m2) > j2 || Math.abs(m3) > j3) return 0;
    if (j3 > j1 + j2 || j3 < Math.abs(j1 - j2)) return 0;
    let term1 = Math.sqrt(2 * j3 + 1) * cgDelta(j1, j2, j3) * Math.sqrt(fact(j1 + m1) * fact(j1 - m1) * fact(j2 + m2) * fact(j2 - m2) * fact(j3 + m3) * fact(j3 - m3));
    let sum = 0, kmin = Math.max(0, j2 - j3 - m1, j1 - j3 + m2), kmax = Math.min(j1 + j2 - j3, j1 - m1, j2 + m2);
    for (let k = kmin; k <= kmax; k++) sum += ((k % 2 === 0) ? 1 : -1) / (fact(k) * fact(j1 + j2 - j3 - k) * fact(j1 - m1 - k) * fact(j2 + m2 - k) * fact(j3 - j2 + m1 + k) * fact(j3 - j1 - m2 + k));
    return term1 * sum;
}
export function get_cg(j1_d, j2_d, j3_d, m1_d, m2_d) { return CG(j1_d / 2, j2_d / 2, j3_d / 2, m1_d / 2, m2_d / 2, (m1_d + m2_d) / 2); }

export function jacobiEigvals(A, maxIter = 100) {
    let n = A.length, D = A.map(row => [...row]);
    for (let it = 0; it < maxIter; it++) {
        let max = 0, p = 0, q = 1;
        for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) if (Math.abs(D[i][j]) > max) { max = Math.abs(D[i][j]); p = i; q = j; }
        if (max < 1e-10) break;
        let theta = (D[q][q] - D[p][p]) / (2 * D[p][q]);
        let t = (theta === 0) ? 1 : Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        let c = 1 / Math.sqrt(t * t + 1), s = c * t;
        for (let i = 0; i < n; i++) {
            if (i !== p && i !== q) {
                let D_ip = D[i][p], D_iq = D[i][q];
                D[i][p] = D[p][i] = c * D_ip - s * D_iq;
                D[i][q] = D[q][i] = s * D_ip + c * D_iq;
            }
        }
        let D_pp = D[p][p], D_qq = D[q][q], D_pq = D[p][q];
        D[p][p] = c * c * D_pp - 2 * s * c * D_pq + s * s * D_qq;
        D[q][q] = s * s * D_pp + 2 * s * c * D_pq + c * c * D_qq;
        D[p][q] = D[q][p] = 0;
    }
    let evals = []; for (let i = 0; i < n; i++) evals.push(D[i][i]); return evals.sort((a, b) => a - b);
}

export function generateAsymptoticLabels(N, Omega) {
    let valid_states = [];
    for (let nz = N; nz >= 0; nz--) {
        let n_perp = N - nz;
        for (let sigma of [0.5, -0.5]) {
            let Lambda = Omega - sigma;
            if (Math.abs(Lambda) <= n_perp && (n_perp - Math.floor(Math.abs(Lambda))) % 2 === 0) valid_states.push([nz, Math.round(Lambda)]);
        }
    }
    return valid_states.sort((a, b) => b[0] - a[0]).map(s => `${Math.round(Omega * 2)}/2[${N}${s[0]}${s[1]}]`);
}

export function nilssonEnergies(delta, A, nucleonType = 'proton', paramSet = 'universal') {
    const pSet = PARAMETER_SETS[paramSet] || PARAMETER_SETS.universal;
    const rkappa = (nucleonType === 'proton') ? pSet.proton_kappa : pSet.neutron_kappa;
    const rmu = (nucleonType === 'proton') ? pSet.proton_mu : pSet.neutron_mu;
    let hw0_base = 41.0 * Math.pow(A, -1.0 / 3.0);
    let fdel = Math.pow(Math.pow(1.0 + (2.0 / 3.0) * delta, 2.0) * (1.0 - (4.0 / 3.0) * delta), -1.0 / 6.0);
    let hw0_mev = hw0_base * fdel;
    let orbitals = [];

    for (let n = 0; n < 15; n += 2) {
        let N_idx = Math.floor(n / 2);
        let c = -2.0 * hw0_base * rkappa[N_idx], d = rmu[N_idx] * c / 2.0;

        for (let iom = 1; iom <= n + 1; iom += 2) {
            let Omega = iom / 2.0, basis = [];
            for (let l = n; l >= 0; l -= 4) for (let lam = -l; lam <= l + 1; lam += 2) {
                let isig = iom - lam; if (Math.abs(isig) === 1) basis.push([l, lam, isig]);
            }
            let nbas = basis.length; if (nbas === 0) continue;

            let H = Array(nbas).fill(0).map(() => Array(nbas).fill(0));
            for (let i = 0; i < nbas; i++) {
                let [l, lam, isig] = basis[i];
                for (let j = i; j < nbas; j++) {
                    let [l1, lam1, isig1] = basis[j], h00 = 0.0, hl2 = 0.0, hls = 0.0, hr2 = 0.0, hy20 = 0.0;
                    if (i === j) { h00 = (n + 3) / 2.0 * hw0_mev; hl2 = l * (l + 2) / 4.0; }
                    if (l1 === l) {
                        if (lam1 === lam + 2 && isig1 === isig - 2) hls = Math.sqrt((l - lam) * (l + lam + 2)) / 4.0;
                        else if (lam1 === lam && isig1 === isig) hls = (lam * isig) / 4.0;
                        else if (lam1 === lam - 2 && isig1 === isig + 2) hls = Math.sqrt((l + lam) * (l - lam + 2)) / 4.0;
                        hr2 = (n + 3) / 2.0;
                    } else if (l1 === l - 4) hr2 = Math.sqrt((n - l + 4) * (n + l + 2)) / 2.0;
                    else if (l1 === l + 4) hr2 = Math.sqrt((n - l) * (n + l + 6)) / 2.0;

                    if (Math.abs(hr2) > 1e-5 && lam1 === lam) hy20 = Math.sqrt((l + 1) / (l1 + 1)) * get_cg(l, 4, l1, lam, 0) * get_cg(l, 4, l1, 0, 0);
                    H[i][j] = H[j][i] = h00 - delta * hw0_mev * (2.0 / 3.0) * hr2 * hy20 + c * hls + d * hl2;
                }
            }
            let evals_mev = jacobiEigvals(H), labels = generateAsymptoticLabels(N_idx, Omega);
            for (let i = 0; i < evals_mev.length; i++) orbitals.push([evals_mev[i], Omega, labels[i]]);
        }
    }
    orbitals.sort((a, b) => a[0] - b[0]); return { hw0_base, orbitals };
}

// Spherical states helper
export let sphericalStates = [];
export const MAGIC = new Set([2, 8, 20, 28, 50, 82, 126, 184]);
export function calcSphericalStates(nucleonType = 'proton', paramSet = 'universal') {
    const pSet = PARAMETER_SETS[paramSet] || PARAMETER_SETS.universal;
    const rkappa = (nucleonType === 'proton') ? pSet.proton_kappa : pSet.neutron_kappa;
    const rmu = (nucleonType === 'proton') ? pSet.proton_mu : pSet.neutron_mu;
    sphericalStates = [];
    for (let N = 0; N < 8; N++) {
        let k = rkappa[N], mu = rmu[N];
        for (let l = N; l >= 0; l -= 2) {
            let nnuc = (N - l) / 2 + 1, lc = ['s', 'p', 'd', 'f', 'g', 'h', 'i', 'j'][l];
            let e_plus = (N + 1.5) - k * l - k * mu * l * (l + 1);
            sphericalStates.push({ lbl: nnuc + lc + (l * 2 + 1) + '/2', e: e_plus, n: l * 2 + 2 });
            if (l > 0) {
                let e_minus = (N + 1.5) - k * (-(l + 1)) - k * mu * l * (l + 1);
                sphericalStates.push({ lbl: nnuc + lc + (l * 2 - 1) + '/2', e: e_minus, n: l * 2 });
            }
        }
    }
    sphericalStates.sort((a, b) => a.e - b.e);
    let cum = 0;
    for (let i = 0; i < sphericalStates.length; i++) {
        cum += sphericalStates[i].n;
        sphericalStates[i].cum = cum;
    }
}

// initialize spherical states by default
calcSphericalStates();
