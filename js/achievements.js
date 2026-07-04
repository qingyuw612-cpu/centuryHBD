/* ============================================
   Century Birthday - Achievement System
   ============================================ */

(function() {
  const { STORE, SoundEngine } = window.CenturyApp;

  const ACHIEVEMENTS = [
    // === Drum ===
    { id:'drum_S',     emoji:'🥁', text:'灵魂鼓手',   sub:'打鼓获得S级',        check:()=>STORE.get('drum_grade')==='S' },
    { id:'drum_A',     emoji:'🥁', text:'节奏大师',   sub:'打鼓获得A级',        check:()=>STORE.get('drum_grade')==='A' },
    { id:'drum_first', emoji:'🥁', text:'第一次伴奏', sub:'首次完成打鼓',       check:()=>STORE.getBool('drum_complete') },
    { id:'drum_combo', emoji:'🥁', text:'鼓都敲穿了', sub:'连击达到30以上',     check:()=>(STORE.getInt('drum_max_combo')||0)>=30 },
    { id:'drum_5x',    emoji:'🥁', text:'鼓手の执着', sub:'打鼓5次以上',        check:()=>(STORE.getInt('drum_plays')||0)>=5 },
    { id:'drum_10x',   emoji:'🥁', text:'鼓棒冒烟了', sub:'打鼓10次以上',       check:()=>(STORE.getInt('drum_plays')||0)>=10 },

    // === Haircut ===
    { id:'hair_S',      emoji:'✂️', text:'Tony亲传',   sub:'理发获得S级',       check:()=>{var s=STORE.getInt('haircut_score')||0;return s>=360;} },
    { id:'hair_D',      emoji:'✂️', text:'除草机',     sub:'理发获得D级',       check:()=>{var s=STORE.getInt('haircut_score')||0;return s>0&&s<=100;} },
    { id:'hair_first',  emoji:'✂️', text:'第一次上班', sub:'首次完成理发',      check:()=>STORE.getBool('haircut_complete') },
    { id:'hair_insult', emoji:'✂️', text:'顾客已报警', sub:'累计被骂5次以上',   check:()=>(STORE.getInt('haircut_insults')||0)>=5 },
    { id:'hair_insult10',emoji:'✂️',text:'投诉信堆成山',sub:'累计被骂10次以上', check:()=>(STORE.getInt('haircut_insults')||0)>=10 },
    { id:'hair_5x',     emoji:'✂️', text:'敬业精神',   sub:'理发5次以上',       check:()=>(STORE.getInt('haircut_plays')||0)>=5 },

    // === Phone ===
    { id:'phone_S',     emoji:'📱', text:'贴膜仙人',   sub:'贴膜获得S级',       check:()=>{var s=STORE.getInt('phone_score')||0;return s>=180;} },
    { id:'phone_D',     emoji:'📱', text:'气泡收藏家', sub:'贴膜获得D级',       check:()=>{var s=STORE.getInt('phone_score')||0;return s>0&&s<=70;} },
    { id:'phone_first', emoji:'📱', text:'第一次贴膜', sub:'首次完成贴膜',      check:()=>STORE.getBool('phone_complete') },
    { id:'phone_fast',  emoji:'📱', text:'手速惊人',   sub:'排气泡10秒内完成',  check:()=>{var t=STORE.getInt('phone_best_time')||999;return t>0&&t<10;} },
    { id:'phone_5x',    emoji:'📱', text:'贴膜熟练工', sub:'贴膜5次以上',       check:()=>(STORE.getInt('phone_plays')||0)>=5 },

    // === Bodyguard ===
    { id:'bg_S',       emoji:'👁️', text:'零失误',     sub:'上班零镜头事故',    check:()=>{var c=STORE.getInt('bodyguard_camera')||-1;var p=STORE.getInt('bodyguard_plays')||0;return p>0&&c===0;} },
    { id:'bg_first',   emoji:'👁️', text:'第一天上班', sub:'首次完成上班',      check:()=>STORE.getBool('bodyguard_complete') },
    { id:'bg_camera5', emoji:'👁️', text:'小红书素材', sub:'被拍到5次以上',     check:()=>(STORE.getInt('bodyguard_camera')||0)>=5 },
    { id:'bg_caught10',emoji:'👁️', text:'接住了！',   sub:'单局接住比格10个以上',check:()=>(STORE.getInt('bodyguard_caught')||0)>=10 },

    // === Story ===
    { id:'story_cat',  emoji:'🍄', text:'重归猫女',   sub:'达成重归猫女结局',  check:()=>STORE.get('story_ending')==='重归猫女' },
    { id:'story_music',emoji:'🍄', text:'音乐小子',   sub:'达成音乐小子结局',  check:()=>STORE.get('story_ending')==='音乐小子' },
    { id:'story_first',emoji:'🍄', text:'探索者',     sub:'首次完成故事',      check:()=>STORE.getBool('story_complete') },

    // === Meta ===
    { id:'meta_4games',emoji:'🎮', text:'全能选手',   sub:'四个游戏都玩过',    check:()=>STORE.getBool('drum_complete')&&STORE.getBool('phone_complete')&&STORE.getBool('haircut_complete')&&STORE.getBool('bodyguard_complete') },
    { id:'meta_total10',emoji:'🎮',text:'停不下来',   sub:'累计游戏10次以上',  check:()=>{var t=0;['drum','haircut','phone','bodyguard'].forEach(function(g){t+=STORE.getInt(g+'_plays')||0;});return t>=10;} },
    { id:'meta_total25',emoji:'🎮',text:'住在这里了', sub:'累计游戏25次以上',  check:()=>{var t=0;['drum','haircut','phone','bodyguard'].forEach(function(g){t+=STORE.getInt(g+'_plays')||0;});return t>=25;} },
    { id:'meta_midnight',emoji:'🦉',text:'夜猫子',    sub:'凌晨访问',          check:()=>{var h=new Date().getHours();return h>=2&&h<=5;} },
    { id:'meta_sidebar',emoji:'📝',text:'侦察兵',     sub:'查看了侧栏',        check:()=>STORE.getBool('sidebar_opened') },
    { id:'meta_return',emoji:'🔄', text:'回头客',     sub:'第3次回到首页',     check:()=>{var v=STORE.getInt('visit_count')||0;return v>=3;} },
  ];

  // ===== Toast =====
  var toastEl = null;
  var queue = [];
  var showing = false;

  function createToast() {
    if (toastEl) return;
    toastEl = document.createElement('div');
    toastEl.id = 'ach-toast';
    document.body.appendChild(toastEl);
  }

  function showToast(ach) {
    if (!toastEl) createToast();
    queue.push(ach);
    if (!showing) processQueue();
  }

  function processQueue() {
    if (queue.length === 0) { showing = false; return; }
    showing = true;
    var ach = queue.shift();
    toastEl.innerHTML = '<div class="ach-toast-inner"><span class="ach-toast-emoji">'+ach.emoji+'</span><div><div class="ach-toast-title">成就解锁：'+ach.text+'</div><div class="ach-toast-sub">'+ach.sub+'</div></div></div>';
    toastEl.classList.add('show');
    SoundEngine.playChime();
    setTimeout(function() {
      toastEl.classList.remove('show');
      setTimeout(processQueue, 400);
    }, 3000);
  }

  // ===== Check =====
  var checked = {};

  function checkAll() {
    ACHIEVEMENTS.forEach(function(ach) {
      if (checked[ach.id]) return;
      try {
        if (ach.check()) {
          checked[ach.id] = true;
          showToast(ach);
        }
      } catch(e) {}
    });
  }

  // Track visit count
  var visits = (STORE.getInt('visit_count') || 0) + 1;
  STORE.set('visit_count', visits.toString());

  // Track sidebar open
  var sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function() {
      STORE.setBool('sidebar_opened', true);
    });
  }

  // Check periodically and on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(checkAll, 1000); });
  } else {
    setTimeout(checkAll, 1000);
  }
  setInterval(checkAll, 5000);

  // Export
  window.CenturyApp.achievements = { checkAll: checkAll };

})();
