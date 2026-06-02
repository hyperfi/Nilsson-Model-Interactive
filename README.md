# ☢ Live Nilsson Diagram Engine

An interactive, real-time web visualization tool for the **Nilsson Model** (deformed shell model) in nuclear physics. This engine calculates single-particle energy levels of nucleons in a deformed spheroidal harmonic oscillator potential and renders them dynamically as a function of quadrupole deformation ($\delta$).

---

## 🌟 Features

*   **Real-time Quantum State Calculations:** Computes single-particle eigenstates on-the-fly by diagonalizing the Nilsson Hamiltonian using a Jacobi eigenvalue solver written in pure JavaScript.
*   **Interactive Quadrupole Deformation ($\delta$):** Adjust the deformation parameters dynamically with a slider to observe level splitting and crossing (Jahn-Teller effect / nuclear shape deformation).
*   **Mass Number ($A$) Scaling:** Dynamically scales the oscillator frequency $\hbar\omega_0 \approx 41 A^{-1/3}$ MeV as you modify the mass number.
*   **Nucleon Filling Representation:** Input the number of nucleons ($N$) to see how energy levels are filled according to the Pauli exclusion principle (modeled as twin orbital dots on filled levels).
*   **Visual Highlights & Parity coding:**
    *   **Positive Parity ($\pi = +$):** Rendered as solid lines (blue when filled).
    *   **Negative Parity ($\pi = -$):** Rendered as dashed lines (red when filled).
    *   **Spherical Magic Numbers:** Traditional magic numbers ($2, 8, 20, 28, 50, 82, 126, 184$) are highlighted at spherical deformation ($\delta = 0$).
*   **Interactive UI:**
    *   **Hover Tooltips:** Hover over any state line to view its asymptotic label $\Omega/2[N n_z \Lambda]$, energy, parity, and deformation.
    *   **Level Filling Panel:** Sidebar showing the ordered sequence of filled and empty levels. Hovering over a list item highlights the corresponding line in the diagram.
    *   **Dynamic Zoom:** Click the **Zoom** button and drag a rectangle on the canvas to inspect dense level crossings.
    *   **Flexible Units:** Toggle energy values between oscillator units ($\hbar\omega_0$) and physical units (MeV).

---

## 🔬 Physics Summary

The Nilsson model describes the motion of single nucleons (protons or neutrons) in a deformed nuclear potential. The Hamiltonian is expressed as:

$$H = H_0 + C \mathbf{l} \cdot \mathbf{s} + D \mathbf{l}^2 - \delta \hbar\omega_0 \frac{2}{3} r^2 Y_{20}(\theta, \phi)$$

Where:
*   $H_0$ is the isotropic harmonic oscillator Hamiltonian.
*   $C \mathbf{l} \cdot \mathbf{s}$ is the spin-orbit coupling term ($C = -2 \hbar\omega_0 \kappa$).
*   $D \mathbf{l}^2$ is the orbit-orbit correction term ($D = -\hbar\omega_0 \kappa \mu$).
*   $\delta$ is the quadrupole deformation parameter.
*   $Y_{20}$ is the spherical harmonic representing quadrupole deformation.

The states are classified using the asymptotic quantum numbers:

$$\Omega/2 [N n_z \Lambda]$$

Where:
*   $\Omega$ is the projection of the total angular momentum onto the symmetry axis.
*   $N$ is the principal oscillator quantum number.
*   $n_z$ is the number of oscillator quanta along the symmetry axis.
*   $\Lambda$ is the projection of orbital angular momentum onto the symmetry axis.

---

## 📂 File Structure

*   [`index.html`](file:///e:/Interactive%20WEB%20tools/Nilsson-Model-Interactive/index.html): Defines the web layout, controls, canvas container, and sidebar panel.
*   [`main.js`](file:///e:/Interactive%20WEB%20tools/Nilsson-Model-Interactive/main.js): Entry point that wires up DOM events and starts the rendering loop.
*   [`physics.js`](file:///e:/Interactive%20WEB%20tools/Nilsson-Model-Interactive/physics.js): Implements the physics engine (Clebsch-Gordan coefficients, Jacobi eigenvalue solver, Nilsson energy computations, and spherical state calculation).
*   [`render.js`](file:///e:/Interactive%20WEB%20tools/Nilsson-Model-Interactive/render.js): Coordinates the HTML5 Canvas drawing loop, coordinates translation, hover detection, zooming, and panel updates.
*   [`style.css`](file:///e:/Interactive%20WEB%20tools/Nilsson-Model-Interactive/style.css): Custom dark-themed stylesheets for interactive widgets, canvas overlay, tooltips, and level logs.

---

## 🚀 How to Run

Since the application uses ES Modules (`import`/`export` syntax), browsers restrict loading the JavaScript files directly via the `file://` protocol due to CORS security policies.

### Run with a Local Server
Use any local web server to serve the directory. For example, using Python or Node.js:

#### Using Python
If you have Python installed, run this command in your terminal:
```bash
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your web browser.

#### Using Node.js
If you have `npx` (comes with Node.js) installed, run:
```bash
npx serve .
```
Or install a lightweight server globally:
```bash
npm install -g serve
serve .
```
