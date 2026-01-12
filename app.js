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

  // UI elements
  const toolSel = document.getElementById('toolSelect');
  const clearBtn = document.getElementById('clearBtn');
  const gravRange = document.getElementById('gravRange');
  const gravVal = document.getElementById('gravVal');
  const massRange = document.getElementById('massRange');
  const massVal = document.getElementById('massVal');

  if(gravRange){ gravRange.addEventListener('input', ()=>{ engine.world.gravity.y = Number(gravRange.value); if(gravVal) gravVal.textContent = gravRange.value; }); }
  if(massRange){ massRange.addEventListener('input', ()=>{ if(massVal) massVal.textContent = massRange.value; }); }

  let currentTool = (toolSel && toolSel.value) || 'wall';
  if(toolSel) toolSel.addEventListener('change', ()=>{ currentTool = toolSel.value; });

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

  render.canvas.style.touchAction = 'none';
  render.canvas.addEventListener('pointerdown', (e)=>{
    const p = worldPointFromMouse(e);
    if(currentTool === 'wall') dragStart = p;
    else if(currentTool === 'launcher') launcherAnchor = p;
    else if(currentTool === 'mass'){
      const m = Number(massRange ? massRange.value : 500);
      const body = Bodies.circle(p.x, p.y, 14, { isStatic: true, render:{ fillStyle: '#ffcc00' } });
      body.isGravitySource = true; body.massValue = m;
      World.add(engine.world, body);
    } else if(currentTool === 'erase'){
      const found = Query.point(engine.world.bodies, p);
      for(const b of found){ if(!walls.includes(b)) World.remove(engine.world, b); }
    }
  });

  render.canvas.addEventListener('pointermove', (e)=>{
    const p = worldPointFromMouse(e);
    octx.clearRect(0,0,overlay.width, overlay.height);
    if(dragStart){
      octx.strokeStyle = '#ffffff66'; octx.lineWidth = 6; octx.beginPath(); octx.moveTo(dragStart.x, dragStart.y); octx.lineTo(p.x, p.y); octx.stroke();
    }
    if(launcherAnchor){
      octx.strokeStyle = '#ff6b6b88'; octx.lineWidth = 4; octx.beginPath(); octx.moveTo(launcherAnchor.x, launcherAnchor.y); octx.lineTo(p.x, p.y); octx.stroke();
      octx.fillStyle = '#ff6b6b'; octx.beginPath(); octx.arc(launcherAnchor.x, launcherAnchor.y, 6,0,Math.PI*2); octx.fill();
    }
  });

  render.canvas.addEventListener('pointerup', (e)=>{
    const p = worldPointFromMouse(e);
    if(currentTool === 'wall' && dragStart){
      const a = dragStart, b = p;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if(len > 6){
        const mid = { x: (a.x+b.x)/2, y: (a.y+b.y)/2 };
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const wall = Bodies.rectangle(mid.x, mid.y, len, 12, { isStatic: true, angle, render: { fillStyle: '#888' } });
        World.add(engine.world, wall);
      }
      dragStart = null; octx.clearRect(0,0,overlay.width, overlay.height);
    } else if(currentTool === 'box'){
      const box = Bodies.rectangle(p.x, p.y, 40, 40, { restitution: 0.2, friction: 0.1, render:{ fillStyle: '#2b6cff' } });
      World.add(engine.world, box);
    } else if(currentTool === 'circle'){
      const c = Bodies.circle(p.x, p.y, 18, { restitution:0.2, friction:0.02, render:{ fillStyle: '#9b59b6' } });
      World.add(engine.world, c);
    } else if(currentTool === 'polygon'){
      const poly = Bodies.polygon(p.x, p.y, 5, 26, { restitution:0.1, render:{ fillStyle: '#27ae60' } });
      World.add(engine.world, poly);
    } else if(currentTool === 'launcher' && launcherAnchor){
      const dx = launcherAnchor.x - p.x; const dy = launcherAnchor.y - p.y;
      const power = Math.min(1500, Math.hypot(dx,dy)*6);
      const angle = Math.atan2(dy, dx);
      const vx = Math.cos(angle) * power; const vy = Math.sin(angle) * power;
      const ball = Bodies.circle(launcherAnchor.x, launcherAnchor.y, 14, { restitution:0.4, friction:0.02, render:{ fillStyle:'#ff6b6b' } });
      Body.setVelocity(ball, { x: vx*0.02, y: vy*0.02 });
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

  // keep world size consistent if window resizes
  window.addEventListener('resize', ()=>{
    Render.lookAt(render, { min: { x: 0, y: 0 }, max: { x: window.innerWidth, y: window.innerHeight } });
  });

  // expose a small API for console experimentation
  window.Sandbox = { engine, world: engine.world, Matter, addBox:(x,y)=>World.add(engine.world, Bodies.rectangle(x,y,40,40)), addCircle:(x,y)=>World.add(engine.world, Bodies.circle(x,y,18)) };

})();

// Instructions close button handler (separate to ensure DOM exists)
window.addEventListener('load', ()=>{
  const close = document.getElementById('closeInstr');
  const instr = document.getElementById('instructions');
  if(close && instr){ close.addEventListener('click', ()=>{ instr.style.display = 'none'; }); }
});
