/**
 * Janus Labyrinth — shared physics engine
 * Map data is loaded from JSON files (levels/levelN.json).
 * Physics engine initializes once; _loadMap() only swaps bodies.
 *
 * Expects window.__LEVEL_DATA and window.__LEVEL_NUMBER set by index.html.
 * Falls back to LV1 if not set (standalone / direct access).
 */

const X = 640, Y = 350;

// ================================================================
// Fallback Level 1 data (used when __LEVEL_DATA not set)
// ================================================================
const LV1 = {
    fixedBaffles: [[698,153,697,280],[453,155,562,156],[838,155,712,156],[436,156,439,549],[578,162,578,370],[838,170,838,557],[694,372,590,373],[577,462,698,463],[696,469,697,547],[825,558,436,558]],
    movingTrajs: [[506,233,463],[765,231,467]], mHalfW: 50, thick: 4, epR: 6,
    tracks: [[0,640,580,778],[1280,640,700,778]],
    pX: 640, pY: 780, pW: 280, pH: 16,
    bX: 0, bY: 160, bR: 28.125, bM: 5.0,
    platFric: 1.5, rotSpd: 0.65, maxRot: 2 * Math.PI,
};

// ================================================================
// Runtime level state
// ================================================================
var currentLevel = window.__LEVEL_NUMBER || 1;
var currentLv = window.__LEVEL_DATA || LV1;

// ================================================================
// postMessage communication with parent (Next.js page)
// ================================================================
function sendToParent(type, data) {
    try { window.parent.postMessage({ type: type, data: data || {} }, '*'); } catch (e) { /* ignore */ }
}

// ================================================================
// LOAD_LEVEL handler: runtime level switching without full reload
// ================================================================
window.addEventListener('message', function (event) {
    var msg = event.data;
    if (!msg || !msg.type) return;
    if (msg.type === 'LOAD_LEVEL' && typeof msg.level === 'number') {
        var newLevel = Math.min(Math.max(msg.level, 1), 5);
        if (newLevel === currentLevel) return;
        currentLevel = newLevel;
        // Fetch level JSON, then apply to running game
        fetch('levels/level' + newLevel + '.json')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                currentLv = data;
                var gs = window._gameInstance.scene.getScene('Game');
                if (gs && gs.scene.isActive()) {
                    gs._loadMap(data, newLevel);
                    sendToParent('GAME_READY', { level: newLevel });
                    gs._startCountdown();
                }
            })
            .catch(function () {
                console.error('Failed to load level ' + newLevel);
            });
    }
});

// ================================================================
// Rotation state machine
// ================================================================
function Rot() {
    this.a = 0; this.v = 0; this.mv = 0.65; this.ma = 2 * Math.PI;
    this.at = 0.167; this.st = "idle"; this.tm = 0; this.nx = "accel_ccw";
}
Rot.prototype.reset = function () { this.a = 0; this.v = 0; this.st = "idle"; this.tm = 0; };
Rot.prototype.press = function () {
    var p = this.st;
    if (this.st === "idle" && this.a > -this.ma + 0.001) this.st = "accel_cw";
    else if (this.st === "accel_ccw" || this.st === "const_ccw") { this.st = "decel"; this.nx = "accel_cw"; }
    else if (this.st === "decel" && this.nx !== "accel_cw") this.nx = "accel_cw";
    if (this.st !== p) this.tm = 0;
};
Rot.prototype.release = function () {
    var p = this.st;
    if ((this.st === "accel_cw" || this.st === "const_cw") && this.a < -0.001) { this.st = "decel"; this.nx = "accel_ccw"; }
    else if (this.st === "idle" && this.a < -0.001) this.st = "accel_ccw";
    else if (this.st === "decel" && this.nx !== "accel_ccw") this.nx = "accel_ccw";
    if (this.st !== p) this.tm = 0;
};
Rot.prototype.update = function (dt) {
    if (this.st === "idle") return;
    this.tm += dt;
    if (this.st === "accel_ccw") { var t = Math.min(this.tm / this.at, 1); this.v = this.mv * t; this._up(dt); if (t >= 1 && this.st === "accel_ccw") { this.st = "const_ccw"; this.v = this.mv; } }
    else if (this.st === "const_ccw") this._up(dt);
    else if (this.st === "decel") { var sv = Math.abs(this.v), t = Math.min(this.tm / this.at, 1), d = this.v > 0 ? 1 : -1; this.v = d * sv * (1 - t); this._up(dt); if (t >= 1) { this.v = 0; if (this.a < -0.001 || this.a > 0.001) { this.st = this.nx; this.tm = 0; } else this.st = "idle"; } }
    else if (this.st === "accel_cw") { var t = Math.min(this.tm / this.at, 1); this.v = -this.mv * t; this._up(dt); if (t >= 1 && this.st === "accel_cw") { this.st = "const_cw"; this.v = -this.mv; } }
    else if (this.st === "const_cw") this._up(dt);
};
Rot.prototype._up = function (dt) {
    this.a += this.v * dt;
    if (this.a <= -this.ma && this.v < 0) { this.a = -this.ma; this.v = 0; this.st = "idle"; }
    if (this.a >= 0 && this.v > 0 && (this.st === "accel_ccw" || this.st === "const_ccw")) { this.a = 0; this.v = 0; this.st = "idle"; }
};

// ================================================================
// Phaser Scenes
// ================================================================
function Boot() { Phaser.Scene.call(this, { key: 'Boot' }); }
Boot.prototype = Object.create(Phaser.Scene.prototype);
Boot.prototype.constructor = Boot;
Boot.prototype.preload = function () {
    var w = this.cameras.main.width, h = this.cameras.main.height;
    var bar = this.add.graphics(), box = this.add.graphics();
    box.fillStyle(0x222233, 0.8); box.fillRoundedRect(w / 2 - 160, h / 2 - 25, 320, 50, 10);
    this.load.on('progress', function (v) { bar.clear(); bar.fillStyle(0xffd700, 1); bar.fillRoundedRect(w / 2 - 150, h / 2 - 15, 300 * v, 30, 6); });
    this.load.on('complete', function () { bar.destroy(); box.destroy(); });
    this.load.image('bg', 'janusmaze.jpg');
};
Boot.prototype.create = function () { this.scene.start('Game'); };

// ================================================================
// Main Game Scene
// ================================================================
function GameScene() { Phaser.Scene.call(this, { key: 'Game' }); }
GameScene.prototype = Object.create(Phaser.Scene.prototype);
GameScene.prototype.constructor = GameScene;

// ---- create(): physics engine init ONCE, then load initial map ----
GameScene.prototype.create = function () {
    this._M = Phaser.Physics.Matter.Matter;

    // Physics engine config (one-time)
    var eng = this.matter.world.engine;
    eng.positionIterations = 60; eng.velocityIterations = 60;
    this.matter.world.engine.gravity.y = 15;
    this.matter.world.engine.gravity.x = 0;
    this.matter.world.autoUpdate = false;
    this.matter.world.on('collisionstart', function (ev) {
        for (var i = 0; i < ev.pairs.length; i++) {
            var a = ev.pairs[i].bodyA.label, b = ev.pairs[i].bodyB.label;
            if ((a === 'ball' && b === 'plat') || (b === 'ball' && a === 'plat')) this.onP = true;
        }
    }, this);
    this.matter.world.on('collisionend', function (ev) {
        for (var i = 0; i < ev.pairs.length; i++) {
            var a = ev.pairs[i].bodyA.label, b = ev.pairs[i].bodyB.label;
            if ((a === 'ball' && b === 'plat') || (b === 'ball' && a === 'plat')) this.onP = false;
        }
    }, this);

    // Background (one-time)
    this.add.image(640, 400, 'bg').setDisplaySize(1280, 800);

    // Graphics layers (one-time)
    this.bgfx = this.add.graphics();
    this.ggfx = this.add.graphics();

    // Input (one-time)
    this.sk = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.rk = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.input.on('pointerdown', function (p) { if (p.y > 60) { this.sp = true; this.rs.press(); } }, this);
    this.input.on('pointerup', function () { this.sp = false; this.rs.release(); }, this);

    // Runtime state init
    this.t = 0; this.paused = false; this.won = false; this.stab = 0; this.sp = false;
    this.pa = 0; this.ca = 0; this.onP = false;
    this.gameStarted = false; this.startTime = 0;
    this.countdownActive = false;
    this.rs = new Rot();
    this.ball = null; this.plat = null; this.fixed = []; this.moving = []; this.tracks = [];
    this.winText = null; this.winTimeText = null; this.timerText = null;
    this.countdownText = null; this.countdownBg = null;

    // Load initial map
    this._loadMap(currentLv, currentLevel);

    sendToParent('GAME_READY', { level: currentLevel });
    var self = this;
    this.time.delayedCall(300, function () { self._startCountdown(); });
};

// ---- _loadMap(levelData, levelNumber): swap map without restarting scene ----
GameScene.prototype._loadMap = function (ld, lv) {
    // Clear old Matter bodies
    this._clearBodies();

    // Reset runtime state
    this.t = 0; this.paused = false; this.won = false; this.stab = 0; this.onP = false;
    this.pa = 0; this.ca = 0;
    this.gameStarted = false; this.startTime = 0;
    this.rs.reset();
    this.rs.mv = ld.rotSpd || 0.65;
    this.rs.ma = ld.maxRot || 2 * Math.PI;
    this.sp = false;

    // Update global refs
    currentLv = ld;
    currentLevel = lv;

    // Clean up UI texts
    if (this.winText) { this.winText.destroy(); this.winText = null; }
    if (this.winTimeText) { this.winTimeText.destroy(); this.winTimeText = null; }
    if (this.timerText) { this.timerText.destroy(); this.timerText = null; }
    if (this.countdownText) { this.countdownText.destroy(); this.countdownText = null; }
    if (this.countdownBg) { this.countdownBg.destroy(); this.countdownBg = null; }

    // Timer display
    this.timerText = this.add.text(640, 30, '00:00.0', {
        fontFamily: '"Noto Serif SC","Source Han Serif SC","思源宋体",serif',
        fontSize: '28px', color: '#ffd700', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50);

    // Create bodies for the new map
    this._createBodies(ld);
};

// ---- _clearBodies(): remove all dynamic bodies from Matter world ----
GameScene.prototype._clearBodies = function () {
    var M = this._M, w = this.matter.world.engine.world;
    var R = function (b) { if (b) M.Composite.remove(w, b); };
    R(this.ball); this.ball = null;
    R(this.plat); this.plat = null;
    for (var i = 0; i < this.fixed.length; i++) R(this.fixed[i].body);
    for (var i = 0; i < this.moving.length; i++) R(this.moving[i].body);
    for (var i = 0; i < this.tracks.length; i++) R(this.tracks[i]);
    this.fixed = []; this.moving = []; this.tracks = [];
};

// ---- _createBodies(ld): instantiate all physics bodies from level data ----
GameScene.prototype._createBodies = function (ld) {
    var M = this._M, w = this.matter.world.engine.world;

    // Platform
    this.plat = M.Bodies.rectangle(ld.pX, ld.pY, ld.pW, ld.pH,
        { isStatic: true, label: 'plat', friction: ld.platFric || 1.5, restitution: 0.02 });
    M.Composite.add(w, this.plat);

    // Ball
    this.ball = M.Bodies.circle(X + ld.bX, Y + ld.bY, ld.bR, {
        label: 'ball', restitution: 0.02, friction: 0.8,
        density: ld.bM / (Math.PI * ld.bR * ld.bR)
    });
    M.Composite.add(w, this.ball);

    // Fixed baffles
    this.fixed = [];
    for (var i = 0; i < ld.fixedBaffles.length; i++) {
        var fb = ld.fixedBaffles[i];
        var wx1 = fb[0], wy1 = fb[1], wx2 = fb[2], wy2 = fb[3];
        var lx1 = wx1 - X, ly1 = wy1 - Y, lx2 = wx2 - X, ly2 = wy2 - Y;
        var mx = (lx1 + lx2) / 2, my = (ly1 + ly2) / 2;
        var dx = lx2 - lx1, dy = ly2 - ly1, len = Math.sqrt(dx * dx + dy * dy), la = Math.atan2(dy, dx);
        var body = M.Bodies.rectangle(X + mx, Y + my, len, ld.thick || 4,
            { isStatic: true, angle: la, label: 'baffle', friction: 0.6, restitution: 0.3 });
        M.Composite.add(w, body);
        this.fixed.push({ body: body, lx1: lx1, ly1: ly1, lx2: lx2, ly2: ly2, mx: mx, my: my, la: la, len: len });
    }

    // Moving baffles
    this.moving = [];
    for (var i = 0; i < ld.movingTrajs.length; i++) {
        var mt = ld.movingTrajs[i];
        var tx = mt[0], ty1 = mt[1], ty2 = mt[2];
        var lx = tx - X, cy = (ty1 + ty2) / 2, hw = ld.mHalfW || 50;
        var body = M.Bodies.rectangle(X + lx, cy, hw * 2, ld.thick || 4,
            { isStatic: true, angle: 0, label: 'baffle', friction: 0.3, restitution: 0.3 });
        M.Composite.add(w, body);
        this.moving.push({ body: body, lx: lx, wy1: ty1, wy2: ty2, cy: cy, dir: 1, hw: hw });
    }

    // Tracks
    this.tracks = [];
    for (var i = 0; i < ld.tracks.length; i++) {
        var tr = ld.tracks[i];
        var tx1 = tr[0], ty1_ = tr[1], tx2 = tr[2], ty2_ = tr[3];
        var mx = (tx1 + tx2) / 2, my = (ty1_ + ty2_) / 2;
        var dx = tx2 - tx1, dy = ty2_ - ty1_;
        var body = M.Bodies.rectangle(mx, my, Math.sqrt(dx * dx + dy * dy), 10,
            { isStatic: true, angle: Math.atan2(dy, dx), label: 'plat', friction: 0.5, restitution: 0.3 });
        M.Composite.add(w, body);
        this.tracks.push(body);
    }
};

// ---- _startCountdown(): 3-2-1-GO with native setTimeout ----
GameScene.prototype._startCountdown = function () {
    this.countdownActive = true;
    this.paused = true;
    var self = this;
    var count = 3;

    this.countdownBg = this.add.rectangle(640, 400, 1280, 800, 0x000000, 0.65).setDepth(199);
    this.countdownText = this.add.text(640, 400, String(count), {
        fontFamily: '"Noto Serif SC","思源宋体",serif', fontSize: '120px',
        color: '#ffd700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(200);

    function tick() {
        count--;
        if (count > 0) {
            self.countdownText.setText(String(count));
            setTimeout(tick, 1000);
        } else if (count === 0) {
            self.countdownText.setText('GO!');
            self.countdownText.setColor('#00ff00');
            setTimeout(tick, 700);
        } else {
            if (self.countdownBg) { self.countdownBg.destroy(); self.countdownBg = null; }
            if (self.countdownText) { self.countdownText.destroy(); self.countdownText = null; }
            self.paused = false;
            self.gameStarted = true;
            self.startTime = Date.now();
            self.countdownActive = false;
            sendToParent('GAME_STARTED', { level: currentLevel });
        }
    }
    setTimeout(tick, 1000);
};

// ---- update(): main loop ----
GameScene.prototype.update = function (time, delta) {
    var dt = delta / 1000;
    if (!this.paused) { this._inp(); this.rs.update(dt); }
    if (!this.paused && !this.won) this.t += dt;

    // Timer display
    if (this.gameStarted && !this.won && !this.paused && this.timerText) {
        var elapsed = Date.now() - this.startTime;
        var totalSec = Math.floor(elapsed / 1000);
        var min = Math.floor(totalSec / 60);
        var sec = totalSec % 60;
        var tenth = Math.floor((elapsed % 1000) / 100);
        this.timerText.setText(
            (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec + '.' + tenth
        );
    }

    var ca = this.rs.a, pa = this.pa; this.pa = ca; this.ca = ca;
    // Moving baffles (only when not paused)
    if (!this.paused) {
        for (var i = 0; i < this.moving.length; i++) {
            var d = this.moving[i];
            var ny = d.cy + 90 * dt * d.dir;
            if (ny > d.wy2) { ny = d.wy2; d.dir = -1; }
            else if (ny < d.wy1) { ny = d.wy1; d.dir = 1; }
            d.cy = ny;
        }
    }
    var sdt = delta / 48, da = ca - pa, pz = !this.won && !this.paused;
    if (pz) this._collide(pa);
    for (var i = 0; i < 48; i++) {
        var a = pa + da * (i + 1) / 48;
        this._pose(a);
        this.matter.world.step(sdt);
    }
    if (pz) this._collide(ca);
    if (this.ball) {
        var v = this.ball.velocity;
        var vx = v.x, vy = v.y;
        var spd = Math.sqrt(vx * vx + vy * vy);
        if (spd > 8) {
            var scale = 8 / spd;
            this._M.Body.setVelocity(this.ball, { x: vx * scale, y: vy * scale });
        }
    }
    if (!this.won && !this.paused) this._vic(dt);
    this._drwBaf(); this._drwBal();
};

// ---- _inp(): keyboard + pointer input, R to restart ----
GameScene.prototype._inp = function () {
    var k = this.sk.isDown;
    if (k && !this.sp) { this.sp = true; this.rs.press(); }
    else if (!k && this.sp) { this.sp = false; this.rs.release(); }
    if (Phaser.Input.Keyboard.JustDown(this.rk)) {
        // Restart same level: reload map + countdown (no fetch needed)
        var self = this;
        this._loadMap(currentLv, currentLevel);
        sendToParent('GAME_RESET', { level: currentLevel });
        this.time.delayedCall(200, function () { self._startCountdown(); });
    }
};

// ---- _pose(a): set body positions for given rotation angle ----
GameScene.prototype._pose = function (a) {
    var B = this._M.Body, ca = Math.cos(a), sa = Math.sin(a);
    for (var i = 0; i < this.fixed.length; i++) {
        var d = this.fixed[i];
        var wx = X + d.mx * ca - d.my * sa, wy = Y + d.mx * sa + d.my * ca;
        B.setPosition(d.body, { x: wx, y: wy });
        B.setAngle(d.body, d.la + a);
    }
    for (var i = 0; i < this.moving.length; i++) {
        var d = this.moving[i];
        var ly = d.cy - Y;
        B.setPosition(d.body, { x: X + d.lx * ca - ly * sa, y: Y + d.lx * sa + ly * ca });
        B.setAngle(d.body, a);
    }
};

// ---- _collide(a): ball-vs-baffle penetration recovery ----
GameScene.prototype._collide = function (a) {
    if (!this.ball) return;
    var B = this._M.Body, br = currentLv.bR, er = currentLv.epR || 6;
    var bt = currentLv.thick || 4, minDist = br + er, pushMargin = Math.max(bt, 4);
    var velEps = 2, ca = Math.cos(a), sa = Math.sin(a), sg = this._segs(ca, sa);
    var bpx = this.ball.position.x, bpy = this.ball.position.y;
    for (var it = 0; it < 10; it++) {
        var resolved = false;
        for (var si = 0; si < sg.length; si++) {
            var s = sg[si];
            var dx = s.x2 - s.x1, dy = s.y2 - s.y1, ls = dx * dx + dy * dy, cl;
            if (ls < 0.01) cl = { x: s.x1, y: s.y1 };
            else {
                var t = Math.max(0, Math.min(1, ((bpx - s.x1) * dx + (bpy - s.y1) * dy) / ls));
                cl = { x: s.x1 + t * dx, y: s.y1 + t * dy };
            }
            var dvx = bpx - cl.x, dvy = bpy - cl.y, dist = Math.sqrt(dvx * dvx + dvy * dvy);
            if (dist < br && dist > 0.001) {
                var nx = dvx / dist, ny = dvy / dist, pen = br - dist + pushMargin;
                bpx += nx * pen; bpy += ny * pen;
                B.setPosition(this.ball, { x: bpx, y: bpy });
                var bv = this.ball.velocity;
                if (bv) {
                    var vi = bv.x * nx + bv.y * ny;
                    if (vi < -velEps) {
                        // Deep penetration: fully cancel inward velocity
                        B.setVelocity(this.ball, { x: bv.x - nx * vi, y: bv.y - ny * vi });
                    } else if (vi < 0) {
                        // Light contact: dampen only 60% for corner sliding
                        B.setVelocity(this.ball, { x: bv.x - nx * vi * 0.6, y: bv.y - ny * vi * 0.6 });
                    }
                }
                resolved = true;
            }
            for (var ei = 0; ei < 2; ei++) {
                var pt = ei === 0 ? { x: s.x1, y: s.y1 } : { x: s.x2, y: s.y2 };
                var ex = bpx - pt.x, ey = bpy - pt.y, d = Math.sqrt(ex * ex + ey * ey);
                if (d < minDist && d > 0.001) {
                    var nx = ex / d, ny = ey / d, pen = minDist - d + pushMargin;
                    bpx += nx * pen; bpy += ny * pen;
                    B.setPosition(this.ball, { x: bpx, y: bpy });
                    var bv = this.ball.velocity;
                    if (bv) {
                        var vi = bv.x * nx + bv.y * ny;
                        if (vi < -velEps) {
                            B.setVelocity(this.ball, { x: bv.x - nx * vi, y: bv.y - ny * vi });
                        } else if (vi < 0) {
                            B.setVelocity(this.ball, { x: bv.x - nx * vi * 0.6, y: bv.y - ny * vi * 0.6 });
                        }
                    }
                    resolved = true;
                }
            }
        }
        if (!resolved) break;
    }
};

// ---- _segs(ca, sa): get rotated segment endpoints for collision ----
GameScene.prototype._segs = function (ca, sa) {
    var s = [];
    for (var i = 0; i < this.fixed.length; i++) {
        var d = this.fixed[i];
        s.push({ x1: X + d.lx1 * ca - d.ly1 * sa, y1: Y + d.lx1 * sa + d.ly1 * ca,
            x2: X + d.lx2 * ca - d.ly2 * sa, y2: Y + d.lx2 * sa + d.ly2 * ca, tp: 'f' });
    }
    for (var i = 0; i < this.moving.length; i++) {
        var d = this.moving[i];
        var ly = d.cy - Y, lx = d.lx, hw = d.hw;
        s.push({ x1: X + (lx - hw) * ca - ly * sa, y1: Y + (lx - hw) * sa + ly * ca,
            x2: X + (lx + hw) * ca - ly * sa, y2: Y + (lx + hw) * sa + ly * ca, tp: 'm', dir: d.dir });
    }
    return s;
};

// ---- _vic(dt): victory check (ball resting on platform) ----
GameScene.prototype._vic = function (dt) {
    if (!this.ball) return;
    var bp = this.ball.position, bv = this.ball.velocity;
    var sp = Math.sqrt(bv.x * bv.x + bv.y * bv.y);
    var hw = currentLv.pW / 2, hh = currentLv.pH / 2, br = currentLv.bR;
    var on = this.onP || (Math.abs(bp.x - currentLv.pX) < hw + br && Math.abs(bp.y - currentLv.pY) < hh + br);
    var rest = on && (sp < 8 || bp.y > currentLv.pY + hh);
    if (rest) { this.stab += dt; if (this.stab >= 0.3) this._win(); }
    else if (!on) this.stab = 0;
};

// ---- _win(): trigger victory ----
GameScene.prototype._win = function () {
    if (this.won) return;
    this.won = true;
    this.gameStarted = false;
    var elapsed = Date.now() - this.startTime;
    this.winText = this.add.text(640, 400, 'You Win', {
        fontFamily: '"Noto Serif SC","Source Han Serif SC","思源宋体",serif',
        fontSize: '72px', color: '#ffd700', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    var totalSec = Math.floor(elapsed / 1000);
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    var tenth = Math.floor((elapsed % 1000) / 100);
    var timeStr = (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec + '.' + tenth;
    this.winTimeText = this.add.text(640, 470, '用时 ' + timeStr, {
        fontFamily: '"Noto Serif SC",serif', fontSize: '32px',
        color: '#64b4ff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    sendToParent('GAME_WIN', { level: currentLevel, timeMs: elapsed });
};

// ---- _drwBaf(): draw baffles ----
GameScene.prototype._drwBaf = function () {
    var g = this.bgfx; g.clear();
    var ca = Math.cos(this.ca), sa = Math.sin(this.ca);
    var segs = this._segs(ca, sa);
    for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        g.lineStyle(6, 0xc8a000, 1); g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); g.strokePath();
        g.lineStyle(4, 0xffd700, 1); g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); g.strokePath();
        g.lineStyle(1.5, 0xfff08c, 0.7); g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); g.strokePath();
        for (var ei = 0; ei < 2; ei++) {
            var e = ei === 0 ? { x: s.x1, y: s.y1 } : { x: s.x2, y: s.y2 };
            g.fillStyle(0xffd700, 1); g.fillCircle(e.x, e.y, 5);
            g.fillStyle(0xfff08c, 1); g.fillCircle(e.x, e.y, 3);
        }
    }
};

// ---- _drwBal(): draw ball ----
GameScene.prototype._drwBal = function () {
    var g = this.ggfx; g.clear();
    if (!this.ball) return;
    var x = this.ball.position.x, y = this.ball.position.y, r = currentLv.bR;
    g.fillStyle(0x64b4ff, 1); g.fillCircle(x, y, r);
    g.lineStyle(2, 0x96d2ff, 1); g.strokeCircle(x, y, r);
    g.fillStyle(0xc8e1ff, 0.6); g.fillCircle(x - r * .3, y - r * .3, r * .3);
};

// ================================================================
// Launch Phaser
// ================================================================
window._gameInstance = new Phaser.Game({
    type: Phaser.AUTO, width: 1280, height: 800,
    backgroundColor: '#0a0f19', parent: 'game-container',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'matter', matter: { gravity: { x: 0, y: 15 }, debug: false } },
    scene: [Boot, GameScene],
});
