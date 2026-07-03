/* ============================================
   Cat & Mushroom - Visual Novel Engine
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  // DOM
  const sceneBg = document.getElementById('scene-bg');
  const bgParticles = document.getElementById('bg-particles');
  const avatarEmoji = document.getElementById('avatar-emoji');
  const speakerName = document.getElementById('speaker-name');
  const dialogueText = document.getElementById('dialogue-text');
  const dialogueNext = document.getElementById('dialogue-next');
  const dialoguePanel = document.getElementById('dialogue-panel');
  const choicesEl = document.getElementById('choices');
  const combatOverlay = document.getElementById('combat-overlay');
  const endingScreenEl = document.getElementById('ending-screen');
  const endingContent = document.getElementById('ending-content');

  // Sprites
  const spriteLeft = document.getElementById('sprite-left');
  const spriteRight = document.getElementById('sprite-right');
  const spriteCenter = document.getElementById('sprite-center');

  // Dialogue queue
  let dialogueQueue = [];
  let currentCallback = null;
  let isTyping = false;
  let currentFullText = '';
  let typewriterTimer = null;
  let remainingChoices = [];

  // Character definitions
  const CHARS = {
    narrator:  { name: '旁白',  avatar: '📖' },
    me:        { name: '我',    avatar: '🗡️' },
    girl:      { name: '女孩',  avatar: '😿' },
    magician:  { name: '魔术师', avatar: '🧙‍♂️' },
    sadMush:   { name: '忧郁的蘑菇', avatar: '🍄' },
    happyMush: { name: '乐观的蘑菇', avatar: '🍄' },
    cat:       { name: '猫',    avatar: '🐱' },
  };

  // ===== Scene =====
  function setScene(scene) {
    sceneBg.className = scene;
    // Clear sprites
    [spriteLeft, spriteRight, spriteCenter].forEach(s => s.classList.remove('show'));
    // Spawn ambient motes
    spawnMotes();
  }

  function showSprite(pos, emoji) {
    const el = pos === 'left' ? spriteLeft : pos === 'right' ? spriteRight : spriteCenter;
    el.textContent = emoji;
    el.className = 'vn-sprite show';
    if (pos === 'center') el.classList.add('show');
    // Position
    if (pos === 'left') el.style.left = '8%';
    else if (pos === 'right') { el.style.left = 'auto'; el.style.right = '8%'; }
    else el.style.left = '50%';
  }

  function clearSprites() {
    [spriteLeft, spriteRight, spriteCenter].forEach(s => s.classList.remove('show'));
  }

  // ===== Ambient motes =====
  function spawnMotes() {
    bgParticles.innerHTML = '';
    for (let i = 0; i < 15; i++) {
      const mote = document.createElement('div');
      mote.className = 'mote';
      mote.style.left = Math.random() * 100 + '%';
      mote.style.top = (60 + Math.random() * 40) + '%';
      mote.style.width = mote.style.height = (1 + Math.random() * 3) + 'px';
      mote.style.animationDuration = (6 + Math.random() * 10) + 's';
      mote.style.animationDelay = Math.random() * 8 + 's';
      bgParticles.appendChild(mote);
    }
  }

  // ===== Voice =====
  const voiceBase = 'assets/voice/';
  let currentVoice = null;

  function playVoice(voiceId) {
    stopVoice();
    if (!voiceId) return;
    try {
      currentVoice = new Audio(voiceBase + voiceId + '.mp3');
      currentVoice.volume = 0.8;
      currentVoice.play().catch(() => {}); // ignore autoplay errors
    } catch(e) {}
  }

  function stopVoice() {
    if (currentVoice) {
      currentVoice.pause();
      currentVoice.currentTime = 0;
      currentVoice = null;
    }
  }

  // ===== Dialogue =====
  function say(charKey, text, callback, voiceId) {
    dialogueQueue.push({ charKey, text, callback, voiceId });
    if (dialogueQueue.length === 1 && !isTyping) showNext();
  }

  function showNext() {
    if (isTyping) { finishTypewriter(); return; }
    if (dialogueQueue.length === 0) {
      if (currentCallback) { const cb = currentCallback; currentCallback = null; cb(); }
      return;
    }

    const d = dialogueQueue.shift();
    const ch = CHARS[d.charKey] || CHARS.narrator;

    speakerName.textContent = ch.name;
    avatarEmoji.textContent = ch.avatar;
    currentFullText = d.text;
    dialogueText.textContent = '';
    dialogueNext.style.display = 'none';
    currentCallback = d.callback || null;

    // Play voice for this line
    if (d.voiceId) playVoice(d.voiceId);

    typewriter(0);
  }

  function typewriter(i) {
    isTyping = true;
    if (i < currentFullText.length) {
      dialogueText.textContent += currentFullText[i];
      typewriterTimer = setTimeout(() => typewriter(i + 1), 28);
    } else {
      isTyping = false;
      dialogueNext.style.display = 'block';
    }
  }

  function finishTypewriter() {
    clearTimeout(typewriterTimer);
    dialogueText.textContent = currentFullText;
    isTyping = false;
    dialogueNext.style.display = 'block';
  }

  function showChoices(opts) {
    choicesEl.innerHTML = '';
    choicesEl.classList.remove('hidden');
    opts.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = o.label;
      btn.addEventListener('click', () => {
        choicesEl.classList.add('hidden');
        o.action();
      });
      choicesEl.appendChild(btn);
    });
  }

  // ===== Story: Scene 1 - Room =====
  function scene1_room() {
    setScene('room');
    remainingChoices = ['c1', 'c2', 'c3'];
    showSprite('center', '😿');
    say('narrator', '空旷的小房间。一个女孩坐在地上哭。', null, 's01');
    say('me', '你为什么在哭？', null, 's02');
    say('girl', '我的猫变成蘑菇了。', () => showNextChoice(), 's03');
  }

  function showNextChoice() {
    if (remainingChoices.length === 0) {
      clearSprites();
      scene2_forest();
      return;
    }
    const opts = [];
    if (remainingChoices.includes('c1')) opts.push({ label: '猫怎么会变成蘑菇呢？', action: () => { remainingChoices = remainingChoices.filter(c => c !== 'c1'); choice1(); } });
    if (remainingChoices.includes('c2')) opts.push({ label: '这是谁干的？', action: () => { remainingChoices = remainingChoices.filter(c => c !== 'c2'); choice2(); } });
    if (remainingChoices.includes('c3')) opts.push({ label: '是毒蘑菇还是普通的蘑菇？', action: () => { remainingChoices = remainingChoices.filter(c => c !== 'c3'); choice3(); } });
    showChoices(opts);
  }

  function choice1() {
    say('me', '猫怎么会变成蘑菇呢？', null, 's04');
    say('girl', '（忧郁地抬起头瞪了你一眼）我不想提起这件事。', () => showNextChoice(), 's05');
  }

  function choice2() {
    say('me', '这是谁干的？', null, 's06');
    say('girl', '一个魔术师。他的嘴脸十分狡猾丑陋，他的魔杖十分冷峻锋利。他是魔鬼的母亲，他是赌徒的儿子。', null, 's07');
    say('me', '我会帮助你找到魔术师，让他把猫变回来。', null, 's08');
    say('girl', '感谢你的帮助，但是当你找到他的时候，请直接干掉他，我不再需要他。', () => showNextChoice(), 's09');
  }

  function choice3() {
    say('me', '是毒蘑菇还是普通的蘑菇？这或许可以提供一些有用的参考。', null, 's10');
    say('girl', '我的猫毛发光泽柔顺，性格温顺柔和。当它变成蘑菇时，它的色彩斑斓鲜艳，让人垂涎欲滴。', null, 's11');
    say('me', '我知道了，我会帮助你把你的猫变回来的。', () => showNextChoice(), 's12');
  }

  // ===== Story: Scene 2 - Forest =====
  function scene2_forest() {
    setScene('forest');
    showSprite('right', '🧙‍♂️');
    say('narrator', '你找到了魔术师。他站在一片幽暗的树林中，魔杖散发着冷光。', null, 's13');
    say('me', '你好，魔术师。', null, 's14');
    say('magician', '你好，邋遢的女孩。你的头发过长，请让我帮你改善它。', null, 's15');
    say('me', '我遇到一个伤心的小孩，她的猫变成了蘑菇。请问你知道是怎么回事吗？', null, 's16');
    say('magician', '猫是一种邪恶的生物，它们生性桀骜不驯，却凭借浓密的毛发和优美的外表蛊惑他人。蘑菇是一种善良的生物，它们可以被切成小块——放到披萨里，汉堡里，汤里，炒饭里，包子里，饺子里。', () => {
      showChoices([
        { label: '我讨厌吃蘑菇', action: () => hateMushroom() },
        { label: '我喜欢吃蘑菇', action: () => loveMushroom() },
      ]);
    }, 's17');
  }

  function hateMushroom() {
    say('me', '我讨厌吃蘑菇。我讨厌披萨里出现蘑菇。我讨厌汉堡里出现蘑菇。我讨厌汤里出现蘑菇。我讨厌炒饭里出现蘑菇。我讨厌包子里出现蘑菇。我讨厌饺子里出现蘑菇。蘑菇可以被切成小块，使它的存在难以察觉，但是它的气味沾染了每一粒米饭。', null, 's18');
    afterFood();
  }

  function loveMushroom() {
    say('me', '我喜欢吃蘑菇。蘑菇的口感Q弹劲道，味道鲜美可口。我爱吃蘑菇披萨，蘑菇汉堡，蘑菇饭，蘑菇包子，蘑菇饺子，蘑菇汤。世纪最伟大的食物就是蘑菇了。', null, 's19');
    afterFood();
  }

  function afterFood() {
    say('magician', '我也是一个明事理的人。既然你的女孩对她的猫变成蘑菇这一件事感到难过，那说明我们的谋求不同。道不同不相为谋。我尊重所有人的意见，但是我不认为我做的事情有错误。', null, 's20');
    say('me', '你是一个不知悔改的巫师，我要让你意识到自己的错误。', null, 's21');
    say('narrator', '战斗开始！', () => { startCombat(); }, 's22');
  }

  // ===== Combat =====
  function startCombat() {
    combatOverlay.classList.remove('hidden');
    dialoguePanel.style.display = 'none';
    choicesEl.classList.add('hidden');

    let playerHP = 100, enemyHP = 100;
    let playerDefending = false;
    const log = document.getElementById('combat-log');
    const enemyFill = document.getElementById('enemy-hp-fill');
    const playerFill = document.getElementById('player-hp-fill');
    const enemyAv = document.getElementById('enemy-avatar');
    const playerAv = document.getElementById('player-avatar');

    function updateHP() {
      enemyFill.style.width = Math.max(0, enemyHP) + '%';
      playerFill.style.width = Math.max(0, playerHP) + '%';
    }
    updateHP();
    log.textContent = '魔术师举起魔杖，魔光闪烁！';

    function enemyTurn() {
      const dmg = Math.floor(Math.random() * 14) + 7;
      const effective = playerDefending ? Math.floor(dmg * 0.25) : dmg;
      playerHP -= effective;
      playerAv.classList.add('hit');
      setTimeout(() => playerAv.classList.remove('hit'), 200);
      log.textContent = playerDefending
        ? `魔术师施法！防御挡住了大部分伤害 (-${effective})`
        : `魔术师施法！造成 ${effective} 点伤害。`;
      updateHP();
      if (playerHP <= 0) { playerHP = 15; log.textContent += ' 你咬紧牙关站了起来...'; }
    }

    document.getElementById('btn-attack').onclick = () => {
      if (enemyHP <= 0) return;
      playerDefending = false;
      const dmg = Math.floor(Math.random() * 18) + 14;
      enemyHP -= dmg;
      enemyAv.classList.add('hit');
      setTimeout(() => enemyAv.classList.remove('hit'), 200);
      log.textContent = `你挥剑斩向魔术师！造成 ${dmg} 点伤害。`;
      updateHP();
      if (enemyHP <= 0) {
        log.textContent = '魔术师被击败了！他踉跄着倒下，魔杖滚落在地。';
        setTimeout(() => {
          combatOverlay.classList.add('hidden');
          dialoguePanel.style.display = '';
          clearSprites();
          scene3_mushroom();
        }, 1800);
      } else { setTimeout(enemyTurn, 900); }
    };

    document.getElementById('btn-defend').onclick = () => {
      playerDefending = true;
      log.textContent = '你举起盾牌，准备格挡下一次攻击。';
      setTimeout(enemyTurn, 700);
    };
  }

  // ===== Scene 3: Mushroom =====
  function scene3_mushroom() {
    setScene('mushroom');
    showSprite('center', '🍄');
    say('narrator', '魔术师倒下了。在他身后，你发现了那只蘑菇——色彩斑斓，鲜艳夺目，在幽暗中微微发光。', null, 's23');
    say('me', '这就是那只猫变的蘑菇吗……', () => {
      showChoices([
        { label: '这是一个忧郁的蘑菇', action: () => ending_sad() },
        { label: '这是一个乐观的蘑菇', action: () => ending_happy() },
      ]);
    }, 's24');
  }

  function ending_sad() {
    setScene('mushroom');
    showSprite('center', '🍄');
    say('me', '你好，蘑菇。即使作为一个蘑菇，你依旧是蘑菇中比较美的。我从未见过这么鲜艳的蘑菇，这么圆润的蘑菇。', null, 's25');
    say('sadMush', '所有品尝过我的人都死了。我感到时间的流逝，自然的残忍。我在永无止境的暗夜中踽踽独行，唯有雨水清洗我。月下三更暖，正午半月弯，而我只是千千万万个蘑菇中最普通的一个。你为什么要与我说话？', null, 's26');
    say('me', '我遇到一个比你更加忧郁的女孩，她说她怀念你的猫形态。我见不得他人落泪，因此我长途跋涉而来，杀掉了魔术师，想要带你回去。', null, 's27');
    say('sadMush', '我原本是猫，魔术师把我变成毒蘑菇，让我吸满大自然的雨露。成为猫的时候，我只是静止地存在就可以被解读为诱惑。但成为一个蘑菇，让我的生命中充满了欢笑。', null, 's28');
    say('sadMush', '夜深人静之时，天地都在为我落泪。吹着风的夜晚，黑夜的思绪逐渐飘离。呐，今后该如何是好呢！', null, 's29');
    say('me', '那便不必再骗自己了。蘑菇的欢笑，是你说给自己听的谎言；猫的沉默，才是你唯一诚实的时刻。魔术师已死，他的咒语随他埋进了土里，可我还记得你原本的模样——', null, 's30');
    say('narrator', '法术生效，蘑菇的伞盖缓缓收缩、蜷曲，重新长出软毛与胡须……', () => {
      showSprite('center', '🐱');
    }, 's31');
    say('cat', '（吟唱）だから僕はきのこを辞めた。', null, 's32');
    say('me', '和我一起走吧！', () => {
      showEnding('重归猫女', '🐱',
        '女孩高兴地发现猫又回来了，一切都像平常一样照常进行。<br><br>但是在一个没有人注意的角落，有一块土地里彻底失去了一个蘑菇……');
    });
  }

  function ending_happy() {
    setScene('mushroom');
    showSprite('center', '🍄');
    say('me', '你好，蘑菇。即使作为一个蘑菇，你依旧是蘑菇中比较美的。我从未见过这么鲜艳的蘑菇，这么圆润的蘑菇。', null, 's34');
    say('happyMush', '我偏爱阴暗潮湿的角落，这里是我的花园。我不用叫，不用舔毛，不用伸懒腰，就可以享受无穷无尽的宁静。自然是造物者之无尽藏，而我只是一个专一的蘑菇。', null, 's35');
    say('happyMush', '每个蘑菇都有自己的造诣。我可以成为猫，让女孩为我尖叫；也可以成为蟑螂，让女孩为我尖叫；也可以成为蘑菇，让女孩为我落泪。固然受人追捧，但是唯有蘑菇才享受一片寂静的雨林。我只是宁静地存在，观赏这一切流逝的情绪，而我始终不变。', null, 's36');
    say('me', '看来，你已经完全接纳了自己的蘑菇身份。', null, 's37');
    say('happyMush', '我生来就是蘑菇，蘑菇是蘑菇，天经地义。真相啊，爱啊，世界啊，痛苦啊，人生啊，怎么样都好啦。', null, 's38');
    say('me', '那我便不再多言了——去打扰一场无欲无求的宁静，本身就是一种冒犯。愿你继续做你的蘑菇，快乐地生活一辈子吧。', null, 's39');
    say('narrator', '你转身离开了。蘑菇在身后安静地发光。', () => {
      showEnding('音乐小子', '🍄',
        '蘑菇带来了一阵短暂的蘑菇风潮，但很快归于平静。<br><br>他不需要被拯救，因为他本来就是完整的。');
    });
  }

  function showEnding(title, icon, subtitle) {
    endingScreenEl.classList.remove('hidden');
    dialoguePanel.style.display = 'none';
    endingContent.innerHTML = `
      <div class="ending-icon">${icon}</div>
      <div class="ending-title">达成结局：《${title}》</div>
      <div class="ending-subtitle">${subtitle}</div>
      <a href="index.html" class="btn" onclick="event.preventDefault(); CenturyApp.navigateTo('index.html')">返回首页</a>
    `;
    SoundEngine.playChime();
    STORE.setBool('story_complete', true);
  }

  // ===== Click anywhere to advance =====
  document.getElementById('story-container').addEventListener('click', (e) => {
    if (combatOverlay.classList.contains('hidden') && endingScreenEl.classList.contains('hidden')) {
      // Don't advance if clicking a choice button
      if (!e.target.closest('.choice-btn') && !e.target.closest('#combat-actions')) {
        showNext();
      }
    }
  });

  // ===== Start =====
  SoundEngine._ensure();
  scene1_room();

})();
