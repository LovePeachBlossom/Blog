/* 樱花花瓣鼠标拖尾 · Sakura petal cursor trail
 * 全站生效（通过 _config.butterfly.yml 的 inject.bottom 注入）
 * 特性：
 *  - 仅在「精确指针(桌面)」且未开启系统「减少动态效果」时启用
 *  - pjax 安全：幂等初始化，画布挂在 body、监听挂在 window，翻页不重复
 *  - 不拦截点击（pointer-events: none），自动适配明 / 暗主题配色
 *  - 画布按 DPR 缩放保证清晰；空闲时自动停掉动画循环省电
 */
(function () {
  'use strict';

  // 幂等：pjax 翻页若重新执行本脚本，直接返回，避免重复挂画布与监听
  if (window.__sakuraTrail) return;

  // 触摸设备 / 无精确指针 / 用户要求减少动态 → 不启用
  var finePointer =
    window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reduceMotion) return;

  window.__sakuraTrail = true;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var MAX_PETALS = 60; // 上限，控性能

  // ===== 画布 =====
  var canvas = document.createElement('canvas');
  canvas.id = 'sakura-trail-canvas';
  var cs = canvas.style;
  cs.position = 'fixed';
  cs.left = '0';
  cs.top = '0';
  cs.width = '100%';
  cs.height = '100%';
  cs.pointerEvents = 'none';
  cs.zIndex = '99999';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ===== 配色（明 / 暗各一套，spawn 时按当前主题实时取）=====
  var LIGHT = [
    ['#FFE3EE', '#FF9EC0'],
    ['#FFD3E6', '#FF7FB0'],
    ['#FFE8F1', '#FFA9CB'],
    ['#FFDCEC', '#FF8FB3']
  ];
  var DARK = [
    ['#FFC8E0', '#FF6FA8'],
    ['#FFB7D6', '#FF5E9C'],
    ['#FFD0E4', '#FF7DB0']
  ];
  function palette() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? DARK : LIGHT;
  }

  // ===== 状态 =====
  var petals = [];
  var rafId = null;
  var lastT = 0;

  // 指针追踪：用指针速度给花瓣一点「甩出」的拖尾方向
  var px = W / 2, py = H / 2, pvx = 0, pvy = 0;
  var spawnAcc = 0; // 按移动距离累计，够阈值就播一片

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawn(x, y) {
    if (petals.length >= MAX_PETALS) return;
    var pal = palette();
    var col = pal[(Math.random() * pal.length) | 0];
    petals.push({
      x: x, y: y,
      vx: pvx * 0.12 + rand(-0.4, 0.4), // 初速含一部分指针速度 → 拖尾感
      vy: pvy * 0.12 + rand(0.2, 0.8),
      size: rand(6, 11),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.05, 0.05),
      sway: rand(0.5, 1.4),         // 横向摇摆幅度
      swayph: rand(0, Math.PI * 2), // 摇摆相位
      alpha: 0,                     // 从 0 渐入
      life: 0,
      maxLife: rand(2600, 4200),
      c1: col[0], c2: col[1]
    });
  }

  function onMove(e) {
    var x = e.clientX, y = e.clientY;
    var dx = x - px, dy = y - py;
    pvx = dx; pvy = dy;
    px = x; py = y;
    spawnAcc += Math.sqrt(dx * dx + dy * dy);
    // 每移动约 14px 播一片，移动越快越密（单次最多补 3 片）
    var n = 0;
    while (spawnAcc >= 14 && n < 3) { spawnAcc -= 14; spawn(x, y); n++; }
    if (spawnAcc > 14) spawnAcc = 14;
    if (!rafId) loop(0); // 循环若已停，重新点火
  }
  window.addEventListener('mousemove', onMove, { passive: true });

  function drawPetal(p) {
    var sz = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    var g = ctx.createLinearGradient(0, -sz, 0, sz);
    g.addColorStop(0, p.c1);
    g.addColorStop(1, p.c2);
    ctx.fillStyle = g;
    // 带小缺口的樱花花瓣轮廓
    ctx.beginPath();
    ctx.moveTo(0, -sz); // 尖端
    ctx.bezierCurveTo(sz * 0.85, -sz * 0.5, sz * 0.55, sz * 0.55, sz * 0.12, sz * 0.92);
    ctx.quadraticCurveTo(0, sz * 0.66, -sz * 0.12, sz * 0.92); // 樱花特有的缺口
    ctx.bezierCurveTo(-sz * 0.55, sz * 0.55, -sz * 0.85, -sz * 0.5, 0, -sz);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function loop(t) {
    rafId = requestAnimationFrame(loop);
    var dt = lastT ? Math.min(t - lastT, 48) : 16; // 限幅，防切回标签页时大跳
    lastT = t;
    var f = dt / 16; // 帧时间归一化

    ctx.clearRect(0, 0, W, H);

    for (var i = petals.length - 1; i >= 0; i--) {
      var p = petals[i];
      p.life += dt;
      // 渐入
      if (p.alpha < 0.92 && p.life < 300) p.alpha = Math.min(0.92, p.alpha + 0.08 * f);
      // 物理：轻微重力 + 横向摇摆 + 阻尼
      p.vy += 0.012 * f;
      var swayX = Math.sin((p.life / 1000) * 2 + p.swayph) * p.sway;
      p.x += (p.vx + swayX) * f;
      p.y += p.vy * f;
      p.rot += p.vr * f;
      p.vx *= 0.985;
      // 末段渐隐
      if (p.maxLife - p.life < 800) p.alpha = Math.max(0, p.alpha * 0.96);

      if (p.life >= p.maxLife || p.alpha <= 0.01 || p.y > H + 30) {
        petals.splice(i, 1);
        continue;
      }
      drawPetal(p);
    }

    // 没有花瓣 → 停掉循环省电，下次 mousemove 再点火
    if (petals.length === 0) {
      cancelAnimationFrame(rafId);
      rafId = null;
      lastT = 0;
    }
  }
})();
