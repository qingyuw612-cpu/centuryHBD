/* ============================================
   Century Birthday - Ending Page JS
   Fireworks + Confetti + Text Reveal
   ============================================ */

(function() {
  const { BGM } = window.CenturyApp;

  const canvas = document.getElementById('ending-canvas');
  const ctx = canvas.getContext('2d');
  let width, height, animId;

  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr, dpr);
  }
  resize(); window.addEventListener('resize', resize);

  let fireworks = [], confettiPieces = [];
  const COLORS = ['#f0d78c','#e8c060','#b39dda','#9a7fc0','#7eb8da','#ffb3ba','#f09098','#a8e6cf'];

  class FWP {
    constructor(x,y,c) { this.x=x; this.y=y; this.color=c;
      const a=Math.random()*Math.PI*2, s=1.5+Math.random()*5;
      this.vx=Math.cos(a)*s; this.vy=Math.sin(a)*s; this.alpha=1;
      this.size=1.5+Math.random()*3; this.age=0; this.maxAge=0.8+Math.random()*1.4; }
    update(dt) { this.age+=dt; this.x+=this.vx; this.y+=this.vy; this.vy+=0.04; this.vx*=0.99; this.vy*=0.99; this.alpha=Math.max(0,1-this.age/this.maxAge); }
    draw(ctx) { if(this.alpha<=0)return; ctx.save(); ctx.globalAlpha=this.alpha; ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=4; ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill(); ctx.restore(); }
    get dead() { return this.age>=this.maxAge; }
  }
  function spawnFirework() {
    const x=width*0.15+Math.random()*width*0.7, y=height*0.1+Math.random()*height*0.4;
    const c=COLORS[Math.floor(Math.random()*COLORS.length)];
    for(let i=0;i<50+Math.floor(Math.random()*60);i++) fireworks.push(new FWP(x,y,c));
  }

  class Conf {
    constructor(init) { this.reset(init); }
    reset(init) { this.x=Math.random()*width; this.y=init?Math.random()*height*0.2-30:-20;
      this.size=4+Math.random()*8; this.color=COLORS[Math.floor(Math.random()*COLORS.length)];
      this.vy=1+Math.random()*2.5; this.vx=-1+Math.random()*2;
      this.rotation=Math.random()*Math.PI*2; this.rotSpeed=(Math.random()-0.5)*0.08;
      this.alpha=0.6+Math.random()*0.4; this.wobble=Math.random()*Math.PI*2; this.wobbleSpeed=0.02+Math.random()*0.03; }
    update(dt) { this.y+=this.vy; this.x+=this.vx+Math.sin(this.wobble)*0.8; this.wobble+=this.wobbleSpeed; this.rotation+=this.rotSpeed; if(this.y>height+30)this.reset(false); }
    draw(ctx) { ctx.save(); ctx.globalAlpha=this.alpha; ctx.translate(this.x,this.y); ctx.rotate(this.rotation); ctx.fillStyle=this.color; ctx.fillRect(-this.size/2,-this.size/4,this.size,this.size/2); ctx.restore(); }
  }

  let bgStars=[];
  function createBgStars() { bgStars=[]; for(let i=0;i<60;i++) bgStars.push({x:Math.random()*width,y:Math.random()*height,r:0.5+Math.random()*1.5,ts:0.5+Math.random()*2,to:Math.random()*Math.PI*2}); }
  createBgStars();

  let timeSinceStart=0, fireworkTimer=0, confettiSpawnTimer=0;

  function gameLoop(ts) {
    animId=requestAnimationFrame(gameLoop);
    const dt=Math.min(0.05,(ts-(gameLoop._lastTs||ts))/1000); gameLoop._lastTs=ts; timeSinceStart+=dt;

    fireworkTimer+=dt;
    if(fireworkTimer>0.8+Math.random()*1.2){fireworkTimer=0;spawnFirework();}
    if(timeSinceStart>1&&timeSinceStart<3&&fireworkTimer>0.4){fireworkTimer=0;spawnFirework();}
    confettiSpawnTimer+=dt;
    while(confettiSpawnTimer>0.05&&confettiPieces.length<200){confettiSpawnTimer-=0.05;confettiPieces.push(new Conf(true));}
    for(const fp of fireworks)fp.update(dt);
    for(const cp of confettiPieces)cp.update(dt);
    fireworks=fireworks.filter(f=>!f.dead);
    ctx.clearRect(0,0,width,height);
    const bgGrad=ctx.createRadialGradient(width*0.5,height*0.4,0,width*0.5,height*0.5,Math.max(width,height));
    bgGrad.addColorStop(0,'#1a1640');bgGrad.addColorStop(0.6,'#0f0d28');bgGrad.addColorStop(1,'#060418');
    ctx.fillStyle=bgGrad;ctx.fillRect(0,0,width,height);
    for(const s of bgStars){const a=0.3+Math.sin(timeSinceStart*s.ts+s.to)*0.3;ctx.fillStyle=`rgba(240,215,140,${Math.max(0.1,a)})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}
    ctx.globalCompositeOperation='lighter';
    for(const fp of fireworks)fp.draw(ctx);
    ctx.globalCompositeOperation='source-over';
    for(const cp of confettiPieces)cp.draw(ctx);

    if(timeSinceStart>=2){document.getElementById('happy-birthday').style.opacity='1';}
    if(timeSinceStart>=3.5){document.getElementById('century-name').style.opacity='1';}
    if(timeSinceStart>=4.5){document.getElementById('sub-message').style.opacity='1';}
    if(timeSinceStart>=6){document.getElementById('ending-links').style.opacity='1';}
  }

  var started=false;
  window.CenturyApp.startEnding=function(){
    if(started)return;started=true;
    gameLoop._lastTs=performance.now();
    animId=requestAnimationFrame(gameLoop);
  };
  // standalone page
  if(!document.getElementById('section-home')){
    BGM.init();BGM.play();
    gameLoop._lastTs=performance.now();
    animId=requestAnimationFrame(gameLoop);
  }
})();
