/* Matter.js sandbox: walls, launcher, object palette, and gravity masses */
console.log('app.js loaded (Matter sandbox)');
(function(){
  const { Engine, Render, Runner, World, Bodies, Body, Events, Mouse, MouseConstraint, Vector, Query } = Matter;

  const canvasWrap = document.getElementById('canvasWrap');
  const width = window.innerWidth; const height = window.innerHeight;

  const engine = Engine.create();
  engine.world.gravity.y = 1; // default

  const render = Render.create({ element: canvasWrap, engine, options: { width, height, wireframes: false, background: '#0b0b0c' } });
  Render.run(render);
  const runner = Runner.create(); Runner.run(runner, engine);

  // boundaries
  const thickness = 80;
  const walls = [
    Bodies.rectangle(width/2, height + thickness/2, width, thickness, { isStatic: true }),
    Bodies.rectangle(width/2, -thickness/2, width, thickness, { isStatic: true }),
    Bodies.rectangle(-thickness/2, height/2, thickness, height, { isStatic: true }),
    Bodies.rectangle(width + thickness/2, height/2, thickness, height, { isStatic: true })
  ];
  World.add(engine.world, walls);

  // --- Prebuilt level and scoring ---
  let score = 0;
  let platform = null;
  let platformWidth = 0;
  let platformHeight = 0;
  let winShown = false;
  let currentLevelIndex = 0;
  const maxLevels = 3;
  function updateScoreUI(){ const el = document.getElementById('score'); if(el) el.textContent = String(score); }

  // spawn an Angry-Birds-like arrangement: platforms, stacked boxes, and round targets (pigs)
  function spawnLevel(index = 0){
    currentLevelIndex = (typeof index === 'number') ? index : 0;
    if(currentLevelIndex < 0) currentLevelIndex = 0;
    if(currentLevelIndex >= maxLevels) currentLevelIndex = maxLevels - 1;
    // remove existing non-boundary bodies
    const toRemove = engine.world.bodies.filter(b=> !walls.includes(b));
    for(const b of toRemove) World.remove(engine.world, b);

    // clear any previous win banner
    winShown = false;
    const existingWin = document.getElementById('winBanner'); if(existingWin) existingWin.remove();

    // choose layout by level index
    // Level 0: original layout
    if(currentLevelIndex === 0){
      platformWidth = 320; platformHeight = 20;
      platform = Bodies.rectangle(width*0.75, height - 120, platformWidth, platformHeight, { isStatic: true, render:{ fillStyle: '#6b4f3f' } });
      platform._isPlatform = true;
      World.add(engine.world, platform);

      // left small tower
      const baseY = height - 140;
      const lx = width*0.68;
      for(let i=0;i<3;i++){
        const box = Bodies.rectangle(lx, baseY - i*40, 40, 40, { restitution: 0.05, friction: 0.4, render:{ fillStyle: '#d35400' } });
        box.isLevelBlock = true; World.add(engine.world, box);
      }

      // right taller tower
      const rx = width*0.82;
      for(let i=0;i<4;i++){
        const box = Bodies.rectangle(rx, baseY - i*40, 40, 40, { restitution: 0.05, friction: 0.4, render:{ fillStyle: '#c0392b' } });
        box.isLevelBlock = true; World.add(engine.world, box);
      }

      // pigs
      const pig1 = Bodies.circle(lx, baseY - 3*40 - 18, 18, { restitution: 0.1, render:{ fillStyle: '#27ae60' } }); pig1.isTarget = true; pig1.isLevelBlock = true; World.add(engine.world, pig1);
      const pig2 = Bodies.circle(rx, baseY - 4*40 - 18, 18, { restitution: 0.1, render:{ fillStyle: '#27ae60' } }); pig2.isTarget = true; pig2.isLevelBlock = true; World.add(engine.world, pig2);

      const loose = Bodies.rectangle(width*0.72, baseY+10, 50, 20, { render:{ fillStyle: '#8e44ad' } }); loose.isLevelBlock = true; World.add(engine.world, loose);
    }
    // Level 1: wider platform, staggered small blocks
    else if(currentLevelIndex === 1){
      platformWidth = 420; platformHeight = 20;
      platform = Bodies.rectangle(width*0.72, height - 140, platformWidth, platformHeight, { isStatic: true, render:{ fillStyle: '#6b4f3f' } }); platform._isPlatform = true; World.add(engine.world, platform);
      const baseY = height - 160;
      const startX = width*0.62;
      for(let i=0;i<5;i++){
        const bx = startX + i*36;
        const box = Bodies.rectangle(bx, baseY - (i%2)*32, 36, 36, { restitution:0.06, friction:0.4, render:{ fillStyle: '#f39c12' } }); box.isLevelBlock = true; World.add(engine.world, box);
      }
      const pig = Bodies.circle(startX + 2*36, baseY - 64, 20, { restitution:0.08, render:{ fillStyle:'#27ae60' } }); pig.isTarget = true; pig.isLevelBlock = true; World.add(engine.world, pig);
    }
    // Level 2: two small platforms with a bridge of boxes
    else {
      platformWidth = 260; platformHeight = 18;
      const leftPlat = Bodies.rectangle(width*0.66, height - 130, platformWidth, platformHeight, { isStatic:true, render:{ fillStyle:'#6b4f3f' } }); leftPlat._isPlatform = true; World.add(engine.world, leftPlat);
      const rightPlat = Bodies.rectangle(width*0.86, height - 170, platformWidth, platformHeight, { isStatic:true, render:{ fillStyle:'#6b4f3f' } }); rightPlat._isPlatform = true; World.add(engine.world, rightPlat);
      platform = rightPlat; // treat right as the main platform for win-check
      for(let i=0;i<6;i++){
        const bx = width*0.72 + i*28 - 60;
        const b = Bodies.rectangle(bx, height - 190, 28, 22, { render:{ fillStyle:'#9b59b6' } }); b.isLevelBlock = true; World.add(engine.world, b);
      }
      const pig = Bodies.circle(width*0.86, height - 200, 16, { render:{ fillStyle:'#27ae60' } }); pig.isTarget = true; pig.isLevelBlock = true; World.add(engine.world, pig);
    }

    // reset score for new level
    score = 0; updateScoreUI();
  }

  // reset button hookup (DOM might be loaded later)
  window.addEventListener('load', ()=>{ const r = document.getElementById('resetLevel'); if(r) r.addEventListener('click', spawnLevel); });

  // create simple level controls UI
  function createLevelControls(){
    const ctrl = document.createElement('div');
    ctrl.id = 'levelControls';
    Object.assign(ctrl.style, { position:'absolute', right:'12px', top:'12px', zIndex:10000, color:'#fff', fontFamily:'sans-serif' });

    const prev = document.createElement('button'); prev.textContent = '<';
    const next = document.createElement('button'); next.textContent = '>';
    const label = document.createElement('span'); label.id = 'levelLabel'; label.style.margin = '0 8px';
    prev.addEventListener('click', ()=>{ spawnLevel(Math.max(0, currentLevelIndex-1)); updateLevelLabel(); });
    next.addEventListener('click', ()=>{ spawnLevel(Math.min(maxLevels-1, currentLevelIndex+1)); updateLevelLabel(); });
    Object.assign(prev.style, { marginRight:'4px' }); Object.assign(next.style, { marginLeft:'4px' });
    ctrl.appendChild(prev); ctrl.appendChild(label); ctrl.appendChild(next);
    canvasWrap.appendChild(ctrl);
    function updateLevelLabel(){ const el = document.getElementById('levelLabel'); if(el) el.textContent = `Level ${currentLevelIndex+1}`; }
    updateLevelLabel();
    // expose updater
    window.updateLevelLabel = updateLevelLabel;
  }
  createLevelControls();

  // UI elements
  const toolSel = document.getElementById('toolSelect');
  const clearBtn = document.getElementById('clearBtn');
  const gravRange = document.getElementById('gravRange');
  const gravVal = document.getElementById('gravVal');
  const massRange = document.getElementById('massRange');
  const massVal = document.getElementById('massVal');

  if(gravRange){ gravRange.addEventListener('input', ()=>{ engine.world.gravity.y = Number(gravRange.value); if(gravVal) gravVal.textContent = gravRange.value; }); }
  if(massRange){ massRange.addEventListener('input', ()=>{ if(massVal) massVal.textContent = massRange.value; }); }

  // Force launcher as the only tool to simplify controls
  let currentTool = 'launcher';
  if(toolSel){ toolSel.style.display = 'none'; }

  // mouse
  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } });
  World.add(engine.world, mouseConstraint);

  // overlay canvas for drawing bands and guides
  const overlay = document.createElement('canvas');
  overlay.className = 'band';
  overlay.width = width; overlay.height = height;
  overlay.style.left = '0'; overlay.style.top = '0'; overlay.style.width = '100%'; overlay.style.height = '100%';
  overlay.style.touchAction = 'none';
  canvasWrap.appendChild(overlay);
  const octx = overlay.getContext('2d');

  window.addEventListener('resize', ()=>{
    render.canvas.width = window.innerWidth; render.canvas.height = window.innerHeight;
    overlay.width = window.innerWidth; overlay.height = window.innerHeight;
  });

  // state for drawing and launcher
  let dragStart = null;
  let launcherAnchor = null;

  function worldPointFromMouse(e){
    const rect = render.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // Single-mode launcher controls: pointerdown sets anchor, drag shows band, pointerup launches a ball
  render.canvas.style.touchAction = 'none';
  render.canvas.addEventListener('pointerdown', (e)=>{
    const p = worldPointFromMouse(e);
    launcherAnchor = p;
  });

  render.canvas.addEventListener('pointermove', (e)=>{
    const p = worldPointFromMouse(e);
    octx.clearRect(0,0,overlay.width, overlay.height);
    if(launcherAnchor){
      octx.strokeStyle = '#ff6b6b88'; octx.lineWidth = 4; octx.beginPath(); octx.moveTo(launcherAnchor.x, launcherAnchor.y); octx.lineTo(p.x, p.y); octx.stroke();
      octx.fillStyle = '#ff6b6b'; octx.beginPath(); octx.arc(launcherAnchor.x, launcherAnchor.y, 6,0,Math.PI*2); octx.fill();
    }
  });

  render.canvas.addEventListener('pointerup', (e)=>{
    const p = worldPointFromMouse(e);
    if(launcherAnchor){
      const dx = launcherAnchor.x - p.x; const dy = launcherAnchor.y - p.y;
      const dist = Math.hypot(dx,dy);
      const maxPower = 2200;
      const power = Math.min(maxPower, dist * 12);
      const angle = Math.atan2(dy, dx);
      const vx = Math.cos(angle) * power; const vy = Math.sin(angle) * power;
      // offset spawn slightly so the ball doesn't start overlapping the band anchor
      const spawnOffset = 18;
      const sx = launcherAnchor.x + Math.cos(angle + Math.PI) * spawnOffset;
      const sy = launcherAnchor.y + Math.sin(angle + Math.PI) * spawnOffset;
      const ball = Bodies.circle(sx, sy, 14, { restitution:0.4, frictionAir: 0.002, friction:0.02, density:0.002, render:{ fillStyle:'#ff6b6b' } });
      // use a combination of direct velocity and small impulse to avoid tunneling/jitter
      Body.setVelocity(ball, { x: vx * 0.018, y: vy * 0.018 });
      Body.applyForce(ball, ball.position, { x: vx * 6e-6, y: vy * 6e-6 });
      World.add(engine.world, ball);
      launcherAnchor = null; octx.clearRect(0,0,overlay.width, overlay.height);
    }
  });

  // Clear button
  if(clearBtn) clearBtn.addEventListener('click', ()=>{
    const toRemove = engine.world.bodies.filter(b=> !walls.includes(b));
    for(const b of toRemove) World.remove(engine.world, b);
  });

  // Apply gravitational attraction from masses each tick
  Events.on(engine, 'beforeUpdate', ()=>{
    const bodies = engine.world.bodies;
    // collect gravity sources
    const sources = bodies.filter(b=> b.isGravitySource);
    if(sources.length === 0) return;
    const G = Number(massRange ? massRange.value : 500);
    for(const b of bodies){
      if(b.isStatic || b.isGravitySource) continue;
      for(const s of sources){
        const dx = s.position.x - b.position.x; const dy = s.position.y - b.position.y;
        const r2 = Math.max(100, dx*dx + dy*dy);
        const forceMag = (G * (s.massValue || 500) * (b.mass || b.mass || 1)) / r2;
        const dir = Vector.normalise({ x: dx, y: dy });
        Body.applyForce(b, b.position, { x: dir.x * forceMag * 1e-6, y: dir.y * forceMag * 1e-6 });
      }
    }
  });

  // Award points when targets (pigs) are knocked down or fall
  Events.on(engine, 'afterUpdate', ()=>{
    const bodies = engine.world.bodies.slice();
    for(const b of bodies){
      if(b.isTarget && !b._scored){
        if(b.position.y > height - 80 || Math.abs(b.angle) > Math.PI/3){
          const points = (typeof b.circleRadius !== 'undefined') ? 10 : 100;
          score += points; b._scored = true; updateScoreUI();
          setTimeout(()=>{ try{ World.remove(engine.world, b); }catch(e){} }, 80);
        }
      }
    }

    // Check win condition: no level blocks overlapping the platform
    if(platform && !winShown){
      const anyOnPlatform = engine.world.bodies.some(bb => bb.isLevelBlock && Matter.Bounds.overlaps(bb.bounds, platform.bounds));
      if(!anyOnPlatform){
        const winEl = document.createElement('div');
        winEl.id = 'winBanner';
        Object.assign(winEl.style, {
          position: 'absolute', left: '50%', top: '18%', transform: 'translateX(-50%)',
          color: '#fff', fontSize: '48px', background: 'rgba(0,0,0,0.6)', padding: '12px 24px',
          borderRadius: '8px', zIndex: 10000, pointerEvents: 'none'
        });
        winEl.textContent = 'you win';
        canvasWrap.appendChild(winEl);
        winShown = true;
        // auto-advance to next level if available
        const nextIndex = currentLevelIndex + 1;
        if(nextIndex < maxLevels){
          setTimeout(()=>{ try{ spawnLevel(nextIndex); if(window.updateLevelLabel) window.updateLevelLabel(); }catch(e){} }, 1200);
        }
      }
    }
  });

  // keep world size consistent if window resizes
  window.addEventListener('resize', ()=>{
    Render.lookAt(render, { min: { x: 0, y: 0 }, max: { x: window.innerWidth, y: window.innerHeight } });
  });

  // Spawn the initial level
  spawnLevel();

  // expose a small API for console experimentation
  window.Sandbox = { engine, world: engine.world, Matter, addBox:(x,y)=>World.add(engine.world, Bodies.rectangle(x,y,40,40)), addCircle:(x,y)=>World.add(engine.world, Bodies.circle(x,y,18)) };

})();

// Instructions close button handler (separate to ensure DOM exists)
window.addEventListener('load', ()=>{
  const close = document.getElementById('closeInstr');
  const instr = document.getElementById('instructions');
  if(close && instr){ close.addEventListener('click', ()=>{ instr.style.display = 'none'; }); }
});
