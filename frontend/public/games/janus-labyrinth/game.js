/**
 * Janus Labyrinth — ported from Python pymunk version
 * - Matter.js handles all real collision physics (restitution, friction) during world.step()
 * - _collide = exact port of Python _collision_safety (maze_system.py:236-290)
 *   Position push with margin + cancel inward velocity. Pure penetration recovery.
 *
 * v2 — Multi-level support, postMessage communication, countdown, timer
 */
const X = 640, Y = 350;

// ================================================================
// Level 1 base data (existing layout)
// ================================================================
const LV1 = {
    fixedBaffles: [[698, 153, 697, 280], [453, 155, 562, 156], [838, 155, 712, 156], [436, 156, 439, 549], [578, 162, 578, 370], [838, 170, 838, 557], [694, 372, 590, 373], [577, 462, 698, 463], [696, 469, 697, 547], [825, 558, 436, 558]],
    movingTrajs: [[506, 233, 463], [765, 231, 467]], mHalfW: 50, thick: 4, epR: 6,
    tracks: [[0, 640, 580, 778], [1280, 640, 700, 778]],
    pX: 640, pY: 780, pW: 280, pH: 16,
    bX: 0, bY: 160, bR: 28.125, bM: 5.0,
    ballRest: 0.15, baffleRest: 0.3, ballFric: 0.15, baffleFric: 0.3, platFric: 1.5,
    grav: 35.7, rotSpd: 0.65, maxRot: 2 * Math.PI,
};

// ================================================================
// All 8 levels — extracted from hand-drawn map images
// ================================================================
const ALL_LEVELS = [
    // ----- Level 1: 初始之旋 (original) -----
    { id: 1, name: '初始之旋', nameEn: 'First Rotation', difficulty: '简单', unlocked: true,
        fixedBaffles: LV1.fixedBaffles, movingTrajs: LV1.movingTrajs, mHalfW: LV1.mHalfW,
        thick: LV1.thick, epR: LV1.epR, tracks: LV1.tracks,
        pX: LV1.pX, pY: LV1.pY, pW: LV1.pW, pH: LV1.pH,
        bX: LV1.bX, bY: LV1.bY, bR: LV1.bR, bM: LV1.bM,
        ballRest: LV1.ballRest, baffleRest: LV1.baffleRest, ballFric: LV1.ballFric,
        baffleFric: LV1.baffleFric, platFric: LV1.platFric,
        grav: LV1.grav, rotSpd: LV1.rotSpd, maxRot: LV1.maxRot,
    },

    // ----- Level 2: 双生之径 (mirror-symmetric twin paths, no moving parts) -----
    { id: 2, name: '双生之径', nameEn: 'Twin Paths', difficulty: '简单', unlocked: true,
        fixedBaffles: [
            [673,153,673,221], [441,155,600,155], [678,155,837,156],
            [437,156,436,560], [601,163,601,224], [837,162,836,559],
            [675,226,711,268], [596,228,562,267],
            [775,328,832,328], [443,328,497,328],
            [779,333,832,389], [492,336,442,386],
            [636,339,636,455],
            [511,482,585,482], [688,482,762,482],
        ],
        movingTrajs: [], mHalfW: 50, thick: 4, epR: 6,
        tracks: [[0,640,580,778],[1280,640,700,778]],
        pX: 640, pY: 780, pW: 280, pH: 16,
        bX: -3, bY: 169, bR: 28.125, bM: 5.0,
        ballRest: 0.15, baffleRest: 0.3, ballFric: 0.15, baffleFric: 0.3, platFric: 1.5,
        grav: 35.7, rotSpd: 0.65, maxRot: 2*Math.PI,
    },

    // ----- Level 3: 三重门 (three gates/horizontal barriers) -----
    { id: 3, name: '三重门', nameEn: 'Triple Gate', difficulty: '中等', unlocked: true,
        fixedBaffles: [
            [440,155,838,156], [437,156,436,560], [837,162,836,559],
            [440,330,835,330], [440,400,835,400], [440,470,835,470],
            [560,330,560,400], [720,330,720,400],
            [500,400,500,470], [640,400,640,470], [780,400,780,470],
            [561,561,727,561],
        ],
        movingTrajs: [[500,338,460],[780,338,460]],
        mHalfW: 45, thick: 4, epR: 6,
        tracks: [[0,640,580,778],[1280,640,700,778]],
        pX: 640, pY: 780, pW: 280, pH: 16,
        bX: 0, bY: 160, bR: 28.125, bM: 5.0,
        ballRest: 0.15, baffleRest: 0.3, ballFric: 0.15, baffleFric: 0.3, platFric: 1.5,
        grav: 35.7, rotSpd: 0.65, maxRot: 2*Math.PI,
    },

    // ----- Level 4: 深渊之眼 (central eye structure) -----
    { id: 4, name: '深渊之眼', nameEn: 'Abyss Eye', difficulty: '中等', unlocked: true,
        fixedBaffles: [
            [440,155,838,156], [437,156,436,560], [837,162,836,559],
            [450,280,830,280], [450,280,450,440], [830,280,830,440],
            [450,440,560,440], [720,440,830,440],
            [530,280,530,350], [750,280,750,350],
            [561,561,727,561],
        ],
        movingTrajs: [[600,290,430]],
        mHalfW: 40, thick: 4, epR: 6,
        tracks: [[0,640,580,778],[1280,640,700,778]],
        pX: 640, pY: 780, pW: 280, pH: 16,
        bX: 0, bY: 160, bR: 28.125, bM: 5.0,
        ballRest: 0.15, baffleRest: 0.3, ballFric: 0.15, baffleFric: 0.3, platFric: 1.5,
        grav: 35.7, rotSpd: 0.65, maxRot: 2*Math.PI,
    },

    // ----- Level 5: 镜中世界 (mirror world, asymmetric) -----
    { id: 5, name: '镜中世界', nameEn: 'Mirror World', difficulty: '困难', unlocked: true,
        fixedBaffles: [
            [440,155,838,156], [437,156,436,560], [837,162,836,559],
            [460,260,820,260], [460,260,460,350],
            [460,350,560,350], [610,350,720,350],
            [720,260,720,350], [820,260,820,350],
            [520,420,640,420], [560,490,720,490],
            [561,561,727,561],
        ],
        movingTrajs: [[640,268,420],[560,428,490]],
        mHalfW: 35, thick: 4, epR: 6,
        tracks: [[0,640,580,778],[1280,640,700,778]],
        pX: 640, pY: 780, pW: 280, pH: 16,
        bX: 0, bY: 160, bR: 28.125, bM: 5.0,
        ballRest: 0.15, baffleRest: 0.3, ballFric: 0.15, baffleFric: 0.3, platFric: 1.5,
        grav: 35.7, rotSpd: 0.65, maxRot: 2*Math.PI,
    },

    // ----- Level 6: 星辰迷阵 (star maze with central translating barrier) -----
    { id: 6, name: '星辰迷阵', nameEn: 'Star Maze', difficulty: '困难', unlocked: true,
        fixedBaffles: [
            [440,155,838,156], [437,156,436,560], [837,162,836,559],
            [450,230,580,320], [700,230,830,320],
            [450,380,580,470], [700,380,830,470],
            [580,280,700,280], [560,320,720,320],
            [580,380,700,380], [560,470,720,470],
            [490,470,490,520], [790,470,790,520],
            [561,561,727,561],
        ],
        movingTrajs: [[580,290,570],[700,290,570]],
        mHalfW: 30, thick: 4, epR: 6,
        tracks: [[0,640,580,778],[1280,640,700,778]],
        pX: 640, pY: 780, pW: 280, pH: 16,
        bX: 0, bY: 155, bR: 28.125, bM: 5.0,
        ballRest: 0.15, baffleRest: 0.3, ballFric: 0.15, baffleFric: 0.3, platFric: 1.5,
        grav: 35.7, rotSpd: 0.65, maxRot: 2*Math.PI,
    },

    // ----- Level 7: 时空裂隙 (time rift, curved rotating barrier) -----
    { id: 7, name: '时空裂隙', nameEn: 'Time Rift', difficulty: '极难', unlocked: true,
        fixedBaffles: [
            [440,155,838,156], [437,156,436,560], [837,162,836,559],
            [470,240,810,240], [470,240,470,400], [810,240,810,400],
            [560,320,720,320], [640,280,640,360],
            [500,440,780,440],
            [561,561,727,561],
        ],
        movingTrajs: [[580,250,430],[700,250,430]],
        mHalfW: 35, thick: 4, epR: 6,
        tracks: [[0,640,580,778],[1280,640,700,778]],
        pX: 640, pY: 780, pW: 280, pH: 16,
        bX: 0, bY: 155, bR: 28.125, bM: 5.0,
        ballRest: 0.15, baffleRest: 0.3, ballFric: 0.15, baffleFric: 0.3, platFric: 1.5,
        grav: 35.7, rotSpd: 0.65, maxRot: 2*Math.PI,
    },

    // ----- Level 8: 终极试炼 (final trial, complex moving structure) -----
    { id: 8, name: '终极试炼', nameEn: 'Final Trial', difficulty: '极难', unlocked: true,
        fixedBaffles: [
            [440,155,838,156], [437,156,436,560], [837,162,836,559],
            [480,260,580,260], [700,260,800,260],
            [480,260,480,440], [800,260,800,440],
            [580,320,700,320], [520,380,760,380],
            [520,440,760,440],
            [561,561,727,561],
        ],
        movingTrajs: [[580,268,440],[700,268,440],[640,388,440]],
        mHalfW: 30, thick: 4, epR: 6,
        tracks: [[0,640,580,778],[1280,640,700,778]],
        pX: 640, pY: 780, pW: 280, pH: 16,
        bX: 0, bY: 150, bR: 28.125, bM: 5.0,
        ballRest: 0.15, baffleRest: 0.3, ballFric: 0.15, baffleFric: 0.3, platFric: 1.5,
        grav: 35.7, rotSpd: 0.65, maxRot: 2*Math.PI,
    },
];

// ================================================================
// Runtime level reference — overwritten when LOAD_LEVEL received
// ================================================================
let currentLevel = 1;
let currentLv = LV1; // default to level 1 data

function getLevelById(id) {
    return ALL_LEVELS.find(function (l) { return l.id === id; });
}

// Read URL param for initial level
(function () {
    try {
        var p = new URLSearchParams(window.location.search);
        var lv = parseInt(p.get('level')) || 1;
        currentLevel = Math.min(Math.max(lv, 1), 8);
        var ld = getLevelById(currentLevel);
        if (ld && ld.unlocked) currentLv = ld;
    } catch (e) { /* ignore */ }
})();

// ================================================================
// postMessage communication with parent (Next.js page)
// ================================================================
function sendToParent(type, data) {
    try { window.parent.postMessage({ type: type, data: data || {} }, '*'); } catch (e) { /* ignore */ }
}

window.addEventListener('message', function (event) {
    var msg = event.data;
    if (!msg || !msg.type) return;
    if (msg.type === 'LOAD_LEVEL' && typeof msg.level === 'number') {
        var newLevel = Math.min(Math.max(msg.level, 1), 8);
        // Skip if already on this level (prevents infinite restart loop)
        if (newLevel === currentLevel) return;
        currentLevel = newLevel;
        var ld = getLevelById(currentLevel);
        if (ld && ld.unlocked) currentLv = ld;
        // Restart scene to apply new level
        if (window._gameInstance) {
            var gameScene = window._gameInstance.scene.getScene('Game');
            if (gameScene && gameScene.scene.isActive()) {
                gameScene.scene.restart();
            } else if (gameScene) {
                gameScene.scene.start('Game');
            }
        }
    }
});

// ================================================================
// Rotation state machine (unchanged from original)
// ================================================================
function Rot() {
    this.a = 0; this.v = 0; this.mv = 0.65; this.ma = 2 * Math.PI;
    this.at = 0.25; this.st = "idle"; this.tm = 0; this.nx = "accel_ccw";
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
function Boot() { }
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
function GameScene() { }
GameScene.prototype = Object.create(Phaser.Scene.prototype);
GameScene.prototype.constructor = GameScene;

GameScene.prototype.create = function () {
    this._M = Phaser.Physics.Matter.Matter;
    this.t = 0; this.paused = false; this.won = false; this.stab = 0; this.sp = false;
    this.pa = 0; this.ca = 0; this.onP = false;
    this.gameStarted = false; this.startTime = 0;
    this.countdownActive = false;

    this.rs = new Rot();
    this.rs.mv = currentLv.rotSpd || 0.65;
    this.rs.ma = currentLv.maxRot || 2 * Math.PI;

    this.ball = null; this.plat = null; this.fixed = []; this.moving = []; this.tracks = [];
    this.winText = null; this.timerText = null;
    this.countdownText = null; this.countdownBg = null;

    this.add.image(640, 400, 'bg').setDisplaySize(1280, 800);
    this.bgfx = this.add.graphics();
    this.ggfx = this.add.graphics();
    this.sk = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.rk = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.input.on('pointerdown', function (p) { if (p.y > 60) { this.sp = true; this.rs.press(); } }, this);
    this.input.on('pointerup', function () { this.sp = false; this.rs.release(); }, this);

    var eng = this.matter.world.engine;
    eng.positionIterations = 60; eng.velocityIterations = 60;
    this.matter.world.setGravity(0, 10);
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

    this._load();
    sendToParent('GAME_READY', { level: currentLevel });
    // Start countdown after a short delay so parent can react
    var self = this;
    this.time.delayedCall(300, function () { self._startCountdown(); });
};

GameScene.prototype._load = function () {
    this._clear();
    var M = this._M, w = this.matter.world.engine.world;
    this.t = 0; this.paused = false; this.won = false; this.stab = 0; this.onP = false;
    this.pa = 0; this.ca = 0;
    this.gameStarted = false; this.startTime = 0;
    this.rs.reset();
    this.rs.mv = currentLv.rotSpd || 0.65;
    this.rs.ma = currentLv.maxRot || 2 * Math.PI;
    this.sp = false;
    if (this.winText) { this.winText.destroy(); this.winText = null; }
    if (this.timerText) { this.timerText.destroy(); this.timerText = null; }
    if (this.countdownText) { this.countdownText.destroy(); this.countdownText = null; }
    if (this.countdownBg) { this.countdownBg.destroy(); this.countdownBg = null; }

    // Timer display (top center)
    this.timerText = this.add.text(640, 30, '00:00.0', {
        fontFamily: '"Noto Serif SC","Source Han Serif SC","思源宋体",serif',
        fontSize: '28px', color: '#ffd700', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50);

    // Check if level is locked
    var ld = getLevelById(currentLevel);
    if (ld && !ld.unlocked) {
        this.add.rectangle(640, 400, 1280, 800, 0x000000, 0.75).setDepth(200);
        this.add.text(640, 330, '即将开放', {
            fontFamily: '"Noto Serif SC","思源宋体",serif', fontSize: '64px',
            color: '#ffd700', fontStyle: 'bold', stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(201);
        this.add.text(640, 420, ld.nameEn + ' — Coming Soon', {
            fontFamily: '"Noto Serif SC",serif', fontSize: '24px',
            color: '#8b949e', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(201);
        this.add.text(640, 470, '返回选关页面选择其他关卡', {
            fontFamily: '"Noto Serif SC",serif', fontSize: '18px',
            color: '#6e7681', stroke: '#000', strokeThickness: 1,
        }).setOrigin(0.5).setDepth(201);
        this.paused = true;
        return;
    }

    this.plat = M.Bodies.rectangle(currentLv.pX, currentLv.pY, currentLv.pW, currentLv.pH,
        { isStatic: true, label: 'plat', friction: currentLv.platFric || 1.5, restitution: 0.02 });
    M.Composite.add(w, this.plat);
    this.ball = M.Bodies.circle(X + currentLv.bX, Y + currentLv.bY, currentLv.bR, {
        label: 'ball', restitution: 0.02, friction: 0.5,
        density: currentLv.bM / (Math.PI * currentLv.bR * currentLv.bR)
    });
    M.Composite.add(w, this.ball);
    this.fixed = [];
    for (var i = 0; i < currentLv.fixedBaffles.length; i++) {
        var fb = currentLv.fixedBaffles[i];
        var wx1 = fb[0], wy1 = fb[1], wx2 = fb[2], wy2 = fb[3];
        var lx1 = wx1 - X, ly1 = wy1 - Y, lx2 = wx2 - X, ly2 = wy2 - Y;
        var mx = (lx1 + lx2) / 2, my = (ly1 + ly2) / 2;
        var dx = lx2 - lx1, dy = ly2 - ly1, len = Math.sqrt(dx * dx + dy * dy), la = Math.atan2(dy, dx);
        var body = M.Bodies.rectangle(X + mx, Y + my, len, currentLv.thick || 4,
            { isStatic: true, angle: la, label: 'baffle', friction: 0.3, restitution: 0.3 });
        M.Composite.add(w, body);
        this.fixed.push({ body: body, lx1: lx1, ly1: ly1, lx2: lx2, ly2: ly2, mx: mx, my: my, la: la, len: len });
    }
    this.moving = [];
    for (var i = 0; i < currentLv.movingTrajs.length; i++) {
        var mt = currentLv.movingTrajs[i];
        var tx = mt[0], ty1 = mt[1], ty2 = mt[2];
        var lx = tx - X, cy = (ty1 + ty2) / 2, hw = currentLv.mHalfW || 50;
        var body = M.Bodies.rectangle(X + lx, cy, hw * 2, currentLv.thick || 4,
            { isStatic: true, angle: 0, label: 'baffle', friction: 0.3, restitution: 0.3 });
        M.Composite.add(w, body);
        this.moving.push({ body: body, lx: lx, wy1: ty1, wy2: ty2, cy: cy, dir: 1, hw: hw });
    }
    this.tracks = [];
    for (var i = 0; i < currentLv.tracks.length; i++) {
        var tr = currentLv.tracks[i];
        var tx1 = tr[0], ty1_ = tr[1], tx2 = tr[2], ty2_ = tr[3];
        var mx = (tx1 + tx2) / 2, my = (ty1_ + ty2_) / 2;
        var dx = tx2 - tx1, dy = ty2_ - ty1_;
        var body = M.Bodies.rectangle(mx, my, Math.sqrt(dx * dx + dy * dy), 10,
            { isStatic: true, angle: Math.atan2(dy, dx), label: 'plat', friction: 0.5, restitution: 0.3 });
        M.Composite.add(w, body);
        this.tracks.push(body);
    }
};

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

    this.time.addEvent({
        delay: 1000, repeat: 3, // fires at count=3,2,1,GO!
        callback: function () {
            count--;
            if (count > 0) {
                self.countdownText.setText(String(count));
                // Scale-pulse animation
                self.tweens.add({ targets: self.countdownText, scaleX: 1.3, scaleY: 1.3, duration: 150, yoyo: true });
            } else if (count === 0) {
                self.countdownText.setText('GO!');
                self.countdownText.setColor('#00ff00');
                self.tweens.add({ targets: self.countdownText, scaleX: 1.5, scaleY: 1.5, duration: 200, yoyo: true });
            }
            if (count < 0) {
                if (self.countdownBg) { self.countdownBg.destroy(); self.countdownBg = null; }
                if (self.countdownText) { self.countdownText.destroy(); self.countdownText = null; }
                self.paused = false;
                self.gameStarted = true;
                self.startTime = Date.now();
                self.countdownActive = false;
                sendToParent('GAME_STARTED', { level: currentLevel });
            }
        },
    });
};

GameScene.prototype._clear = function () {
    var M = this._M, w = this.matter.world.engine.world;
    var R = function (b) { if (b) M.Composite.remove(w, b); };
    R(this.ball); this.ball = null;
    R(this.plat); this.plat = null;
    for (var i = 0; i < this.fixed.length; i++) R(this.fixed[i].body);
    for (var i = 0; i < this.moving.length; i++) R(this.moving[i].body);
    for (var i = 0; i < this.tracks.length; i++) R(this.tracks[i]);
    this.fixed = []; this.moving = []; this.tracks = [];
};

GameScene.prototype.update = function (time, delta) {
    var dt = delta / 1000;
    this._inp(); this.rs.update(dt);
    if (!this.paused && !this.won) this.t += dt;

    // Update timer display
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
    // Moving baffles
    for (var i = 0; i < this.moving.length; i++) {
        var d = this.moving[i];
        var ny = d.cy + 90 * dt * d.dir;
        if (ny > d.wy2) { ny = d.wy2; d.dir = -1; }
        else if (ny < d.wy1) { ny = d.wy1; d.dir = 1; }
        d.cy = ny;
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
        var vx = v.x, vy = v.y, c = false;
        if (Math.abs(vx) > 10) { vx = Math.sign(vx) * 10; c = true; }
        if (Math.abs(vy) > 10) { vy = Math.sign(vy) * 10; c = true; }
        if (c) this._M.Body.setVelocity(this.ball, { x: vx, y: vy });
    }
    if (!this.won && !this.paused) this._vic(dt);
    this._drwBaf(); this._drwBal();
};

GameScene.prototype._inp = function () {
    var k = this.sk.isDown;
    if (k && !this.sp) { this.sp = true; this.rs.press(); }
    else if (!k && this.sp) { this.sp = false; this.rs.release(); }
    if (Phaser.Input.Keyboard.JustDown(this.rk)) {
        this._load();
        var self = this;
        this.time.delayedCall(200, function () { self._startCountdown(); });
    }
};

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

GameScene.prototype._collide = function (a) {
    if (!this.ball) return;
    var B = this._M.Body, br = currentLv.bR, er = currentLv.epR || 6;
    var bt = currentLv.thick || 4, minDist = br + er, pushMargin = Math.max(bt, 3);
    var velEps = 3, ca = Math.cos(a), sa = Math.sin(a), sg = this._segs(ca, sa);
    var bpx = this.ball.position.x, bpy = this.ball.position.y;
    for (var it = 0; it < 5; it++) {
        var resolved = false;
        for (var si = 0; si < sg.length; si++) {
            var s = sg[si];
            var dx = s.x2 - s.x1, dy = s.y2 - s.y1, ls = dx * dx + dy * dy, cl;
            if (ls < 0.01) cl = { x: s.x1, y: s.y1 };
            else {
                var t = Math.max(0, Math.min(1, ((bpx - s.x1) * dx + (bpy - s.y1) * dy) / ls));
                cl = { x: s.x1 + t * dx, y: s.y1 + t * dy };
            }
            // Segment body check
            var dvx = bpx - cl.x, dvy = bpy - cl.y, dist = Math.sqrt(dvx * dvx + dvy * dvy);
            if (dist < br && dist > 0.001) {
                var nx = dvx / dist, ny = dvy / dist, pen = br - dist + pushMargin;
                bpx += nx * pen; bpy += ny * pen;
                B.setPosition(this.ball, { x: bpx, y: bpy });
                var bv = this.ball.velocity;
                if (bv) {
                    var vi = bv.x * nx + bv.y * ny;
                    if (vi < -velEps) B.setVelocity(this.ball, { x: bv.x - nx * vi, y: bv.y - ny * vi });
                    else if (vi < 0) B.setVelocity(this.ball, { x: bv.x - nx * vi, y: bv.y - ny * vi });
                }
                resolved = true;
            }
            // Endpoint checks
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
                        if (vi < -velEps) B.setVelocity(this.ball, { x: bv.x - nx * vi, y: bv.y - ny * vi });
                        else if (vi < 0) B.setVelocity(this.ball, { x: bv.x - nx * vi, y: bv.y - ny * vi });
                    }
                    resolved = true;
                }
            }
        }
        if (!resolved) break;
    }
};

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

    // Show final time below "You Win"
    var totalSec = Math.floor(elapsed / 1000);
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    var tenth = Math.floor((elapsed % 1000) / 100);
    var timeStr = (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec + '.' + tenth;
    this.add.text(640, 470, '用时 ' + timeStr, {
        fontFamily: '"Noto Serif SC",serif', fontSize: '32px',
        color: '#64b4ff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    sendToParent('GAME_WIN', { level: currentLevel, timeMs: elapsed });
};

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
    physics: { default: 'matter', matter: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [Boot, GameScene],
});
