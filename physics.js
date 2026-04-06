/**
 * Newton's Laws of Motion — Physics Engine
 * Vector2 class + simulation engines for all 3 laws
 */

// roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    this.moveTo(x + r[0], y);
    this.lineTo(x + w - r[1], y);
    this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
    this.lineTo(x + w, y + h - r[2]);
    this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    this.lineTo(x + r[3], y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
    this.lineTo(x, y + r[0]);
    this.quadraticCurveTo(x, y, x + r[0], y);
    this.closePath();
  };
}

(function () {
  'use strict';

  // ================================================================
  // VECTOR2 CLASS
  // ================================================================

  class Vector2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }

    clone() { return new Vector2(this.x, this.y); }
    add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector2(this.x - v.x, this.y - v.y); }
    mul(s) { return new Vector2(this.x * s, this.y * s); }
    div(s) { return s !== 0 ? new Vector2(this.x / s, this.y / s) : new Vector2(0, 0); }
    dot(v) { return this.x * v.x + this.y * v.y; }
    magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    magnitudeSq() { return this.x * this.x + this.y * this.y; }
    normalize() { const m = this.magnitude(); return m > 0 ? this.div(m) : new Vector2(0, 0); }
    scale(sx, sy) { return new Vector2(this.x * sx, this.y * sy); }
    rotate(angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return new Vector2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
    }
    limit(max) { const m = this.magnitude(); return m > max ? this.normalize().mul(max) : this.clone(); }
    static lerp(a, b, t) { return new Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t); }
    static dist(a, b) { return a.sub(b).magnitude(); }
    static random() { return new Vector2(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(); }
  }

  window.Vector2 = Vector2;

  // ================================================================
  // UTILITY
  // ================================================================

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // ================================================================
  // PARTICLE CLASS (shared)
  // ================================================================

  class Particle {
    constructor(x, y, radius, mass, color) {
      this.pos = new Vector2(x, y);
      this.vel = new Vector2(0, 0);
      this.acc = new Vector2(0, 0);
      this.radius = radius;
      this.mass = mass;
      this.color = color;
      this.label = '';
      this.trail = [];
      this.maxTrail = 120;
      this.isStatic = false;
    }

    applyForce(force) {
      if (this.isStatic) return;
      this.acc = this.acc.add(force.div(this.mass));
    }

    update(dt) {
      if (this.isStatic) return;
      // Semi-implicit Euler
      this.vel = this.vel.add(this.acc.mul(dt));
      this.pos = this.pos.add(this.vel.mul(dt));
      this.acc = new Vector2(0, 0);

      // Trail
      if (this.trail.length >= this.maxTrail) this.trail.shift();
      this.trail.push({ x: this.pos.x, y: this.pos.y, v: this.vel.magnitude() });
    }

    draw(ctx) {
      // Draw trail
      if (this.trail.length > 1) {
        for (let i = 1; i < this.trail.length; i++) {
          const alpha = (i / this.trail.length) * 0.4;
          const speed = this.trail[i].v;
          const r = parseInt(this.color.slice(1, 3), 16);
          const g = parseInt(this.color.slice(3, 5), 16);
          const b = parseInt(this.color.slice(5, 7), 16);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = Math.max(1, this.radius * 0.4 * (i / this.trail.length));
          ctx.beginPath();
          ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
          ctx.stroke();
        }
      }

      // Draw body with gradient
      const grad = ctx.createRadialGradient(
        this.pos.x - this.radius * 0.3, this.pos.y - this.radius * 0.3, this.radius * 0.1,
        this.pos.x, this.pos.y, this.radius
      );
      const r = parseInt(this.color.slice(1, 3), 16);
      const g = parseInt(this.color.slice(3, 5), 16);
      const b = parseInt(this.color.slice(5, 7), 16);
      grad.addColorStop(0, `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},1)`);
      grad.addColorStop(1, this.color);

      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(this.pos.x - this.radius * 0.25, this.pos.y - this.radius * 0.25, this.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();

      // Label
      if (this.label) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, this.radius * 0.7)}px "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, this.pos.x, this.pos.y);
      }
    }

    drawArrow(ctx, from, to, color, headSize = 8, label = '') {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const angle = Math.atan2(dy, dx);
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag < 2) return;

      const endX = from.x + Math.cos(angle) * (mag - headSize);
      const endY = from.y + Math.sin(angle) * (mag - headSize);

      // Shaft
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrowhead
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - headSize * Math.cos(angle - Math.PI / 6), to.y - headSize * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(to.x - headSize * Math.cos(angle + Math.PI / 6), to.y - headSize * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      // Label
      if (label) {
        const midX = from.x + dx * 0.5;
        const midY = from.y + dy * 0.5;
        ctx.fillStyle = color;
        ctx.font = 'bold 11px "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, midY - 8);
      }
    }
  }

  // ================================================================
  // LAW 1: FIRST LAW — INERTIA
  // Space Hockey Table Simulation
  // ================================================================

  class Law1Simulation {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.forceArrows = [];
      this.impactPoint = null;
      this.impactTime = 0;

      this.state = {
        friction: 0,
        selectedParticle: null,
        running: true,
        time: 0,
        impulseStrength: 5,
        surfaceType: 'Space',
      };

      this.graphData = { time: [], velocity: [], position: [] };

      this._init();
    }

    _init() {
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Create 3 particles with different masses
      this.particles = [
        new Particle(w * 0.2, h * 0.5, 22, 1.5, '#00d4ff'),
        new Particle(w * 0.35, h * 0.3, 32, 4.0, '#00d4ff'),
        new Particle(w * 0.5, h * 0.65, 18, 1.0, '#00d4ff'),
      ];
      this.particles[0].label = '1.5kg';
      this.particles[1].label = '4.0kg';
      this.particles[2].label = '1.0kg';

      this.particles.forEach(p => {
        p.vel = new Vector2(2, 0);
        p.trail = [];
      });
    }

    reset() {
      this.state = {
        friction: 0,
        selectedParticle: null,
        running: true,
        time: 0,
        impulseStrength: 5,
        surfaceType: 'Space',
      };
      this.graphData = { time: [], velocity: [], position: [] };
      this.forceArrows = [];
      this.impactPoint = null;
      this._init();
    }

    setFriction(f, label) {
      this.state.friction = f;
      this.state.surfaceType = label;
    }

    applyImpulse(x, y) {
      // Find closest particle and apply impulse
      let closest = null;
      let minDist = Infinity;
      this.particles.forEach(p => {
        const d = Vector2.dist(new Vector2(x, y), p.pos);
        if (d < minDist) { minDist = d; closest = p; }
      });
      if (closest && minDist < 120) {
        const dir = closest.pos.sub(new Vector2(x, y)).normalize();
        closest.vel = closest.vel.add(dir.mul(this.state.impulseStrength / closest.mass));
        this.impactPoint = new Vector2(x, y);
        this.impactTime = 2;
      }
    }

    update(dt) {
      dt = Math.min(dt, 1 / 30);
      this.state.time += dt;

      // Update particles
      this.particles.forEach(p => {
        // Friction force (opposing motion)
        if (this.state.friction > 0) {
          const frictionForce = p.vel.normalize().mul(-this.state.friction * 9.8 * p.mass);
          p.applyForce(frictionForce);
        }

        p.update(dt);

        // Wall bounce
        if (p.pos.x - p.radius < 0) {
          p.pos.x = p.radius;
          p.vel.x *= -0.9;
        }
        if (p.pos.x + p.radius > this.canvas.width) {
          p.pos.x = this.canvas.width - p.radius;
          p.vel.x *= -0.9;
        }
        if (p.pos.y - p.radius < 0) {
          p.pos.y = p.radius;
          p.vel.y *= -0.9;
        }
        if (p.pos.y + p.radius > this.canvas.height) {
          p.pos.y = this.canvas.height - p.radius;
          p.vel.y *= -0.9;
        }
      });

      // Particle-particle collision
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const a = this.particles[i];
          const b = this.particles[j];
          const d = Vector2.dist(a.pos, b.pos);
          const minDist = a.radius + b.radius;
          if (d < minDist) {
            const normal = b.pos.sub(a.pos).normalize();
            const relVel = b.vel.sub(a.vel);
            const velAlongNormal = relVel.dot(normal);
            if (velAlongNormal < 0) {
              const restitution = 0.95;
              const j2 = -(1 + restitution) * velAlongNormal / (1 / a.mass + 1 / b.mass);
              const impulse = normal.mul(j2);
              a.vel = a.vel.sub(impulse.div(a.mass));
              b.vel = b.vel.add(impulse.div(b.mass));

              // Separate
              const overlap = minDist - d;
              a.pos = a.pos.sub(normal.mul(overlap * 0.5));
              b.pos = b.pos.add(normal.mul(overlap * 0.5));
            }
          }
        }
      }

      // Impact flash
      if (this.impactTime > 0) this.impactTime -= dt;

      // Graph data
      if (this.state.time % 0.1 < dt) {
        const avgVel = this.particles.reduce((s, p) => s + p.vel.magnitude(), 0) / this.particles.length;
        const avgPos = this.particles.reduce((s, p) => s + p.pos.x, 0) / this.particles.length;
        this.graphData.time.push(this.state.time);
        this.graphData.velocity.push(avgVel);
        this.graphData.position.push(avgPos);
        if (this.graphData.time.length > 200) {
          this.graphData.time.shift();
          this.graphData.velocity.shift();
          this.graphData.position.shift();
        }
      }
    }

    draw() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Background
      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, w, h);

      // Surface texture (grid)
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Surface type label
      const surfaceColors = {
        'Space': 'rgba(0, 212, 255, 0.3)',
        'Ice': 'rgba(180, 220, 255, 0.15)',
        'Wood': 'rgba(180, 120, 60, 0.12)',
        'Carpet': 'rgba(120, 80, 60, 0.12)',
      };
      ctx.fillStyle = surfaceColors[this.state.surfaceType] || surfaceColors['Space'];
      ctx.fillRect(0, h - 80, w, 80);

      // Surface lines
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, h - 80); ctx.lineTo(x, h); ctx.stroke();
      }

      // Draw particles
      this.particles.forEach(p => {
        p.draw(ctx);

        // Velocity arrow
        if (p.vel.magnitude() > 0.5) {
          const arrowEnd = p.pos.add(p.vel.mul(8));
          this._drawArrow(ctx, p.pos, arrowEnd, '#00ff88', 6, `${p.vel.magnitude().toFixed(1)} m/s`);
        }
      });

      // Impact flash
      if (this.impactPoint && this.impactTime > 0) {
        const alpha = this.impactTime / 2;
        ctx.beginPath();
        ctx.arc(this.impactPoint.x, this.impactPoint.y, 30 * (1 - this.impactTime / 2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${alpha * 0.4})`;
        ctx.fill();
      }

      // Click hint
      if (this.state.friction === 0) {
        ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.font = '11px "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Click anywhere to apply impulse', w / 2, h - 20);
      }

      // Friction indicator
      const mu = this.state.friction;
      ctx.fillStyle = '#4a5060';
      ctx.font = '12px "Segoe UI", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`\u03BC = ${mu.toFixed(3)}`, 15, h - 25);
      ctx.fillText(`F_friction = ${(mu * 9.8 * 1).toFixed(2)} N`, 15, h - 10);
    }

    _drawArrow(ctx, from, to, color, headSize = 8, label = '') {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const angle = Math.atan2(dy, dx);
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag < 2) return;

      const endX = from.x + Math.cos(angle) * (mag - headSize);
      const endY = from.y + Math.sin(angle) * (mag - headSize);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - headSize * Math.cos(angle - Math.PI / 6), to.y - headSize * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(to.x - headSize * Math.cos(angle + Math.PI / 6), to.y - headSize * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, from.x + dx * 0.5, from.y + dy * 0.5 - 10);
      }
    }

    getGraphData() { return this.graphData; }
    getState() {
      const p = this.particles[0];
      return {
        velocity: p ? p.vel.magnitude() : 0,
        friction: this.state.friction,
        surface: this.state.surfaceType,
      };
    }
  }

  // ================================================================
  // LAW 2: SECOND LAW — F = ma
  // Rocket Sled / Thruster Cart
  // ================================================================

  class Law2Simulation {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cart = null;
      this.ground = null;
      this.rockets = [];
      this.particles = [];
      this.state = {
        mass: 10,
        force: 50,
        velocity: 0,
        position: 80,
        running: false,
        time: 0,
        direction: 1,
        cargoMass: 0,
      };

      this.graphData = { time: [], velocity: [], acceleration: [], position: [] };
      this.maxHistory = 300;
      this._init();
    }

    _init() {
      this.cart = {
        x: this.state.position,
        y: this.canvas.height * 0.65,
        width: 100,
        height: 50,
        mass: this.state.mass,
      };
      this.rockets = [];
      this.particles = [];
      this.graphData = { time: [], velocity: [], acceleration: [], position: [] };
    }

    reset() {
      this.state = {
        mass: 10,
        force: 50,
        velocity: 0,
        position: 80,
        running: false,
        time: 0,
        direction: 1,
        cargoMass: 0,
      };
      this._init();
    }

    setForce(f) { this.state.force = f; }
    setMass(m) { this.state.mass = m; this.cart.mass = m; }
    setDirection(d) { this.state.direction = d; }

    thrust() {
      this.state.running = true;
      // Add rocket flame particles
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: this.cart.x - 10,
          y: this.cart.y + this.cart.height * 0.5,
          vx: -3 - Math.random() * 4,
          vy: (Math.random() - 0.5) * 3,
          life: 1,
          maxLife: 1,
          size: 3 + Math.random() * 5,
        });
      }
    }

    dropCargo() {
      if (this.state.cargoMass > 0) {
        this.state.mass -= this.state.cargoMass;
        this.cart.mass = this.state.mass;
        this.state.cargoMass = 0;
      } else {
        this.state.cargoMass = this.state.mass * 0.3;
      }
    }

    update(dt) {
      dt = Math.min(dt, 1 / 30);

      const m = this.state.mass;
      const F = this.state.force * this.state.direction;
      const a = F / m;

      if (this.state.running) {
        this.state.time += dt;
        this.state.velocity += a * dt;
        this.state.position += this.state.velocity * dt;
        this.cart.x = this.state.position;

        // Wall bounce
        if (this.cart.x < 60) {
          this.cart.x = 60;
          this.state.velocity *= -0.5;
        }
        if (this.cart.x > this.canvas.width - 60) {
          this.cart.x = this.canvas.width - 60;
          this.state.velocity *= -0.5;
        }
      }

      // Cargo swing
      if (this.state.cargoMass > 0) {
        this.cart.cargoSwing = (this.cart.cargoSwing || 0) + dt * 2;
      }

      // Flame particles
      this.particles = this.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 2;
        return p.life > 0;
      });

      // Add new flame particles while thrusting
      if (this.state.running) {
        for (let i = 0; i < 2; i++) {
          this.particles.push({
            x: this.cart.x - 5,
            y: this.cart.y + this.cart.height * 0.5,
            vx: -2 - Math.random() * 5 - Math.abs(this.state.velocity) * 0.1,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            maxLife: 1,
            size: 3 + Math.random() * 6,
          });
        }
      }

      // Graph data
      this.graphData.time.push(this.state.time);
      this.graphData.velocity.push(this.state.velocity);
      this.graphData.acceleration.push(a);
      this.graphData.position.push(this.state.position);

      if (this.graphData.time.length > this.maxHistory) {
        this.graphData.time.shift();
        this.graphData.velocity.shift();
        this.graphData.acceleration.shift();
        this.graphData.position.shift();
      }
    }

    draw() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Background
      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Ground
      const groundY = this.cart.y + this.cart.height + 10;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, groundY, w, h - groundY);

      // Track lines
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + 10, groundY + 8); ctx.stroke();
      }
      ctx.fillStyle = '#2a2a4a';
      ctx.fillRect(0, groundY, w, 3);

      // Distance markers
      ctx.fillStyle = '#3a3a5a';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      for (let x = 60; x < w; x += 100) {
        ctx.fillRect(x, groundY + 5, 1, 8);
        const dist = Math.round((x - 60) / 10);
        ctx.fillText(`${dist}m`, x, groundY + 20);
      }

      // Flame particles
      this.particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        const hue = lerp(30, 0, 1 - alpha); // orange to red
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, ${50 + alpha * 20}%, ${alpha})`;
        ctx.fill();
      });

      // Cart body
      const cx = this.cart.x;
      const cy = this.cart.y;
      const cw = this.cart.width;
      const ch = this.cart.height;

      // Cart shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(cx - cw / 2 + 5, groundY + 3, cw, 6);

      // Wheels
      ctx.fillStyle = '#3a3a5a';
      ctx.beginPath(); ctx.arc(cx - cw * 0.3, groundY, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + cw * 0.3, groundY, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a5a7a';
      ctx.beginPath(); ctx.arc(cx - cw * 0.3, groundY, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + cw * 0.3, groundY, 5, 0, Math.PI * 2); ctx.fill();

      // Cart body gradient
      const cartGrad = ctx.createLinearGradient(cx, cy - ch, cx, cy + ch * 0.5);
      cartGrad.addColorStop(0, '#ff6b35');
      cartGrad.addColorStop(1, '#c44020');
      ctx.fillStyle = cartGrad;
      ctx.beginPath();
      ctx.roundRect(cx - cw / 2, cy, cw, ch, 5);
      ctx.fill();

      // Cart detail
      ctx.fillStyle = '#ff8c5a';
      ctx.fillRect(cx - cw / 2 + 5, cy + 5, cw - 10, 8);

      // Thruster nozzle
      ctx.fillStyle = '#4a3040';
      ctx.fillRect(cx - cw / 2 - 15, cy + ch * 0.3, 15, ch * 0.4);

      // Cargo
      if (this.state.cargoMass > 0) {
        const swing = Math.sin(this.cart.cargoSwing || 0) * 5;
        ctx.fillStyle = '#ff8c5a';
        ctx.beginPath();
        ctx.roundRect(cx - 15 + swing, cy - 25, 30, 20, 3);
        ctx.fill();
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + swing, cy);
        ctx.lineTo(cx + swing, cy - 25);
        ctx.stroke();
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.state.cargoMass.toFixed(1)}kg`, cx + swing, cy - 14);
      }

      // Mass label on cart
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.state.mass.toFixed(1)} kg`, cx, cy + ch * 0.65);

      // Force arrow
      const F = this.state.force * this.state.direction;
      if (F !== 0 && this.state.running) {
        const arrowStart = this.state.direction > 0
          ? new Vector2(cx - cw / 2 - 15, cy + ch * 0.5)
          : new Vector2(cx + cw / 2 + 15, cy + ch * 0.5);
        const arrowEnd = arrowStart.add(new Vector2(this.state.direction * (80 + Math.abs(F) * 0.3), 0));
        this._drawArrow(ctx, arrowStart, arrowEnd, '#ffcc00', 8, `F = ${F.toFixed(0)} N`);

        // Reaction arrow (equal, opposite)
        const reactStart = arrowStart.add(new Vector2(-this.state.direction * 5, 0));
        const reactEnd = reactStart.add(new Vector2(-this.state.direction * 30, 0));
        this._drawArrow(ctx, reactStart, reactEnd, '#888', 5, '');
      }

      // Velocity arrow above cart
      if (Math.abs(this.state.velocity) > 0.1) {
        const vDir = this.state.velocity > 0 ? 1 : -1;
        const vArrowStart = new Vector2(cx, cy - ch - 15);
        const vArrowEnd = vArrowStart.add(new Vector2(vDir * Math.min(Math.abs(this.state.velocity) * 5, 60), 0));
        this._drawArrow(ctx, vArrowStart, vArrowEnd, '#00ff88', 6, `${Math.abs(this.state.velocity).toFixed(1)} m/s`);
      }

      // Labels
      ctx.fillStyle = '#5a6a82';
      ctx.font = '11px "Segoe UI", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`x = ${this.state.position.toFixed(1)} m`, 15, 30);
      ctx.fillText(`v = ${this.state.velocity.toFixed(2)} m/s`, 15, 50);
      ctx.fillText(`a = ${(F / this.state.mass).toFixed(2)} m/s\u00b2`, 15, 70);
      ctx.fillText(`m = ${this.state.mass.toFixed(1)} kg`, 15, 90);
      ctx.fillText(`F = ${F.toFixed(1)} N`, 15, 110);
    }

    _drawArrow(ctx, from, to, color, headSize = 8, label = '') {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const angle = Math.atan2(dy, dx);
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag < 2) return;

      const endX = from.x + Math.cos(angle) * (mag - headSize);
      const endY = from.y + Math.sin(angle) * (mag - headSize);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - headSize * Math.cos(angle - Math.PI / 6), to.y - headSize * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(to.x - headSize * Math.cos(angle + Math.PI / 6), to.y - headSize * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      if (label) {
        const midX = from.x + dx * 0.5;
        const midY = from.y + dy * 0.5 - 8;
        ctx.fillStyle = color;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, midY);
      }
    }

    getGraphData() { return this.graphData; }
    getState() {
      const F = this.state.force * this.state.direction;
      return {
        force: F,
        mass: this.state.mass,
        acceleration: F / this.state.mass,
        velocity: this.state.velocity,
        position: this.state.position,
        time: this.state.time,
      };
    }
  }

  // ================================================================
  // LAW 3: THIRD LAW — ACTION & REACTION
  // Collision Arena
  // ================================================================

  class Law3Simulation {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.balls = [];
      this.arrows = [];
      this.collisionEvents = [];
      this.state = {
        running: false,
        time: 0,
        collisionType: 'elastic', // 'elastic' or 'inelastic'
      };

      this.graphData = { time: [], p1: [], p2: [], ke: [] };
      this.maxHistory = 300;

      this._init();
    }

    _init() {
      this.balls = [];
      this.arrows = [];
      this.collisionEvents = [];
      this.graphData = { time: [], p1: [], p2: [], ke: [] };
    }

    reset() {
      this.state = {
        running: false,
        time: 0,
        collisionType: this.state.collisionType,
      };
      this._init();
    }

    setCollisionType(t) { this.state.collisionType = t; }

    createScenario(name) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const midY = h * 0.6;

      this._init();

      switch (name) {
        case 'equal': {
          // Equal mass, head-on collision
          this.balls.push(new Particle(w * 0.25, midY, 30, 2.0, '#ff2d95'));
          this.balls.push(new Particle(w * 0.75, midY, 30, 2.0, '#ff2d95'));
          this.balls[0].vel = new Vector2(4, 0);
          this.balls[1].vel = new Vector2(-4, 0);
          this.balls[0].label = '2kg';
          this.balls[1].label = '2kg';
          break;
        }
        case 'heavy-light': {
          // Heavy vs light, equal speed
          this.balls.push(new Particle(w * 0.3, midY, 22, 1.0, '#ff2d95'));
          this.balls.push(new Particle(w * 0.7, midY, 45, 8.0, '#9b2d6b'));
          this.balls[0].vel = new Vector2(4, 0);
          this.balls[1].vel = new Vector2(-2, 0);
          this.balls[0].label = '1kg';
          this.balls[1].label = '8kg';
          break;
        }
        case 'chain': {
          // 3 balls in a row
          this.balls.push(new Particle(w * 0.2, midY, 30, 3.0, '#ff2d95'));
          this.balls.push(new Particle(w * 0.5, midY, 25, 2.0, '#ff5daa'));
          this.balls.push(new Particle(w * 0.8, midY, 30, 3.0, '#ff2d95'));
          this.balls[0].vel = new Vector2(5, 0);
          this.balls[1].vel = new Vector2(0, 0);
          this.balls[2].vel = new Vector2(0, 0);
          this.balls[0].label = '3kg';
          this.balls[1].label = '2kg';
          this.balls[2].label = '3kg';
          break;
        }
        case 'recoil': {
          // Cannon recoil: cannon and ball touching, ready to fire
          this.balls.push(new Particle(w * 0.35, midY, 40, 10.0, '#8B4513'));
          this.balls.push(new Particle(w * 0.35 + 52, midY, 12, 0.5, '#c0c0c0'));
          this.balls[0].vel = new Vector2(0, 0);
          this.balls[1].vel = new Vector2(0, 0);
          this.balls[0].label = '10kg';
          this.balls[1].label = '0.5kg';
          break;
        }
        case 'inelastic': {
          // Perfectly inelastic: balls stick together
          this.balls.push(new Particle(w * 0.3, midY, 30, 2.0, '#ff2d95'));
          this.balls.push(new Particle(w * 0.7, midY, 30, 2.0, '#cc1a70'));
          this.balls[0].vel = new Vector2(3, 0);
          this.balls[1].vel = new Vector2(-2, 0);
          this.balls[0].label = '2kg';
          this.balls[1].label = '2kg';
          break;
        }
      }

      this.state.running = false;
      this.state.time = 0;
    }

    launch() {
      if (this.balls.length === 0) return;

      // For recoil scenario, fire the ball
      if (this.balls.length === 2 && this.balls[0].radius > 35) {
        const cannon = this.balls[0];
        const ball = this.balls[1];
        // Cannon recoil: cannon goes left, ball goes right
        // Conservation of momentum: m1*v1 + m2*v2 = 0
        const vBall = (cannon.mass / ball.mass) * 8; // ball velocity
        cannon.vel = new Vector2(-8, 0); // cannon recoil
        ball.vel = new Vector2(vBall, (Math.random() - 0.5) * 1);
      }

      this.state.running = true;
    }

    update(dt) {
      dt = Math.min(dt, 1 / 30);
      if (!this.state.running) return;
      this.state.time += dt;

      const elastic = this.state.collisionType === 'elastic';
      const eCoeff = elastic ? 0.98 : 0.1;

      // Update balls
      this.balls.forEach(b => b.update(dt));

      // Wall collision
      this.balls.forEach(b => {
        if (b.pos.x - b.radius < 0) {
          b.pos.x = b.radius;
          b.vel.x *= -eCoeff;
        }
        if (b.pos.x + b.radius > this.canvas.width) {
          b.pos.x = this.canvas.width - b.radius;
          b.vel.x *= -eCoeff;
        }
        if (b.pos.y - b.radius < 40) {
          b.pos.y = 40 + b.radius;
          b.vel.y *= -eCoeff;
        }
        if (b.pos.y + b.radius > this.canvas.height - 10) {
          b.pos.y = this.canvas.height - 10 - b.radius;
          b.vel.y *= -eCoeff;
        }
      });

      // Ball-ball collision
      for (let i = 0; i < this.balls.length; i++) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const a = this.balls[i];
          const b = this.balls[j];
          const d = Vector2.dist(a.pos, b.pos);
          const minDist = a.radius + b.radius;

          if (d < minDist && d > 0) {
            const normal = b.pos.sub(a.pos).normalize();
            const tangent = new Vector2(-normal.y, normal.x);

            // Decompose velocities
            const v1n = normal.dot(a.vel);
            const v1t = tangent.dot(a.vel);
            const v2n = normal.dot(b.vel);
            const v2t = tangent.dot(b.vel);

            // Normal velocity after collision
            let v1nP, v2nP;
            if (elastic) {
              // Elastic collision formula
              v1nP = ((a.mass - b.mass) * v1n + 2 * b.mass * v2n) / (a.mass + b.mass);
              v2nP = ((b.mass - a.mass) * v2n + 2 * a.mass * v1n) / (a.mass + b.mass);
            } else {
              // Perfectly inelastic — objects stick
              const vFinal = (a.mass * v1n + b.mass * v2n) / (a.mass + b.mass);
              v1nP = vFinal;
              v2nP = vFinal;
            }

            // Reconstruct velocities
            a.vel = normal.mul(v1nP).add(tangent.mul(v1t));
            b.vel = normal.mul(v2nP).add(tangent.mul(v2t));

            // Separate
            const overlap = minDist - d;
            a.pos = a.pos.sub(normal.mul(overlap * 0.5));
            b.pos = b.pos.add(normal.mul(overlap * 0.5));

            // Record collision
            this.collisionEvents.push({
              pos: a.pos.add(b.pos).mul(0.5),
              time: 1.5,
              force: Math.abs(v1nP - v2nP) * Math.min(a.mass, b.mass),
            });

            // Action-reaction arrows
            const contactPt = a.pos.add(b.pos).mul(0.5);
            this.arrows.push({
              from: contactPt,
              to: contactPt.add(normal.mul(40)),
              color: '#ff2d95',
              label: 'Action',
              life: 1.5,
              maxLife: 1.5,
            });
            this.arrows.push({
              from: contactPt,
              to: contactPt.sub(normal.mul(40)),
              color: '#ffcc00',
              label: 'Reaction',
              life: 1.5,
              maxLife: 1.5,
            });
          }
        }
      }

      // Decay arrows
      this.arrows = this.arrows.filter(a => {
        a.life -= dt;
        return a.life > 0;
      });

      // Decay collision events
      this.collisionEvents = this.collisionEvents.filter(e => {
        e.time -= dt;
        return e.time > 0;
      });

      // Graph data
      if (this.balls.length >= 2) {
        const p1 = this.balls[0].mass * this.balls[0].vel.x;
        const p2 = this.balls[1].mass * this.balls[1].vel.x;
        const ke = 0.5 * this.balls[0].mass * this.balls[0].vel.magnitudeSq()
                 + 0.5 * this.balls[1].mass * this.balls[1].vel.magnitudeSq();
        this.graphData.time.push(this.state.time);
        this.graphData.p1.push(p1);
        this.graphData.p2.push(p2);
        this.graphData.ke.push(ke);

        if (this.graphData.time.length > this.maxHistory) {
          this.graphData.time.shift();
          this.graphData.p1.shift();
          this.graphData.p2.shift();
          this.graphData.ke.shift();
        }
      }
    }

    draw() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Background
      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Arena floor
      const floorY = h - 10;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, floorY, w, 10);
      ctx.fillStyle = '#2a2a4a';
      ctx.fillRect(0, floorY, w, 2);

      // Action-reaction arrows
      this.arrows.forEach(a => {
        const alpha = a.life / a.maxLife;
        this._drawArrow(ctx, a.from, a.to, a.color, 8, alpha > 0.5 ? a.label : '');
      });

      // Collision flash
      this.collisionEvents.forEach(e => {
        const alpha = e.time / 1.5;
        const size = 20 * (1 - alpha) + e.force * 2;
        const pt = ctx.createRadialGradient(e.pos.x, e.pos.y, 0, e.pos.x, e.pos.y, size);
        pt.addColorStop(0, `rgba(255, 255, 200, ${alpha * 0.8})`);
        pt.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = pt;
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw balls
      this.balls.forEach(b => {
        b.draw(ctx);

        // Velocity arrow
        if (b.vel.magnitude() > 0.3) {
          const arrowEnd = b.pos.add(b.vel.mul(6));
          const speed = b.vel.magnitude();
          this._drawArrow(ctx, b.pos, arrowEnd, '#00ff88', 5, `${speed.toFixed(1)} m/s`);
        }

        // Momentum label
        const p = b.mass * b.vel.x;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`p=${p.toFixed(2)} kg\u00b7m/s`, b.pos.x, b.pos.y + b.radius + 18);
      });

      // Momentum display
      if (this.balls.length >= 2) {
        const a = this.balls[0];
        const b = this.balls[1];
        const p1 = a.mass * a.vel.x;
        const p2 = b.mass * b.vel.x;
        const pTotal = p1 + p2;
        const ke1 = 0.5 * a.mass * a.vel.magnitudeSq();
        const ke2 = 0.5 * b.mass * b.vel.magnitudeSq();
        const keTotal = ke1 + ke2;

        ctx.fillStyle = '#0d1b2a';
        ctx.beginPath();
        ctx.roundRect(10, 10, 280, 90, 8);
        ctx.fill();

        ctx.fillStyle = '#ff2d95';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('MOMENTUM & ENERGY', 20, 30);

        ctx.fillStyle = '#a8d8ea';
        ctx.font = '11px monospace';
        ctx.fillText(`p\u2081 = ${p1.toFixed(3)}   p\u2082 = ${p2.toFixed(3)}`, 20, 50);
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText(`p_total = ${pTotal.toFixed(3)} kg\u00b7m/s`, 20, 68);
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`KE_total = ${keTotal.toFixed(2)} J`, 20, 86);

        // Conservation indicator
        const pVar = Math.abs(pTotal - (this.graphData.p1[0] || pTotal));
        ctx.fillStyle = pVar < 0.01 ? '#2ecc71' : '#e74c3c';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(pVar < 0.01 ? 'MOMENTUM CONSERVED' : 'MOMENTUM NOT CONSERVED', 285, 30);
      }

      // Scenario hint
      if (!this.state.running && this.balls.length > 0) {
        ctx.fillStyle = 'rgba(255, 45, 149, 0.8)';
        ctx.font = 'bold 13px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press LAUNCH to start the simulation', w / 2, h / 2 - 20);
      }
    }

    _drawArrow(ctx, from, to, color, headSize = 8, label = '') {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const angle = Math.atan2(dy, dx);
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag < 2) return;

      const endX = from.x + Math.cos(angle) * (mag - headSize);
      const endY = from.y + Math.sin(angle) * (mag - headSize);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - headSize * Math.cos(angle - Math.PI / 6), to.y - headSize * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(to.x - headSize * Math.cos(angle + Math.PI / 6), to.y - headSize * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, from.x + dx * 0.5, from.y + dy * 0.5 - 10);
      }
    }

    getGraphData() { return this.graphData; }
    getState() {
      if (this.balls.length >= 2) {
        const a = this.balls[0];
        const b = this.balls[1];
        return {
          p1: a.mass * a.vel.x,
          p2: b.mass * b.vel.x,
          ke: 0.5 * a.mass * a.vel.magnitudeSq() + 0.5 * b.mass * b.vel.magnitudeSq(),
          collisionType: this.state.collisionType,
          running: this.state.running,
        };
      }
      return { p1: 0, p2: 0, ke: 0, collisionType: this.state.collisionType, running: this.state.running };
    }
  }

  // ================================================================
  // GRAPH CLASS (shared, canvas-based)
  // ================================================================

  class RealtimeGraph {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.series = []; // { label, color, data, key }
      this.maxPoints = 200;
      this.padding = { top: 10, right: 10, bottom: 25, left: 45 };
    }

    addSeries(label, color, key) {
      this.series.push({ label, color, key, data: [] });
    }

    push(key, value) {
      const s = this.series.find(s => s.key === key);
      if (s) {
        s.data.push(value);
        if (s.data.length > this.maxPoints) s.data.shift();
      }
    }

    clear() {
      this.series.forEach(s => s.data = []);
    }

    draw() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, w, h);

      const pl = this.padding.left;
      const pr = this.padding.right;
      const pt = this.padding.top;
      const pb = this.padding.bottom;
      const graphW = w - pl - pr;
      const graphH = h - pt - pb;

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pt + (graphH / 4) * i;
        ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(w - pr, y); ctx.stroke();
      }
      for (let i = 0; i <= 6; i++) {
        const x = pl + (graphW / 6) * i;
        ctx.beginPath(); ctx.moveTo(x, pt); ctx.lineTo(x, h - pb); ctx.stroke();
      }

      // Draw each series
      this.series.forEach(s => {
        if (s.data.length < 2) return;

        // Auto-scale
        const minVal = Math.min(...s.data);
        const maxVal = Math.max(...s.data);
        const range = maxVal - minVal || 1;
        const scale = graphH / range;
        const offset = minVal;

        // Draw line
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        s.data.forEach((v, i) => {
          const x = pl + (i / (this.maxPoints - 1)) * graphW;
          const y = pt + graphH - (v - offset) * scale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Current value dot
        const lastX = pl + graphW;
        const lastY = pt + graphH - (s.data[s.data.length - 1] - offset) * scale;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      });

      // Axis labels
      ctx.fillStyle = '#3a4a5a';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      if (this.series.length > 0 && this.series[0].data.length > 0) {
        const firstSeries = this.series[0];
        const minVal = Math.min(...firstSeries.data);
        const maxVal = Math.max(...firstSeries.data);
        ctx.fillText(maxVal.toFixed(1), pl - 5, pt + 5);
        ctx.fillText(minVal.toFixed(1), pl - 5, pt + graphH - 5);
        ctx.fillText(((maxVal + minVal) / 2).toFixed(1), pl - 5, pt + graphH / 2);
      }

      // Legend
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      this.series.forEach((s, i) => {
        const lx = pl + 5;
        const ly = pt + 5 + i * 16;
        ctx.fillStyle = s.color;
        ctx.fillRect(lx, ly, 12, 2);
        ctx.font = '10px monospace';
        ctx.fillText(s.label, lx + 16, ly - 3);
      });

      // Axis border
      ctx.strokeStyle = '#2a3a4a';
      ctx.lineWidth = 1;
      ctx.strokeRect(pl, pt, graphW, graphH);
    }
  }

  // ================================================================
  // EXPORT
  // ================================================================

  window.NewtonPhysics = {
    Vector2,
    Particle,
    Law1Simulation,
    Law2Simulation,
    Law3Simulation,
    RealtimeGraph,
  };

})();
