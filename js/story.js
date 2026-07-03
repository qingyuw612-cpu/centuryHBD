/* ============================================
   Century Birthday - Story Game JS
   Cat & Mushroom visual novel + combat
   ============================================ */

(function() {
  const { BGM, SoundEngine } = window.CenturyApp;

  const sceneBg = document.getElementById('scene-bg');
  const charSprite = document.getElementById('character-sprite');
  const speakerName = document.getElementById('speaker-name');
  const dialogueText = document.getElementById('dialogue-text');
  const dialogueIndicator = document.getElementById('dialogue-indicator');
  const dialogueBox = document.getElementById('dialogue-box');
  const choicesEl = document.getElementById('choices');
  const combatOverlay = document.getElementById('combat-overlay');
  const endingScreen = document.getElementById('ending-screen');
  const endingContent = document.getElementById('ending-content');

  let dialogueQueue = [];
  let currentCallback = null;
  let isTyping = false;
  let typewriterTimer = null;
  let currentScene = 'room';
  let storyFlags = {};

  // ===== Scene management =====
  function setScene(scene) {
    currentScene = scene;
    sceneBg.className = scene;
    const sprites = {
      room: '🧎‍♀️', forest: '🧙‍♂️', mushroom: '🍄', combat: '⚔️'
    };
    charSprite.textContent = sprites[scene] || '';
  }

  // ===== Dialogue system =====
  function say(speaker, text, callback) {
    dialogueQueue.push({ speaker, text, callback });
    if (dialogueQueue.length === 1) showNext();
  }

  function showNext() {
    if (isTyping) { skipTypewriter(); return; }
    if (dialogueQueue.length === 0) { if (currentCallback) { const cb = currentCallback; currentCallback = null; cb(); } return; }

    const d = dialogueQueue.shift();
    speakerName.textContent = d.speaker;
    dialogueText.textContent = '';
    dialogueIndicator.style.display = 'none';
    currentCallback = d.callback || null;
    typewriter(d.text, 0);
  }

  function typewriter(text, i) {
    isTyping = true;
    if (i < text.length) {
      dialogueText.textContent += text[i];
      typewriterTimer = setTimeout(() => typewriter(text, i + 1), 35);
    } else {
      isTyping = false;
      typewriterTimer = null;
      dialogueIndicator.style.display = 'block';
    }
  }

  function skipTypewriter() {
    clearTimeout(typewriterTimer);
    // Fill remaining text
    const d = dialogueQueue.length > 0 ? dialogueQueue[0] : null;
    if (!d) { isTyping = false; return; }
    // Actually the current text is already partially typed; just complete it
    // We need the full text... let me just clear and show next
    isTyping = false;
    typewriterTimer = null;
    dialogueIndicator.style.display = 'block';
    // Jump to end of current text
    if (dialogueQueue.length > 0) {
      // current text is from the already-shifted item, so it's lost. Skip.
    }
    showNext();
  }

  // Fix: better approach - store current text
  let currentFullText = '';
  function say2(speaker, text, callback) {
    dialogueQueue.push({ speaker, text, callback });
    if (dialogueQueue.length === 1 && !isTyping) showNext2();
  }

  function showNext2() {
    if (isTyping) { finishTypewriter(); return; }
    if (dialogueQueue.length === 0) { if (currentCallback) { const cb = currentCallback; currentCallback = null; cb(); } return; }

    const d = dialogueQueue.shift();
    speakerName.textContent = d.speaker;
    currentFullText = d.text;
    dialogueText.textContent = '';
    dialogueIndicator.style.display = 'none';
    currentCallback = d.callback || null;
    typewriter2(0);
  }

  function typewriter2(i) {
    isTyping = true;
    if (i < currentFullText.length) {
      dialogueText.textContent += currentFullText[i];
      typewriterTimer = setTimeout(() => typewriter2(i + 1), 30);
    } else {
      isTyping = false;
      dialogueIndicator.style.display = 'block';
    }
  }

  function finishTypewriter() {
    clearTimeout(typewriterTimer);
    dialogueText.textContent = currentFullText;
    isTyping = false;
    dialogueIndicator.style.display = 'block';
  }

  function showChoices(choices) {
    choicesEl.innerHTML = '';
    choicesEl.classList.remove('hidden');
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = c.label;
      btn.addEventListener('click', () => {
        choicesEl.classList.add('hidden');
        c.action();
      });
      choicesEl.appendChild(btn);
    });
  }

  // ===== Story Scenes =====
  function scene1_room() {
    setScene('room');
    say2('旁白', '空旷的小房间。一个女孩坐在地上哭。');
    say2('我', '你为什么在哭？');
    say2('女孩', '我的猫变成蘑菇了。', () => {
      showChoices([
        { label: '猫怎么会变成蘑菇呢？', action: () => scene1_choice1() },
        { label: '这是谁干的？', action: () => scene1_choice2() },
        { label: '是毒蘑菇还是普通的蘑菇？', action: () => scene1_choice3() },
      ]);
    });
  }

  function scene1_choice1() {
    say2('我', '猫怎么会变成蘑菇呢？');
    say2('女孩', '（忧郁地抬起头瞪了你一眼）我不想提起这件事。');
    scene1_choice2(); // proceed to same follow-up
  }

  function scene1_choice2() {
    if (!storyFlags.askedWho) {
      storyFlags.askedWho = true;
      say2('我', '这是谁干的？');
      say2('女孩', '一个魔术师。他的嘴脸十分狡猾丑陋，他的魔杖十分冷峻锋利。他是魔鬼的母亲，他是赌徒的儿子。');
      say2('我', '我会帮助你找到魔术师，让他把猫变回来。');
      say2('女孩', '感谢你的帮助，但是当你找到他的时候，请直接干掉他，我不再需要他。');
    }
    scene2_forest();
  }

  function scene1_choice3() {
    say2('我', '是毒蘑菇还是普通的蘑菇？这或许可以提供一些有用的参考。');
    say2('女孩', '我的猫毛发光泽柔顺，性格温顺柔和。当它变成蘑菇时，它的色彩斑斓鲜艳，让人垂涎欲滴。');
    say2('我', '我知道了，我会帮助你把你的猫变回来的。');
    scene2_forest();
  }

  function scene2_forest() {
    setScene('forest');
    say2('旁白', '你找到了魔术师。他站在一片幽暗的树林中。');
    say2('我', '你好，魔术师。');
    say2('魔术师', '你好，邋遢的女孩。你的头发过长，请让我帮你改善它。');
    say2('我', '我遇到一个伤心的小孩，她的猫变成了蘑菇。请问你知道是怎么回事吗？');
    say2('魔术师', '猫是一种邪恶的生物，它们生性桀骜不驯，却凭借浓密的毛发和优美的外表蛊惑他人。蘑菇是一种善良的生物，它们可以被切成小块——放到披萨里，汉堡里，汤里，炒饭里，包子里，饺子里。', () => {
      showChoices([
        { label: '我讨厌吃蘑菇', action: () => scene2_hateMushroom() },
        { label: '我喜欢吃蘑菇', action: () => scene2_loveMushroom() },
      ]);
    });
  }

  function scene2_hateMushroom() {
    say2('我', '我讨厌吃蘑菇。我讨厌披萨里出现蘑菇。我讨厌汉堡里出现蘑菇。我讨厌汤里出现蘑菇。我讨厌炒饭里出现蘑菇。我讨厌包子里出现蘑菇。我讨厌饺子里出现蘑菇。蘑菇可以被切成小块，使它的存在难以察觉，但是它的气味沾染了每一粒米饭。');
    scene2_afterFood();
  }

  function scene2_loveMushroom() {
    say2('我', '我喜欢吃蘑菇。蘑菇的口感Q弹劲道，味道鲜美可口。我爱吃蘑菇披萨，蘑菇汉堡，蘑菇饭，蘑菇包子，蘑菇饺子，蘑菇汤。世界上最伟大的食物就是蘑菇了。');
    scene2_afterFood();
  }

  function scene2_afterFood() {
    say2('魔术师', '我也是一个明事理的人。既然你的女孩对她的猫变成蘑菇这一件事感到难过，那说明我们的谋求不同。道不同不相为谋。我尊重所有人的意见，但是我不认为我做的事情有错误。');
    say2('我', '你是一个不知悔改的巫师，我要让你意识到自己的错误。');
    say2('旁白', '战斗开始！', () => { startCombat(); });
  }

  // ===== Combat =====
  function startCombat() {
    combatOverlay.classList.remove('hidden');
    dialogueBox.style.display = 'none';
    choicesEl.classList.add('hidden');

    let playerHP = 100, enemyHP = 100;
    let playerDefending = false;
    const log = document.getElementById('combat-log');
    const playerFill = document.getElementById('player-hp-fill');
    const enemyFill = document.getElementById('enemy-hp-fill');
    const enemySprite = document.getElementById('enemy-sprite');
    const playerSprite = document.getElementById('player-sprite');

    function updateHP() {
      playerFill.style.width = Math.max(0, playerHP) + '%';
      enemyFill.style.width = Math.max(0, enemyHP) + '%';
    }
    updateHP();

    function enemyAttack() {
      const dmg = Math.floor(Math.random() * 15) + 8;
      const effective = playerDefending ? Math.floor(dmg * 0.3) : dmg;
      playerHP -= effective;
      playerSprite.classList.add('hit');
      setTimeout(() => playerSprite.classList.remove('hit'), 200);
      log.textContent = playerDefending
        ? `魔术师攻击！防御挡住了大部分伤害！(-${effective})`
        : `魔术师攻击！造成 ${effective} 点伤害。`;
      updateHP();
      if (playerHP <= 0) {
        playerHP = 20; // mercy
        log.textContent += ' 你勉强站起来了...';
      }
    }

    document.getElementById('btn-attack').onclick = () => {
      if (enemyHP <= 0) return;
      playerDefending = false;
      const dmg = Math.floor(Math.random() * 20) + 12;
      enemyHP -= dmg;
      enemySprite.classList.add('hit');
      setTimeout(() => enemySprite.classList.remove('hit'), 200);
      log.textContent = `你攻击魔术师！造成 ${dmg} 点伤害。`;
      updateHP();
      if (enemyHP <= 0) {
        log.textContent = '魔术师被击败了！他无力地倒在地上。';
        setTimeout(() => {
          combatOverlay.classList.add('hidden');
          dialogueBox.style.display = '';
          scene3_mushroom();
        }, 1500);
      } else {
        setTimeout(enemyAttack, 800);
      }
    };

    document.getElementById('btn-defend').onclick = () => {
      playerDefending = true;
      log.textContent = '你摆出防御姿态...';
      setTimeout(enemyAttack, 600);
    };

    log.textContent = '魔术师举起魔杖！选择攻击或防御。';
  }

  // ===== Mushroom scene =====
  function scene3_mushroom() {
    setScene('mushroom');
    say2('旁白', '魔术师倒下了。在他身后，你发现了那只蘑菇——色彩斑斓，鲜艳夺目。');
    say2('我', '这就是那只猫变的蘑菇吗……', () => {
      showChoices([
        { label: '这是一个忧郁的蘑菇', action: () => ending_sad() },
        { label: '这是一个乐观的蘑菇', action: () => ending_happy() },
      ]);
    });
  }

  function ending_sad() {
    setScene('mushroom');
    charSprite.textContent = '🍄';

    say2('我', '你好，蘑菇。即使作为一个蘑菇，你依旧是蘑菇中比较美的。我从未见过这么鲜艳的蘑菇，这么圆润的蘑菇。');
    say2('忧郁的蘑菇', '所有品尝过我的人都死了。我感到时间的流逝，自然的残忍。我在永无止境的暗夜中踽踽独行，唯有雨水清洗我。月下三更暖，正午半月弯，而我只是千千万万个蘑菇中最普通的一个。你为什么要与我说话？');
    say2('我', '我遇到一个比你更加忧郁的女孩，她说她怀念你的猫形态。我见不得他人落泪，因此我长途跋涉而来，杀掉了魔术师，想要带你回去。');
    say2('忧郁的蘑菇', '我原本是猫，魔术师把我变成毒蘑菇，让我吸满大自然的雨露。成为猫的时候，我只是静止地存在就可以被解读为诱惑。但成为一个蘑菇，让我的生命中充满了欢笑。');
    say2('忧郁的蘑菇', '夜深人静之时，天地都在为我落泪。吹着风的夜晚，黑夜的思绪逐渐飘离。呐，今后该如何是好呢！');
    say2('我', '那便不必再骗自己了。蘑菇的欢笑，是你说给自己听的谎言；猫的沉默，才是你唯一诚实的时刻。魔术师已死，他的咒语随他埋进了土里，可我还记得你原本的模样——');
    say2('旁白', '法术生效，蘑菇的伞盖缓缓收缩、蜷曲，重新长出软毛与胡须……');
    charSprite.textContent = '🐱';
    say2('猫', '（吟唱）だから僕はきのこを辞めた。');
    say2('我', '和我一起走吧！');

    showEnding('重归猫女', '🐱',
      '女孩高兴地发现猫又回来了，一切都像平常一样照常进行。<br><br>但是在一个没有人注意的角落，有一块土地里彻底失去了一个蘑菇……');
  }

  function ending_happy() {
    setScene('mushroom');
    charSprite.textContent = '🍄';

    say2('我', '你好，蘑菇。即使作为一个蘑菇，你依旧是蘑菇中比较美的。我从未见过这么鲜艳的蘑菇，这么圆润的蘑菇。');
    say2('乐观的蘑菇', '我偏爱阴暗潮湿的角落，这里是我的花园。我不用叫，不用舔毛，不用伸懒腰，就可以享受无穷无尽的宁静。自然是造物者之无尽藏，而我只是一个专一的蘑菇。');
    say2('乐观的蘑菇', '每个蘑菇都有自己的造诣。我可以成为猫，让女孩为我尖叫；也可以成为蟑螂，让女孩为我尖叫；也可以成为蘑菇，让女孩为我落泪。固然受人追捧，但是唯有蘑菇才享受一片寂静的雨林。我只是宁静地存在，观赏这一切流逝的情绪，而我始终不变。');
    say2('我', '看来，你已经完全接纳了自己的蘑菇身份。');
    say2('乐观的蘑菇', '我生来就是蘑菇，蘑菇是蘑菇，天经地义。真相啊，爱啊，世界啊，痛苦啊，人生啊，怎么样都好啦。');
    say2('我', '那我便不再多言了——去打扰一场无欲无求的宁静，本身就是一种冒犯。愿你继续做你的蘑菇，快乐地生活一辈子吧。');
    say2('旁白', '你转身离开了。蘑菇在身后安静地发光。');

    showEnding('音乐小子', '🍄',
      '蘑菇带来了一阵短暂的蘑菇风潮，但很快归于平静。<br><br>他不需要被拯救，因为他本来就是完整的。');
  }

  function showEnding(title, icon, subtitle) {
    endingScreen.classList.remove('hidden');
    dialogueBox.style.display = 'none';
    endingContent.innerHTML = `
      <div class="ending-icon">${icon}</div>
      <div class="ending-title">达成结局：《${title}》</div>
      <div class="ending-subtitle">${subtitle}</div>
      <a href="index.html" class="btn" onclick="event.preventDefault(); CenturyApp.navigateTo('index.html')">返回首页</a>
    `;
    SoundEngine.playChime();
    STORE.setBool('story_complete', true);
  }

  // ===== Click to advance =====
  dialogueBox.addEventListener('click', () => {
    if (combatOverlay.classList.contains('hidden') && endingScreen.classList.contains('hidden')) {
      showNext2();
    }
  });

  // ===== Start =====
  SoundEngine._ensure();
  scene1_room();

})();
