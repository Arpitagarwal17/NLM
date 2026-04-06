/**
 * Newton's Laws of Motion — App Controller
 * Tab management, graph rendering, UI bindings, animation loop
 */

(function () {
  'use strict';

  // ================================================================
  // MAIN APP
  // ================================================================

  class NewtonApp {
    constructor() {
      this.currentLaw = 1;
      this.sims = {};
      this.graphs = {};
      this.animFrameId = null;
      this.lastTime = 0;
      this.running = false;

      this._init();
    }

    _init() {
      this._setupCanvases();
      this._createSimulations();
      this._createGraphs();
      this._bindEvents();
      this._bindCanvasClick();
      this._startLoop();
    }

    // ---- Canvas Setup ----
    _setupCanvases() {
      // Resize canvases to match their container
      ['canvas1', 'canvas2', 'canvas3'].forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
          const parent = canvas.parentElement;
          const w = parent.clientWidth || 760;
          canvas.width = Math.max(400, w);
          canvas.height = Math.round(canvas.width * 0.55);
        }
      });

      ['graph1', 'graph2', 'graph3'].forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
          const parent = canvas.parentElement;
          const w = parent.clientWidth || 1160;
          canvas.width = Math.max(400, w);
          canvas.height = 160;
        }
      });
    }

    // ---- Create Simulations ----
    _createSimulations() {
      const c1 = document.getElementById('canvas1');
      const c2 = document.getElementById('canvas2');
      const c3 = document.getElementById('canvas3');

      this.sims = {
        law1: new NewtonPhysics.Law1Simulation(c1),
        law2: new NewtonPhysics.Law2Simulation(c2),
        law3: new NewtonPhysics.Law3Simulation(c3),
      };

      // Law3: create default scenario
      this.sims.law3.createScenario('equal');
    }

    // ---- Create Graphs ----
    _createGraphs() {
      this.graphs = {
        law1: new NewtonPhysics.RealtimeGraph(document.getElementById('graph1')),
        law2: new NewtonPhysics.RealtimeGraph(document.getElementById('graph2')),
        law3: new NewtonPhysics.RealtimeGraph(document.getElementById('graph3')),
      };

      // Law 1: speed
      this.graphs.law1.addSeries('Speed (m/s)', '#00d4ff', 'velocity');

      // Law 2: velocity + acceleration
      this.graphs.law2.addSeries('v (m/s)', '#2ecc71', 'velocity');
      this.graphs.law2.addSeries('a (m/s\u00b2)', '#ff6b35', 'acceleration');

      // Law 3: momentum p1, p2 + KE
      this.graphs.law3.addSeries('p\u2081 (kg\u00b7m/s)', '#ff2d95', 'p1');
      this.graphs.law3.addSeries('p\u2082 (kg\u00b7m/s)', '#ffcc00', 'p2');
      this.graphs.law3.addSeries('KE (J)', '#4ecdc4', 'ke');
    }

    // ---- Event Bindings ----
    _bindEvents() {
      // Window resize
      window.addEventListener('resize', () => {
        this._setupCanvases();
        // Recreate simulations with new canvas sizes
        this._createSimulations();
        this._createGraphs();
        if (this.currentLaw === 3) {
          // Restore scenario
          const activeBtn = document.querySelector('.scenario-btn.active');
          if (activeBtn) {
            const scenario = Array.from(activeBtn.parentElement.children).indexOf(activeBtn);
            const names = ['equal', 'heavy-light', 'inelastic', 'recoil', 'chain'];
            this.sims.law3.createScenario(names[scenario] || 'equal');
          }
        }
      });

      // Keyboard shortcuts
      document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === '1') this.switchLaw(1);
        if (e.key === '2') this.switchLaw(2);
        if (e.key === '3') this.switchLaw(3);
        if (e.key === ' ') {
          e.preventDefault();
          if (this.currentLaw === 2) {
            this.sims.law2.thrust();
            this.sims.law2.setRunning(true);
          } else if (this.currentLaw === 3) {
            this.sims.law3.launch();
          }
        }
        if (e.key === 'r' || e.key === 'R') {
          if (this.currentLaw === 1) this.sims.law1.reset();
          if (this.currentLaw === 2) this.sims.law2.reset();
          if (this.currentLaw === 3) this.sims.law3.reset();
        }
      });
    }

    // ---- Canvas Click for Law 1 ----
    _bindCanvasClick() {
      const canvas1 = document.getElementById('canvas1');
      canvas1.addEventListener('click', e => {
        const rect = canvas1.getBoundingClientRect();
        const scaleX = canvas1.width / rect.width;
        const scaleY = canvas1.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        this.sims.law1.applyImpulse(x, y);
      });
    }

    // ---- Animation Loop ----
    _startLoop() {
      const loop = (timestamp) => {
        const dt = this.lastTime ? (timestamp - this.lastTime) / 1000 : 1 / 60;
        this.lastTime = timestamp;

        // Update current simulation
        if (this.currentLaw === 1) {
          this.sims.law1.update(dt);
          this.sims.law1.draw();
          this._updateLaw1Data();
        } else if (this.currentLaw === 2) {
          this.sims.law2.update(dt);
          this.sims.law2.draw();
          this._updateLaw2Data();
        } else if (this.currentLaw === 3) {
          this.sims.law3.update(dt);
          this.sims.law3.draw();
          this._updateLaw3Data();
        }

        // Draw graphs
        this.graphs.law1.draw();
        this.graphs.law2.draw();
        this.graphs.law3.draw();

        // Push graph data
        if (this.currentLaw === 1) {
          const s = this.sims.law1.getState();
          this.graphs.law1.push('velocity', s.velocity);
        } else if (this.currentLaw === 2) {
          const s = this.sims.law2.getState();
          this.graphs.law2.push('velocity', s.velocity);
          this.graphs.law2.push('acceleration', s.acceleration);
        } else if (this.currentLaw === 3) {
          const s = this.sims.law3.getState();
          this.graphs.law3.push('p1', s.p1);
          this.graphs.law3.push('p2', s.p2);
          this.graphs.law3.push('ke', s.ke);
        }

        this.animFrameId = requestAnimationFrame(loop);
      };

      this.animFrameId = requestAnimationFrame(loop);
    }

    // ================================================================
    // TAB SWITCHING
    // ================================================================

    switchLaw(n) {
      this.currentLaw = n;

      // Update tabs
      document.querySelectorAll('.law-tab').forEach(tab => {
        tab.classList.toggle('active', parseInt(tab.dataset.law) === n);
      });

      // Update sections
      document.querySelectorAll('.law-section').forEach(section => {
        section.classList.toggle('active', parseInt(section.dataset.law) === n);
      });

      // Sync canvases — redraw current on top
      if (n === 1) { this.sims.law1.draw(); }
      if (n === 2) { this.sims.law2.draw(); }
      if (n === 3) { this.sims.law3.draw(); }
    }

    // ================================================================
    // LAW 1 DATA UPDATE
    // ================================================================

    _updateLaw1Data() {
      const sim = this.sims.law1;
      const state = sim.getState();
      const data = sim.getGraphData();

      document.getElementById('law1-speed').textContent = state.velocity.toFixed(2);
      document.getElementById('law1-friction').textContent = (state.friction * 9.8 * 1).toFixed(3);
      document.getElementById('law1-net').textContent = state.friction > 0
        ? (-(state.friction * 9.8 * 1)).toFixed(3)
        : '0.000';

      const t = sim.state ? sim.state.time : 0;
      document.getElementById('law1-time').textContent = t.toFixed(1);

      // Status
      const statusEl = document.getElementById('law1-status');
      const moving = state.velocity > 0.1;
      statusEl.textContent = moving ? 'In Motion' : 'Paused';
      statusEl.className = 'status-badge ' + (moving ? 'running' : 'stopped');
    }

    // ================================================================
    // LAW 2 DATA UPDATE
    // ================================================================

    _updateLaw2Data() {
      const sim = this.sims.law2;
      const state = sim.getState();

      document.getElementById('law2-force').textContent = Math.abs(state.force).toFixed(1);
      document.getElementById('law2-mass').textContent = state.mass.toFixed(1);
      document.getElementById('law2-accel').textContent = state.acceleration.toFixed(2);
      document.getElementById('law2-vel').textContent = state.velocity.toFixed(2);
      document.getElementById('law2-pos').textContent = state.position.toFixed(1);

      // Status
      const statusEl = document.getElementById('law2-status');
      const isRunning = sim.state && sim.state.running;
      statusEl.textContent = isRunning ? 'Thrust Active' : 'Paused';
      statusEl.className = 'status-badge ' + (isRunning ? 'running' : 'stopped');
    }

    // ================================================================
    // LAW 3 DATA UPDATE
    // ================================================================

    _updateLaw3Data() {
      const sim = this.sims.law3;
      const state = sim.getState();

      document.getElementById('law3-p1').textContent = state.p1.toFixed(3);
      document.getElementById('law3-p2').textContent = state.p2.toFixed(3);
      document.getElementById('law3-p-total').innerHTML =
        `${state.p1.toFixed(3)} <span class="data-unit">+ ${state.p2.toFixed(3)} = ${(state.p1 + state.p2).toFixed(3)} kg\u00b7m/s</span>`;
      document.getElementById('law3-ke').innerHTML =
        `${state.ke.toFixed(2)} <span class="data-unit">J</span>`;

      // Status
      const statusEl = document.getElementById('law3-status');
      const isRunning = state.running;
      statusEl.textContent = isRunning ? 'Collision Active' : 'Ready';
      statusEl.className = 'status-badge ' + (isRunning ? 'running' : 'stopped');
    }

  }

  // ================================================================
  // LAW 1 CONTROLLER (exposed as NewtonApp.law1)
  // ================================================================

  const Law1Controller = {
    get sim() { return window.NewtonApp ? window.NewtonApp._getSim1() : null; },
  };

  // ================================================================
  // INIT
  // ================================================================

  let appInstance = null;

  function initApp() {
    if (appInstance) return;
    appInstance = new NewtonApp();
    window.NewtonApp = appInstance;

    // Expose law controllers for HTML onclick handlers
    window.NewtonApp.law1 = {
      setSurface(type, btn) {
        const surfaces = { space: 0, ice: 0.02, wood: 0.15, carpet: 0.4 };
        const friction = surfaces[type] || 0;
        appInstance.sims.law1.setFriction(friction, type.charAt(0).toUpperCase() + type.slice(1));

        // Update slider
        document.getElementById('friction-slider').value = friction;
        document.getElementById('friction-value').textContent = friction.toFixed(3);

        // Update buttons
        document.querySelectorAll('.surface-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
      },

      setFriction(val) {
        const friction = parseFloat(val);
        appInstance.sims.law1.setFriction(friction, 'Custom');
        document.getElementById('friction-value').textContent = friction.toFixed(3);

        // Deactivate surface buttons
        document.querySelectorAll('.surface-btn').forEach(b => b.classList.remove('active'));
      },

      setImpulse(val) {
        appInstance.sims.law1.state.impulseStrength = parseFloat(val);
        document.getElementById('impulse-value').textContent = parseFloat(val).toFixed(1);
      },

      reset() {
        appInstance.sims.law1.reset();
        appInstance.graphs.law1.clear();
        document.getElementById('friction-slider').value = 0;
        document.getElementById('friction-value').textContent = '0.000';
        document.querySelectorAll('.surface-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-surface="space"]').classList.add('active');
      },
    };

    window.NewtonApp.law2 = {
      setForce(val) {
        const force = parseFloat(val);
        appInstance.sims.law2.setForce(force);
        document.getElementById('force-value').textContent = force + ' N';
      },

      setMass(val) {
        const mass = parseFloat(val);
        appInstance.sims.law2.setMass(mass);
        document.getElementById('mass-value').textContent = mass.toFixed(1) + ' kg';
      },

      setDirection(dir) {
        appInstance.sims.law2.setDirection(dir);
      },

      setRunning(running) {
        // Handled by thrust() already
      },

      thrust() {
        appInstance.sims.law2.thrust();
      },

      dropCargo() {
        appInstance.sims.law2.dropCargo();
        document.getElementById('mass-value').textContent =
          appInstance.sims.law2.state.mass.toFixed(1) + ' kg';
        document.getElementById('mass-slider').value = appInstance.sims.law2.state.mass;
      },

      reset() {
        appInstance.sims.law2.reset();
        appInstance.graphs.law2.clear();
        document.getElementById('force-slider').value = 50;
        document.getElementById('force-value').textContent = '50 N';
        document.getElementById('mass-slider').value = 10;
        document.getElementById('mass-value').textContent = '10.0 kg';
      },
    };

    window.NewtonApp.law3 = {
      setScenario(name, btn) {
        appInstance.sims.law3.createScenario(name);
        appInstance.sims.law3.setCollisionType(appInstance.sims.law3.state.collisionType);
        appInstance.graphs.law3.clear();

        // Update buttons
        document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        // Update launch button
        const launchBtn = document.getElementById('launch-btn');
        if (launchBtn) {
          launchBtn.disabled = false;
          launchBtn.textContent = '\u25B6 LAUNCH';
        }
      },

      setCollisionType(type, btn) {
        appInstance.sims.law3.setCollisionType(type);
        document.getElementById('collision-type-label').textContent =
          type === 'elastic' ? 'Elastic (KE conserved)' : 'Inelastic (KE lost)';

        document.getElementById('elastic-btn').classList.toggle('active', type === 'elastic');
        document.getElementById('inelastic-btn').classList.toggle('active', type === 'inelastic');
      },

      launch() {
        appInstance.sims.law3.launch();
        const launchBtn = document.getElementById('launch-btn');
        if (launchBtn) {
          launchBtn.disabled = true;
          launchBtn.textContent = '\u25B6 Running...';
        }
      },

      reset() {
        appInstance.sims.law3.reset();
        appInstance.graphs.law3.clear();
        const launchBtn = document.getElementById('launch-btn');
        if (launchBtn) {
          launchBtn.disabled = false;
          launchBtn.textContent = '\u25B6 LAUNCH';
        }
      },
    };
  }

  // ================================================================
  // BOOT
  // ================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
