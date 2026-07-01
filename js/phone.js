/* ============================================
   Century Birthday - Phone Repair JS
   Drag & Drop Assembly Game
   ============================================ */

(function() {
  const { BGM, STORE, SoundEngine } = window.CenturyApp;

  // ===========================================
  // DOM Elements
  // ===========================================
  const parts = document.querySelectorAll('.part');
  const slots = document.querySelectorAll('.part-slot');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const completionEl = document.getElementById('completion');
  const completionTimeEl = document.getElementById('completion-time');

  // ===========================================
  // State
  // ===========================================
  let placedCount = 0;
  const totalParts = parts.length;
  let startTime = Date.now();
  let dragState = null;
  let ghostEl = null;

  // ===========================================
  // Ghost Element
  // ===========================================
  function createGhost(partEl) {
    const ghost = document.createElement('div');
    ghost.className = 'part-ghost';
    ghost.innerHTML = partEl.innerHTML;
    document.body.appendChild(ghost);
    return ghost;
  }

  function removeGhost() {
    if (ghostEl && ghostEl.parentNode) {
      ghostEl.parentNode.removeChild(ghostEl);
    }
    ghostEl = null;
  }

  // ===========================================
  // Drag Logic
  // ===========================================
  function onPointerDown(e) {
    const partEl = e.currentTarget;
    if (partEl.classList.contains('placed')) return;

    e.preventDefault();
    e.stopPropagation();

    dragState = {
      part: partEl,
      partId: partEl.dataset.part,
      startX: e.clientX,
      startY: e.clientY,
      origRect: partEl.getBoundingClientRect(),
    };

    partEl.classList.add('dragging');
    ghostEl = createGhost(partEl);
    moveGhost(e.clientX, e.clientY);

    // Capture pointer for reliable tracking
    partEl.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragState) return;
    e.preventDefault();

    moveGhost(e.clientX, e.clientY);

    // Highlight slots under the ghost
    const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
    slots.forEach(s => s.classList.remove('highlight'));

    if (elemBelow && elemBelow.classList.contains('part-slot')) {
      const slotPartId = elemBelow.dataset.part;
      if (slotPartId === dragState.partId && !elemBelow.classList.contains('filled')) {
        elemBelow.classList.add('highlight');
      }
    }
  }

  function onPointerUp(e) {
    if (!dragState) return;
    e.preventDefault();

    const partEl = dragState.part;
    partEl.classList.remove('dragging');
    slots.forEach(s => s.classList.remove('highlight'));

    // Check drop target
    const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
    let dropped = false;

    if (elemBelow) {
      // Check if over the correct slot
      const slot = elemBelow.classList.contains('part-slot')
        ? elemBelow
        : elemBelow.closest('.part-slot');

      if (slot && slot.dataset.part === dragState.partId && !slot.classList.contains('filled')) {
        // Snap to slot!
        dropped = true;
        placePart(partEl, slot);
      }
    }

    if (!dropped) {
      // Check proximity to any valid slot
      const partRect = ghostEl ? ghostEl.getBoundingClientRect() : null;
      if (partRect) {
        const ghostCenter = {
          x: partRect.left + partRect.width / 2,
          y: partRect.top + partRect.height / 2
        };

        let bestSlot = null;
        let bestDist = Infinity;

        slots.forEach(s => {
          if (s.dataset.part !== dragState.partId) return;
          if (s.classList.contains('filled')) return;

          const slotRect = s.getBoundingClientRect();
          const slotCenter = {
            x: slotRect.left + slotRect.width / 2,
            y: slotRect.top + slotRect.height / 2
          };

          const dist = Math.hypot(ghostCenter.x - slotCenter.x, ghostCenter.y - slotCenter.y);
          if (dist < bestDist) {
            bestDist = dist;
            bestSlot = s;
          }
        });

        // Snap threshold
        if (bestSlot && bestDist < 50) {
          placePart(partEl, bestSlot);
        }
      }
    }

    dragState.part.releasePointerCapture(e.pointerId);
    dragState = null;
    removeGhost();
  }

  function moveGhost(x, y) {
    if (!ghostEl) return;
    ghostEl.style.left = x + 'px';
    ghostEl.style.top = y + 'px';
  }

  // ===========================================
  // Place Part
  // ===========================================
  function placePart(partEl, slot) {
    slot.classList.add('filled');
    partEl.classList.add('placed');

    placedCount++;
    updateProgress();

    SoundEngine.playSnap();

    // Check completion
    if (placedCount >= totalParts) {
      setTimeout(onComplete, 500);
    }
  }

  function updateProgress() {
    const pct = (placedCount / totalParts) * 100;
    progressBar.style.setProperty('--progress', pct + '%');
    progressText.textContent = `${placedCount}/${totalParts}`;
  }

  function onComplete() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    const timeStr = min > 0 ? `${min}分${sec}秒` : `${sec}秒`;

    completionEl.classList.remove('hidden');
    completionTimeEl.textContent = `用时：${timeStr}`;

    // Save
    STORE.setBool('phone_complete', true);
    STORE.set('phone_time', elapsed.toString());

    SoundEngine.playChime();
  }

  // ===========================================
  // Attach Events
  // ===========================================
  parts.forEach(part => {
    part.addEventListener('pointerdown', onPointerDown);
    part.addEventListener('pointermove', onPointerMove);
    part.addEventListener('pointerup', onPointerUp);
    part.addEventListener('pointercancel', onPointerUp);
    // Prevent default drag behavior
    part.addEventListener('dragstart', e => e.preventDefault());
  });

  // Global move/up for when pointer leaves the element
  document.addEventListener('pointermove', (e) => {
    if (!dragState) return;
    onPointerMove(e);
  });

  document.addEventListener('pointerup', (e) => {
    if (!dragState) return;
    onPointerUp(e);
  });

  // ===========================================
  // Init
  // ===========================================
  startTime = Date.now();
  updateProgress();
})();
