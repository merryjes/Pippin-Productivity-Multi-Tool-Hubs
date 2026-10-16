/**
 * PIPPIN COZY STUDY DESKTOP
 * Workspace + Floating Companion Engine
 * KEY FIX: deadline-based timer (drift-free, survives background-tab throttling)
 */

// =============================================================================
// GLOBAL STATE
// =============================================================================
let appItems = JSON.parse(localStorage.getItem('pippin_items')) || [
    { id: 1, type: 'note', title: 'Welcome Note', body: 'Explore your cozy matcha & chocolate sanctuary!', isPinned: true, timestamp: Date.now(), folder: 'notes' }
];
let calendarEvents = JSON.parse(localStorage.getItem('pippin_cal_events')) || {};

let totalSeconds = 25 * 60;      // remaining seconds (single source of truth)
let initialSeconds = 25 * 60;    // what Reset restores
let timerInterval = null;
let timerDeadline = null;        // Date.now()-based -> no drift, no tab-throttle stall
let isRunning = false;

const mascotAssets = ['assets/pippinchill.png', 'assets/pippinnerd.png', 'assets/pippinsad.png', 'assets/pippindawg.png'];
let currentMascotIndex = 0;

let companionState = {
    isLocked: false, activeTool: null, isMultiHubOpen: false,
    isPipActive: false, pipWindow: null, isInTabFallback: false,
    floatImageData: null,
    calcExpression: '0', calcFormula: '',
    calcHistory: JSON.parse(localStorage.getItem('pippin_calc_history')) || [],
    currentListItems: [], listStyle: 'bullet',
    drawColor: '#4a2c1d', isDrawing: false
};

// =============================================================================
// CROSS-DOCUMENT HELPERS (widget lives in the PiP document while floating)
// =============================================================================
function getDoc() {
    return (companionState.isPipActive && companionState.pipWindow)
        ? companionState.pipWindow.document : document;
}
function getEl(id) { return getDoc().getElementById(id); }
function companionRoot() { return getEl('pippin-floating-companion'); }

// =============================================================================
// INIT
// =============================================================================
window.addEventListener('DOMContentLoaded', () => {
    initSplashScreen();
    updateLiveDateTime();
    setInterval(updateLiveDateTime, 1000);
    generateSmallCalendar();
    renderAllHubs();
    checkTrashExpiry();
    initCompanionDragging();
    initCompanion8WayResizing();
    initCompanionCanvas();
    initCompanionIdleFade();
    initGlobalShortcuts();
    updateAllTimerDisplays();
    updatePlayButtonUI();
});

function saveToLocalStorage() {
    localStorage.setItem('pippin_items', JSON.stringify(appItems));
    localStorage.setItem('pippin_cal_events', JSON.stringify(calendarEvents));
    localStorage.setItem('pippin_calc_history', JSON.stringify(companionState.calcHistory));
    renderAllHubs();
    generateSmallCalendar();
}

// =============================================================================
// 1. SPLASH & CLOCK (base + widget)
// =============================================================================
function initSplashScreen() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const welcomeContent = document.querySelector('.welcome-content');
    setTimeout(() => { if (welcomeContent) welcomeContent.classList.add('text-in'); }, 300);
    setTimeout(() => {
        if (welcomeContent) welcomeContent.classList.add('text-out');
        if (welcomeScreen) welcomeScreen.classList.add('fade-out-bg');
    }, 2400);
}

function updateLiveDateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    const dtWidget = document.getElementById('live-datetime');
    if (dtWidget) dtWidget.textContent = `${dateStr} | ${timeStr}`;
    const fDate = getEl('floating-live-date');
    if (fDate) fDate.textContent = `${dateStr} | ${timeStr}`;
}

// =============================================================================
// 2. SIDEBAR
// =============================================================================
window.toggleTaskbarTab = function (tabName, event) {
    const panels = document.querySelectorAll('.taskbar-dropdown-panel');
    const tabs = document.querySelectorAll('.taskbar-tab');
    const targetPanel = document.getElementById(`panel-${tabName}`);
    const isAlreadyOpen = targetPanel ? targetPanel.classList.contains('open') : false;
    panels.forEach(p => p.classList.remove('open'));
    tabs.forEach(t => t.classList.remove('active'));
    if (!isAlreadyOpen && targetPanel) {
        targetPanel.classList.add('open');
        if (event && event.currentTarget) event.currentTarget.classList.add('active');
    }
};
window.closeDropdownPanel = function () {
    document.querySelectorAll('.taskbar-dropdown-panel').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.taskbar-tab').forEach(t => t.classList.remove('active'));
};

// =============================================================================
// 3. CALENDAR & REMINDERS
// =============================================================================
let selectedCalDateDay = null;

function generateSmallCalendar() {
    const grid = document.getElementById('small-cal-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 31; i++) {
        const div = document.createElement('div');
        div.className = `small-cal-cell ${calendarEvents[i] ? 'event-pinned' : ''}`;
        div.textContent = i;
        div.onclick = () => openCalendarDateModal(i);
        grid.appendChild(div);
    }
}

function openCalendarDateModal(day) {
    selectedCalDateDay = day;
    const modal = document.getElementById('calendar-date-modal');
    document.getElementById('cal-date-modal-title').textContent = `October ${day}, 2026`;
    const existing = calendarEvents[day];
    document.getElementById('cal-event-text').value = existing ? existing.text : '';
    document.getElementById('cal-pin-checkbox').checked = existing ? existing.isPinned : false;
    document.getElementById('cal-reminder-checkbox').checked = false;
    if (modal) modal.classList.add('open');
}

window.closeCalendarModal = function () {
    const modal = document.getElementById('calendar-date-modal');
    if (modal) modal.classList.remove('open');
};

window.saveCalendarEvent = function () {
    const text = document.getElementById('cal-event-text').value.trim();
    const isPinned = document.getElementById('cal-pin-checkbox').checked;
    const isReminder = document.getElementById('cal-reminder-checkbox').checked;
    if (text) {
        calendarEvents[selectedCalDateDay] = { text: text, isPinned: isPinned };
        if (isReminder) {
            appItems.push({ id: Date.now(), type: 'reminder', title: `Oct ${selectedCalDateDay} Reminder`,
                body: text, isPinned: isPinned, timestamp: Date.now(), folder: 'reminders' });
        }
        saveToLocalStorage();
    } else {
        delete calendarEvents[selectedCalDateDay];
        saveToLocalStorage();
    }
    closeCalendarModal();
};

window.openAddReminderModal = function () { openNoteModal('reminder'); };

// =============================================================================
// 4. STORAGE & HUBS
// =============================================================================
function renderAllHubs() {
    const notesGrid = document.getElementById('notes-grid');
    const remindersGrid = document.getElementById('reminders-grid');
    const archiveGrid = document.getElementById('archive-grid');
    const trashGrid = document.getElementById('trash-grid');
    if (notesGrid) notesGrid.innerHTML = '';
    if (remindersGrid) remindersGrid.innerHTML = '';
    if (archiveGrid) archiveGrid.innerHTML = '';
    if (trashGrid) trashGrid.innerHTML = '';

appItems.sort((a, b) => b.isPinned - a.isPinned);

appItems.forEach(item => {
        const card = document.createElement('div');
        card.className = `workspace-card ${item.isPinned ? 'pinned' : ''}`;
        let contentDisplay = escapeHtml(item.body);
        if (item.type === 'image' && item.imageData) {
            contentDisplay = `<img src="${item.imageData}" style="max-width:100%; border-radius:8px; margin-bottom:6px;"><br>${escapeHtml(item.body)}`;
        } else if (item.type === 'drawing' && item.drawingData) {
            contentDisplay = `<img src="${item.drawingData}" style="max-width:100%; border-radius:8px; background:#fff; margin-bottom:6px;"><br>${escapeHtml(item.body)}`;
        }
        card.innerHTML = `
            <div style="flex:1;">
                <div class="card-title-text">${escapeHtml(item.title || 'Untitled')}</div>
                <div class="card-body-text">${contentDisplay}</div>
            </div>
            <div style="display:flex; gap:6px; margin-top:6px;">
                ${item.folder !== 'trash' ? `
                    <button class="pomo-btn" style="font-size:0.65rem; padding:2px 8px;" onclick="openEditNoteModal(${item.id})">Edit</button>
                    <button class="pomo-btn" style="font-size:0.65rem; padding:2px 8px;" onclick="moveToFolder(${item.id}, 'trash')">Trash</button>
                ` : `<button class="pomo-btn" style="font-size:0.65rem; padding:2px 8px;" onclick="restoreItem(${item.id})">Restore</button>`}
            </div>
        `;
        if (item.folder === 'notes' && notesGrid) notesGrid.appendChild(card);
        else if (item.folder === 'reminders' && remindersGrid) remindersGrid.appendChild(card);
        else if (item.folder === 'archive' && archiveGrid) archiveGrid.appendChild(card);
        else if (item.folder === 'trash' && trashGrid) trashGrid.appendChild(card);
    });
}

window.moveToFolder = function (id, targetFolder) {
    const item = appItems.find(i => i.id === id);
    if (item) { item.folder = targetFolder; if (targetFolder === 'trash') item.deletedAt = Date.now(); saveToLocalStorage(); }
};
window.restoreItem = function (id) {
    const item = appItems.find(i => i.id === id);
    if (item) { item.folder = 'notes'; delete item.deletedAt; saveToLocalStorage(); }
};
function checkTrashExpiry() {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    appItems = appItems.filter(item => {
        if (item.folder === 'trash' && item.deletedAt) return (now - item.deletedAt) < sevenDaysMs;
        return true;
    });
    saveToLocalStorage();
}
window.emptyTrashNow = function () {
    appItems = appItems.filter(item => item.folder !== 'trash');
    saveToLocalStorage();
};

// =============================================================================
// 5. BASE FAM & PAPER MODALS
// =============================================================================
const famMainBtn = document.getElementById('fam-main-btn');
const radialOptions = document.getElementById('radial-options');
if (famMainBtn) famMainBtn.addEventListener('click', () => radialOptions.classList.toggle('open'));

let currentNoteType = 'note';
let editingNoteId = null;
let currentListType = 'bullet';
let uploadedImageData = null;
let baseCanvasContext = null;
let isBaseDrawing = false;
let currentBaseCanvasTool = 'marker';

window.openNoteModal = function (type) {
    currentNoteType = type;
    editingNoteId = null;
    uploadedImageData = null;
    if (radialOptions) radialOptions.classList.remove('open');
    const padContainer = document.getElementById('writing-pad-container');
    if (padContainer) padContainer.className = `paper-writing-pad ${(type === 'drawing' || type === 'calculator') ? 'plain-canvas' : ''}`;
    const paperModal = document.getElementById('paper-modal');
    if (paperModal) paperModal.classList.add('open');
    const titleElem = document.getElementById('modal-title');
    if (titleElem) titleElem.textContent = `Create ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const pinCheck = document.getElementById('pad-pin-checkbox');
    if (pinCheck) pinCheck.checked = false;
    const padBody = document.getElementById('pad-body-content');
    if (!padBody) return;

if (type === 'note' || type === 'text' || type === 'reminder') {
        padBody.innerHTML = `
            <input type="text" class="pad-input" id="note-title" placeholder="Title..." style="font-weight:bold; margin-bottom:10px;">
            <textarea class="pad-textarea" id="note-body" placeholder="Write here..."></textarea>`;
    } else if (type === 'list') {
        padBody.innerHTML = `
            <input type="text" class="pad-input" id="note-title" placeholder="List Title..." style="font-weight:bold; margin-bottom:10px;">
            <div class="list-type-selector">
                <button type="button" class="list-type-btn active" id="btn-list-bullet" onclick="setListType('bullet')">• Bullets</button>
                <button type="button" class="list-type-btn" id="btn-list-number" onclick="setListType('number')">1. Numbered</button>
            </div>
            <div class="list-items-container" id="list-items-box">
                <div class="list-item-row">
                    <span class="list-bullet-prefix" id="prefix-0">•</span>
                    <input type="text" class="list-item-input" placeholder="Item 1..." onkeydown="handleListEnter(event, 0)">
                </div>
            </div>
            <button type="button" class="pomo-btn" style="font-size:0.75rem; padding:4px 12px; margin-top:10px;" onclick="addListItemRow()">+ Add Item</button>`;
    } else if (type === 'image') {
        padBody.innerHTML = `
            <input type="text" class="pad-input" id="note-title" placeholder="Image Title..." style="font-weight:bold; margin-bottom:10px;">
            <div class="image-upload-dropzone" onclick="document.getElementById('file-input').click()">
                <div id="image-preview-area">Click to Select / Upload Photo from Storage</div>
                <input type="file" id="file-input" accept="image/*" style="display:none;" onchange="handleImageUpload(event)">
            </div>
            <textarea class="pad-textarea" id="note-body" placeholder="Add notes or caption for this image..."></textarea>`;
    } else if (type === 'calculator') {
        padBody.innerHTML = `
            <div class="calc-screen">
                <div class="calc-formula" id="fcalc-formula">&nbsp;</div>
                <div class="calc-value" id="fcalc-display">0</div>
            </div>
            <div class="calc-keys">
                <button type="button" class="calc-btn btn-clear" onclick="fcalcClear()">C</button>
                <button type="button" class="calc-btn btn-del" onclick="fcalcDelete()">DEL</button>
                <button type="button" class="calc-btn btn-op" onclick="fcalcOp('/')">÷</button>
                <button type="button" class="calc-btn btn-op" onclick="fcalcOp('*')">×</button>
                <button type="button" class="calc-btn btn-num" onclick="fcalcNum('7')">7</button>
                <button type="button" class="calc-btn btn-num" onclick="fcalcNum('8')">8</button>
                <button type="button" class="calc-btn btn-num" onclick="fcalcNum('9')">9</button>
                <button type="button" class="calc-btn btn-op" onclick="fcalcOp('-')">-</button>
                <button type="button" class="calc-btn btn-num" onclick="fcalcNum('4')">4</button>
                <button type="button" class="calc-btn btn-num" onclick="fcalcNum('5')">5</button>
                <button type="button" class="calc-btn btn-num" onclick="fcalcNum('6')">6</button>
                <button type="button" class="calc-btn btn-op" onclick="fcalcOp('+')">+</button>
                <button type="button" class="calc-btn btn-num" onclick="fcalcNum('1')">1</button>
                <button type="button" class="calc-btn btn-num" onclick="fcalcNum('2')">2</button>
                <button type="button" class="calc-btn btn-num" onclick="fcalcNum('3')">3</button>
                <button type="button" class="calc-btn btn-equals" onclick="fcalcEqual()">=</button>
                <button type="button" class="calc-btn btn-num zero-btn" onclick="fcalcNum('0')">0</button>
                <button type="button" class="calc-btn btn-num" onclick="fcalcNum('.')">.</button>
            </div>
            <div class="calc-history-box">
                <div class="history-header"><h3>History</h3>
                    <div class="history-actions-row"><button type="button" class="btn-hist-small" onclick="clearCalculationHistory()">Clear</button></div>
                </div>
                <div class="calc-history-list" id="fcalc-history-list"></div>
            </div>`;
        renderCalcHistoryUI();
    } else if (type === 'drawing') {
        padBody.innerHTML = `
            <input type="text" class="pad-input" id="note-title" placeholder="Drawing Title..." style="font-weight:bold; margin-bottom:8px;">
            <div class="canvas-wrapper">
                <canvas id="drawing-canvas" width="400" height="200" class="drawing-canvas"></canvas>
                <div class="canvas-toolbar">
                    <button type="button" class="canvas-tool-btn active" id="tool-marker" onclick="setBaseCanvasTool('marker')">Marker</button>
                    <button type="button" class="canvas-tool-btn" id="tool-eraser" onclick="setBaseCanvasTool('eraser')">Eraser</button>
                    <button type="button" class="canvas-tool-btn" onclick="clearBaseCanvas()">Clear</button>
                </div>
            </div>
            <textarea class="pad-textarea" id="note-body" placeholder="Notes about this drawing..." style="margin-top:8px;"></textarea>`;
        setTimeout(initBaseCanvas, 100);
    }
};

window.setListType = function (type) {
    currentListType = type;
    document.getElementById('btn-list-bullet').classList.toggle('active', type === 'bullet');
    document.getElementById('btn-list-number').classList.toggle('active', type === 'number');
    document.querySelectorAll('.list-bullet-prefix').forEach((p, idx) => {
        p.textContent = type === 'bullet' ? '•' : `${idx + 1}.`;
    });
};

window.addListItemRow = function () {
    const box = document.getElementById('list-items-box');
    if (!box) return;
    const idx = box.children.length;
    const row = document.createElement('div');
    row.className = 'list-item-row';
    const prefix = currentListType === 'bullet' ? '•' : `${idx + 1}.`;
    row.innerHTML = `
        <span class="list-bullet-prefix">${prefix}</span>
        <input type="text" class="list-item-input" placeholder="Item ${idx + 1}..." onkeydown="handleListEnter(event, ${idx})">`;
    box.appendChild(row);
    row.querySelector('input').focus();
};

window.handleListEnter = function (e, idx) { if (e.key === 'Enter') { e.preventDefault(); addListItemRow(); } };

window.handleImageUpload = function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            uploadedImageData = evt.target.result;
            const area = document.getElementById('image-preview-area');
            if (area) area.innerHTML = `<img src="${uploadedImageData}" class="image-preview-img">`;
        };
        reader.readAsDataURL(file);
    }
};

function initBaseCanvas() {
    const canvas = document.getElementById('drawing-canvas');
    if (!canvas) return;
    baseCanvasContext = canvas.getContext('2d');
    baseCanvasContext.lineCap = 'round';
    baseCanvasContext.lineJoin = 'round';
    baseCanvasContext.lineWidth = 3;
    canvas.onmousedown = (e) => { isBaseDrawing = true; drawBaseCanvas(e); };
    canvas.onmousemove = (e) => { drawBaseCanvas(e); };
    canvas.onmouseup = () => { isBaseDrawing = false; baseCanvasContext.beginPath(); };
    canvas.onmouseleave = () => { isBaseDrawing = false; baseCanvasContext.beginPath(); };
}

function drawBaseCanvas(e) {
    if (!isBaseDrawing || !baseCanvasContext) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (currentBaseCanvasTool === 'eraser') { baseCanvasContext.strokeStyle = '#ffffff'; baseCanvasContext.lineWidth = 16; }
    else { baseCanvasContext.strokeStyle = '#5c3d2e'; baseCanvasContext.lineWidth = 3; }
    baseCanvasContext.lineTo(x, y);
    baseCanvasContext.stroke();
    baseCanvasContext.beginPath();
    baseCanvasContext.moveTo(x, y);
}

window.setBaseCanvasTool = function (tool) {
    currentBaseCanvasTool = tool;
    const marker = document.getElementById('tool-marker');
    const eraser = document.getElementById('tool-eraser');
    if (marker) marker.classList.toggle('active', tool === 'marker');
    if (eraser) eraser.classList.toggle('active', tool === 'eraser');
};
window.clearBaseCanvas = function () {
    const canvas = document.getElementById('drawing-canvas');
    if (baseCanvasContext && canvas) baseCanvasContext.clearRect(0, 0, canvas.width, canvas.height);
};

window.openEditNoteModal = function (id) {
    const item = appItems.find(i => i.id === id);
    if (!item) return;
    editingNoteId = id;
    currentNoteType = item.type;
    document.getElementById('paper-modal').classList.add('open');
    document.getElementById('modal-title').textContent = 'Edit Item';
    document.getElementById('pad-pin-checkbox').checked = item.isPinned;
    document.getElementById('pad-body-content').innerHTML = `
        <input type="text" class="pad-input" id="note-title" value="${escapeHtml(item.title || '')}" placeholder="Title..." style="font-weight:bold; margin-bottom:10px;">
        <textarea class="pad-textarea" id="note-body" placeholder="Write here...">${escapeHtml(item.body || '')}</textarea>`;
};

window.closeNoteModal = function () {
    const modal = document.getElementById('paper-modal');
    if (modal) modal.classList.remove('open');
    editingNoteId = null;
};

window.savePaperNote = function () {
    if (currentNoteType === 'calculator') { closeNoteModal(); return; }
    const title = document.getElementById('note-title')?.value || 'Untitled';
    let body = document.getElementById('note-body')?.value || '';
    const isPinned = document.getElementById('pad-pin-checkbox')?.checked || false;

if (currentNoteType === 'list') {
        const inputs = document.querySelectorAll('.list-item-input');
        const listItems = [];
        inputs.forEach((inp, idx) => {
            if (inp.value.trim()) {
                const prefix = currentListType === 'bullet' ? '•' : `${idx + 1}.`;
                listItems.push(`${prefix} ${escapeHtml(inp.value.trim())}`);
            }
        });
        body = listItems.join('<br>');
    }
    let drawingData = null;
    if (currentNoteType === 'drawing') {
        const canvas = document.getElementById('drawing-canvas');
        if (canvas) drawingData = canvas.toDataURL();
    }
    const targetFolder = (currentNoteType === 'reminder') ? 'reminders' : 'notes';

if (editingNoteId !== null) {
        const item = appItems.find(i => i.id === editingNoteId);
        if (item) {
            item.title = title; item.body = body; item.isPinned = isPinned;
            if (uploadedImageData) item.imageData = uploadedImageData;
            if (drawingData) item.drawingData = drawingData;
        }
    } else {
        appItems.push({ id: Date.now(), type: currentNoteType, title, body,
            imageData: uploadedImageData, drawingData: drawingData,
            isPinned, timestamp: Date.now(), folder: targetFolder });
    }
    saveToLocalStorage();
    closeNoteModal();
};

window.discardPaperNote = function () {
    if (editingNoteId !== null) { appItems = appItems.filter(i => i.id !== editingNoteId); saveToLocalStorage(); }
    closeNoteModal();
};
window.sharePaperNote = function () { alert("Note copied to clipboard for sharing!"); };

// =============================================================================
// 6. TIMER ENGINE — DEADLINE-BASED (the core fix)
// =============================================================================
function updateAllTimerDisplays() {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const baseTimer = document.getElementById('timer');
    if (baseTimer) baseTimer.textContent = timeFormatted;
    const compTimer = getEl('companion-timer-display');
    if (compTimer) compTimer.textContent = timeFormatted;
    document.title = `${timeFormatted} - Pippin Cozy Study Desktop`;
    const urgent = isRunning && totalSeconds > 0 && totalSeconds <= 10;
    if (baseTimer) baseTimer.classList.toggle('timer-urgent', urgent);
    if (compTimer) compTimer.classList.toggle('timer-urgent', urgent);
}

function setAllMascots(src) {
    const baseMascot = document.getElementById('mascot-img');
    if (baseMascot) baseMascot.src = src;
    getDoc().querySelectorAll('.companion-mascot-img').forEach(m => { m.src = src; });
}

/* STATIC mascot: expression changes by image swap ONLY — no motion */
function updateMascotEmotion(state) {
    let src = 'assets/pippinchill.png';
    if (state === 'focus' || state === 'start') src = 'assets/pippinnerd.png';   // study face
    else if (state === 'pause' || state === 'stop') src = 'assets/pippinsad.png'; // sad face
    else if (state === 'completed') src = 'assets/pippindawg.png';                // happy face
    setAllMascots(src);
}

window.cycleMascotImage = function () {
    currentMascotIndex = (currentMascotIndex + 1) % mascotAssets.length;
    setAllMascots(mascotAssets[currentMascotIndex]);
};

function updatePlayButtonUI() {
    const icon = getEl('companion-play-icon');
    const label = getEl('play-btn-label');
    if (icon) icon.textContent = isRunning ? '❚❚' : '▶';
    if (label) label.textContent = isRunning ? 'Pause' : 'Start';
}

window.toggleTimerRunning = function () { if (isRunning) pauseTimer(); else startTimer(); };

window.startTimer = function () {
    if (isRunning) return;
    if (totalSeconds <= 0) totalSeconds = initialSeconds;
    timerDeadline = Date.now() + totalSeconds * 1000;   // wall-clock anchor: no drift, survives tab throttling
    isRunning = true;
    updateMascotEmotion('focus');
    updatePlayButtonUI();
    timerInterval = setInterval(() => {
        totalSeconds = Math.max(0, Math.round((timerDeadline - Date.now()) / 1000));
        updateAllTimerDisplays();
        if (totalSeconds <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            timerDeadline = null;
            updateMascotEmotion('completed');
            updatePlayButtonUI();
            alert("Session completed successfully!");
        }
    }, 250);
};

window.pauseTimer = function () {
    if (!isRunning) return;
    totalSeconds = Math.max(0, Math.round((timerDeadline - Date.now()) / 1000));
    clearInterval(timerInterval);
    isRunning = false;
    timerDeadline = null;
    updateMascotEmotion('pause');
    updatePlayButtonUI();
    updateAllTimerDisplays();
};

window.resetTimer = function () {
    clearInterval(timerInterval);
    isRunning = false;
    timerDeadline = null;
    totalSeconds = initialSeconds;
    updateMascotEmotion('idle');
    updateAllTimerDisplays();
    updatePlayButtonUI();
};

window.restartTimer = function () {
    clearInterval(timerInterval);
    isRunning = false;
    timerDeadline = null;
    totalSeconds = initialSeconds;
    updateAllTimerDisplays();
    startTimer();
};

window.setMode = function (minutes, message, buttonElement) {
    clearInterval(timerInterval);
    isRunning = false;
    timerDeadline = null;
    totalSeconds = minutes * 60;
    initialSeconds = minutes * 60;
    updateMascotEmotion('idle');
    updateAllTimerDisplays();
    updatePlayButtonUI();
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = message;
    const compMode = getEl('companion-mode-text');
    if (compMode) compMode.textContent = message;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    if (buttonElement) buttonElement.classList.add('active');
};


// Base timer click-to-edit
const baseTimerDisplay = document.getElementById('timer');
const inputContainer = document.getElementById('input-container');
const controlsContainer = document.getElementById('controls-container');
const inputHours = document.getElementById('input-hours');
const inputMinutes = document.getElementById('input-minutes');
const inputSeconds = document.getElementById('input-seconds');
const saveTimeBtn = document.getElementById('save-time-btn');

if (baseTimerDisplay) {
    baseTimerDisplay.addEventListener('click', () => {
        if (isRunning) return;
        inputHours.value = Math.floor(totalSeconds / 3600);
        inputMinutes.value = Math.floor((totalSeconds % 3600) / 60);
        inputSeconds.value = totalSeconds % 60;
        baseTimerDisplay.style.display = 'none';
        if (controlsContainer) controlsContainer.style.display = 'none';
        if (inputContainer) inputContainer.classList.add('active');
    });
}
if (saveTimeBtn) {
    saveTimeBtn.addEventListener('click', () => {
        const h = parseInt(inputHours.value, 10) || 0;
        const m = parseInt(inputMinutes.value, 10) || 0;
        const s = parseInt(inputSeconds.value, 10) || 0;
        totalSeconds = (h * 3600) + (m * 60) + s;
        initialSeconds = totalSeconds;
        updateAllTimerDisplays();
        if (inputContainer) inputContainer.classList.remove('active');
        baseTimerDisplay.style.display = 'block';
        if (controlsContainer) controlsContainer.style.display = 'flex';
    });
}

// =============================================================================
// 7. COMPANION CONTROLLER
// =============================================================================
window.enableFloatingTimeEdit = function () {
    if (isRunning) return;
    const box = getEl('companion-time-edit-box');
    const display = getEl('companion-timer-display');
    if (!box || !display) return;
    display.style.display = 'none';
    box.classList.add('active');
    getEl('floating-input-h').value = Math.floor(totalSeconds / 3600);
    getEl('floating-input-m').value = Math.floor((totalSeconds % 3600) / 60);
    getEl('floating-input-s').value = totalSeconds % 60;
};

window.saveFloatingTimeEdit = function () {
    const h = parseInt(getEl('floating-input-h').value, 10) || 0;
    const m = parseInt(getEl('floating-input-m').value, 10) || 0;
    const s = parseInt(getEl('floating-input-s').value, 10) || 0;
    totalSeconds = Math.max(1, (h * 3600) + (m * 60) + s);
    initialSeconds = totalSeconds;
    updateAllTimerDisplays();
    cancelFloatingTimeEdit();
};

window.cancelFloatingTimeEdit = function () {
    const box = getEl('companion-time-edit-box');
    const display = getEl('companion-timer-display');
    if (box) box.classList.remove('active');
    if (display) display.style.display = 'block';
};

window.closeCompanion = function () {
    if (companionState.isPipActive && companionState.pipWindow) companionState.pipWindow.close();
    else {
        const c = companionRoot();
        if (c) c.style.display = 'none';
        companionState.isInTabFallback = false;
    }
};

window.toggleCompanionLock = function () {
    companionState.isLocked = !companionState.isLocked;
    const c = companionRoot();
    if (!c) return;
    c.classList.toggle('mode-locked', companionState.isLocked);
    c.classList.toggle('mode-unlocked', !companionState.isLocked);
    const btn = getEl('companion-lock-btn');
    if (btn) btn.textContent = companionState.isLocked ? 'Unlock' : 'Lock';
    armCompanionIdle();
};

let idleFadeTimer = null;
function armCompanionIdle() {
    const c = companionRoot();
    if (!c) return;
    clearTimeout(idleFadeTimer);
    c.classList.remove('companion-idle');
    if (!companionState.isLocked) {
        idleFadeTimer = setTimeout(() => {
            const root = companionRoot();
            if (root && !companionState.isLocked) root.classList.add('companion-idle');
        }, 5000);
    }
}
function initCompanionIdleFade() {
    const c = document.getElementById('pippin-floating-companion');
    if (!c) return;
    ['pointerenter', 'pointermove', 'pointerdown', 'focusin'].forEach(ev =>
        c.addEventListener(ev, armCompanionIdle, { passive: true }));
}

window.toggleFloatingMultiHub = function () {
    companionState.isMultiHubOpen = !companionState.isMultiHubOpen;
    const wrapper = getEl('companion-multihub-wrapper');
    if (wrapper) wrapper.classList.toggle('open', companionState.isMultiHubOpen);
    const root = companionRoot();
    if (root) root.classList.toggle('hub-open', companionState.isMultiHubOpen); // un-clip the pills
    armCompanionIdle();
};

window.openFloatingTool = function (toolName) {
    companionState.activeTool = toolName;
    companionState.isMultiHubOpen = false;
    const wrapper = getEl('companion-multihub-wrapper');
    if (wrapper) wrapper.classList.remove('open');
    const root = companionRoot();
    if (root) root.classList.remove('hub-open');   // restore scrolling for the tool drawer
    const subWin = getEl('floating-sub-window');
    if (!subWin) return;
    subWin.classList.add('open');
    const titles = { notes:'Notes', lists:'Lists', drawing:'Drawing', image:'Image', calculator:'Calculator', shortcuts:'Shortcuts' };
    const title = getEl('sub-window-title');
    if (title) title.textContent = titles[toolName] || toolName.toUpperCase();
    getDoc().querySelectorAll('.f-tool-view').forEach(v => v.style.display = 'none');
    const view = getEl('ftool-' + toolName);
    if (view) view.style.display = 'flex';
    if (toolName === 'calculator') renderCalcHistoryUI();
    else if (toolName === 'drawing') setTimeout(resizeFloatingCanvas, 80);
    armCompanionIdle();
};

window.closeFloatingSubWindow = function () {
    companionState.activeTool = null;
    const subWin = getEl('floating-sub-window');
    if (subWin) subWin.classList.remove('open');
};


// =============================================================================
// COMPANION TOOLS
// =============================================================================
window.saveFloatingNote = function () {
    const title = getEl('float-note-title')?.value.trim() || 'Untitled';
    const body = getEl('float-note-body')?.value.trim() || '';
    if (!body) { alert('Please enter note text.'); return; }
    appItems.unshift({
        id: Date.now(), type: 'note', title: title, body: body,
        isPinned: false, timestamp: Date.now(), folder: 'notes'
    });
    saveToLocalStorage();
    if (getEl('float-note-title')) getEl('float-note-title').value = '';
    if (getEl('float-note-body')) getEl('float-note-body').value = '';
};

// --- LISTS TOOL ---
window.handleFloatingListEnter = function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addFloatingListItem(); }
};

window.addFloatingListItem = function () {
    const input = getEl('float-new-item-input');
    if (!input || !input.value.trim()) return;
    companionState.currentListItems.push({ id: Date.now(), text: input.value.trim(), done: false });
    input.value = '';
    renderFloatingListRows();
    input.focus();
};

function renderFloatingListRows() {
    const box = getEl('float-list-items-box');
    if (!box) return;
    box.innerHTML = '';
    companionState.currentListItems.forEach((item, idx) => {
        const row = document.createElement('li');
        row.className = 'list-item-row';
        const prefix = companionState.listStyle === 'bullet' ? '•' : `${idx + 1}.`;
        row.innerHTML = `
            <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleFloatingListItemDone(${item.id})">
            <span class="list-bullet-prefix">${prefix}</span>
            <span style="flex:1; font-size:0.8rem; ${item.done ? 'text-decoration:line-through; opacity:0.6;' : ''}">${escapeHtml(item.text)}</span>
            <button type="button" class="btn-item-del" onclick="deleteFloatingListItem(${item.id})">&times;</button>
        `;
        box.appendChild(row);
    });
}

window.toggleFloatingListItemDone = function (id) {
    const item = companionState.currentListItems.find(i => i.id === id);
    if (item) { item.done = !item.done; renderFloatingListRows(); }
};

window.deleteFloatingListItem = function (id) {
    companionState.currentListItems = companionState.currentListItems.filter(i => i.id !== id);
    renderFloatingListRows();
};

// --- DRAWING TOOL ---
let floatCanvasCtx = null;
let lastFX = 0, lastFY = 0;

function initCompanionCanvas() {
    const canvas = document.getElementById('float-drawing-canvas');
    if (!canvas) return;
    floatCanvasCtx = canvas.getContext('2d');
    canvas.addEventListener('pointerdown', (e) => {
        companionState.isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastFX = (e.clientX - rect.left) * (canvas.width / rect.width);
        lastFY = (e.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener('pointermove', (e) => {
        if (!companionState.isDrawing || !floatCanvasCtx) return;
        const rect = canvas.getBoundingClientRect();
        const curX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const curY = (e.clientY - rect.top) * (canvas.height / rect.height);
        floatCanvasCtx.beginPath();
        floatCanvasCtx.moveTo(lastFX, lastFY);
        floatCanvasCtx.lineTo(curX, curY);
        floatCanvasCtx.lineCap = 'round';
        floatCanvasCtx.lineJoin = 'round';
        floatCanvasCtx.strokeStyle = companionState.drawColor;
        floatCanvasCtx.lineWidth = 3;
        floatCanvasCtx.stroke();
        lastFX = curX;
        lastFY = curY;
    });
    window.addEventListener('pointerup', () => { companionState.isDrawing = false; });
}

function resizeFloatingCanvas() {
    const canvas = document.getElementById('float-drawing-canvas');
    if (!canvas || !floatCanvasCtx) return;
    canvas.width = Math.min(380, canvas.parentElement.clientWidth || 360);
    canvas.height = 140;
}

window.setFloatingDrawColor = function (c) { companionState.drawColor = c; };

window.clearFloatingCanvas = function () {
    const canvas = getEl('float-drawing-canvas');
    if (canvas && floatCanvasCtx) floatCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
};

// --- IMAGE TOOL ---
window.triggerFloatImagePick = function () {
    const f = getEl('float-image-file');
    if (f) f.click();
};

window.handleFloatImageUpload = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        companionState.floatImageData = evt.target.result;
        const preview = getEl('float-image-preview');
        if (preview) preview.innerHTML = `<img src="${companionState.floatImageData}" class="image-preview-img">`;
    };
    reader.readAsDataURL(file);
};

window.saveFloatingImage = function () {
    if (!companionState.floatImageData) { alert('Please select an image first.'); return; }
    appItems.unshift({
        id: Date.now(), type: 'image',
        title: getEl('float-image-title')?.value.trim() || 'Untitled Image',
        body: getEl('float-image-caption')?.value.trim() || '',
        imageData: companionState.floatImageData,
        isPinned: false, timestamp: Date.now(), folder: 'notes'
    });
    companionState.floatImageData = null;
    saveToLocalStorage();
    closeFloatingSubWindow();
};

// --- CALCULATOR TOOL ---
window.fcalcNum = function (num) {
    if (companionState.calcExpression === '0') companionState.calcExpression = num;
    else companionState.calcExpression += num;
    updateFCalcDisplay();
};

window.fcalcOp = function (op) {
    const expr = companionState.calcExpression;
    const lastChar = expr.slice(-1);
    if (['+', '-', '*', '/'].includes(lastChar)) companionState.calcExpression = expr.slice(0, -1) + op;
    else companionState.calcExpression += op;
    updateFCalcDisplay();
};

window.fcalcClear = function () {
    companionState.calcExpression = '0';
    companionState.calcFormula = '';
    updateFCalcDisplay();
};

window.fcalcDelete = function () {
    const expr = companionState.calcExpression;
    companionState.calcExpression = expr.length > 1 ? expr.slice(0, -1) : '0';
    updateFCalcDisplay();
};

window.fcalcEqual = function () {
    const expr = companionState.calcExpression;
    try {
        const sanitized = expr.replace(/[^0-9+\-*/.]/g, '');
        const result = Function(`'use strict'; return (${sanitized})`)();
        if (result === undefined || isNaN(result) || !isFinite(result)) {
            companionState.calcFormula = expr + ' =';
            companionState.calcExpression = 'Error';
        } else {
            const resFormatted = String(Math.round(result * 100000000) / 100000000);
            companionState.calcFormula = expr + ' =';
            companionState.calcHistory.unshift({
                id: Date.now(),
                formula: expr.replace(/\*/g, '×').replace(/\//g, '÷'),
                result: resFormatted,
                timestamp: Date.now()
            });
            localStorage.setItem('pippin_calc_history', JSON.stringify(companionState.calcHistory));
            companionState.calcExpression = resFormatted;
            renderCalcHistoryUI();
        }
    } catch (_) {
        companionState.calcExpression = 'Error';
    }
    updateFCalcDisplay();
};

function updateFCalcDisplay() {
    const d = getEl('fcalc-display');
    const f = getEl('fcalc-formula');
    if (d) d.textContent = companionState.calcExpression.replace(/\*/g, '×').replace(/\//g, '÷');
    if (f) f.textContent = companionState.calcFormula || '\u00A0';
}

window.deleteCalcHistoryItem = function (id) {
    companionState.calcHistory = companionState.calcHistory.filter(h => h.id !== id);
    localStorage.setItem('pippin_calc_history', JSON.stringify(companionState.calcHistory));
    renderCalcHistoryUI();
};

window.clearCalculationHistory = function () {
    companionState.calcHistory = [];
    localStorage.setItem('pippin_calc_history', JSON.stringify([]));
    renderCalcHistoryUI();
};

function renderCalcHistoryUI() {
    const list = getEl('fcalc-history-list');
    if (!list) return;
    list.innerHTML = '';
    if (companionState.calcHistory.length === 0) {
        list.innerHTML = '<div style="font-size:0.65rem; color:#7a5c4d; text-align:center; padding:4px;">No history yet.</div>';
        return;
    }
    companionState.calcHistory.forEach(h => {
        const row = document.createElement('div');
        row.className = 'history-item-row';
        row.innerHTML = `
            <span>${escapeHtml(h.formula)} = <strong>${escapeHtml(h.result)}</strong></span>
            <button type="button" class="btn-del-hist" onclick="deleteCalcHistoryItem(${h.id})" title="Delete">✕</button>
        `;
        list.appendChild(row);
    });
}

// =============================================================================
// 8. DRAGGING & 8-DIRECTION RESIZING
// =============================================================================
function initCompanionDragging() {
    const companion = document.getElementById('pippin-floating-companion');
    const handle = document.getElementById('companion-drag-handle');
    if (!companion || !handle) return;
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

handle.addEventListener('pointerdown', (e) => {
        if (companionState.isLocked) return;
        if (e.target.closest('button, input, textarea, select, canvas')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = companion.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        companion.style.bottom = 'auto';
        companion.style.right = 'auto';
        companion.style.left = `${initialLeft}px`;
        companion.style.top = `${initialTop}px`;
        handle.setPointerCapture(e.pointerId);
    });

handle.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        companion.style.left = `${Math.max(0, initialLeft + dx)}px`;
        companion.style.top = `${Math.max(0, initialTop + dy)}px`;
    });

const stopDrag = (e) => {
        if (!isDragging) return;
        isDragging = false;
        try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    handle.addEventListener('pointerup', stopDrag);
    handle.addEventListener('pointercancel', stopDrag);
}

function initCompanion8WayResizing() {
    const companion = document.getElementById('pippin-floating-companion');
    const handles = document.querySelectorAll('.resize-handle');
    if (!companion || !handles.length) return;
    const MIN_W = 300, MIN_H = 150;

handles.forEach(h => {
        h.addEventListener('pointerdown', (e) => {
            if (companionState.isLocked) return;
            e.stopPropagation();
            e.preventDefault();
            const dir = h.getAttribute('data-dir');
            const startX = e.clientX, startY = e.clientY;
            const r0 = companion.getBoundingClientRect();
            h.setPointerCapture(e.pointerId);

const onMove = (ev) => {
                const dx = ev.clientX - startX, dy = ev.clientY - startY;
                let w = r0.width, ht = r0.height, l = r0.left, t = r0.top;
                if (dir.includes('e')) w = Math.max(MIN_W, r0.width + dx);
                if (dir.includes('s')) ht = Math.max(MIN_H, r0.height + dy);
                if (dir.includes('w')) { w = Math.max(MIN_W, r0.width - dx); l = r0.left + (r0.width - w); }
                if (dir.includes('n')) { ht = Math.max(MIN_H, r0.height - dy); t = r0.top + (r0.height - ht); }
                l = Math.min(Math.max(0, l), window.innerWidth - w);
                t = Math.min(Math.max(0, t), window.innerHeight - ht);
                companion.style.width = `${w}px`;
                companion.style.height = `${ht}px`;
                companion.style.left = `${l}px`;
                companion.style.top = `${t}px`;
            };

const onUp = (ev) => {
                try { h.releasePointerCapture(ev.pointerId); } catch (_) {}
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        });
    });
}

// =============================================================================
// 9. ALWAYS-ON-TOP DESKTOP FLOAT (DOCUMENT PICTURE-IN-PICTURE)
// =============================================================================
window.toggleDesktopFloat = async function () {
    if (!('documentPictureInPicture' in window)) {
        alert('Floating over other apps requires Google Chrome or Microsoft Edge (v116+).\n\nShowing widget in-tab instead.');
        const c = document.getElementById('pippin-floating-companion');
        if (c) { c.style.display = 'flex'; companionState.isInTabFallback = true; updateAllTimerDisplays(); }
        return;
    }
    try {
        if (companionState.isPipActive && companionState.pipWindow) { companionState.pipWindow.close(); return; }
        if (companionState.isInTabFallback) {
            const c = document.getElementById('pippin-floating-companion');
            if (c) c.style.display = 'none';
            companionState.isInTabFallback = false;
            return;
        }
        const companion = document.getElementById('pippin-floating-companion');
        if (!companion) return;

// 1. Capture compiled inline handlers BEFORE the node moves realms
        const handlers = new Map();
        companion.querySelectorAll('[onclick],[onkeydown],[onchange]').forEach(el => {
            handlers.set(el, { click: el.onclick, keydown: el.onkeydown, change: el.onchange });
        });

// 2. Open the always-on-top window
        const pipWindow = await window.documentPictureInPicture.requestWindow({ width: 480, height: 240 });
        companionState.pipWindow = pipWindow;
        companionState.isPipActive = true;

// 3. Styles — INCLUDING the hub-open rule so the + menu works in PiP too
        document.querySelectorAll('link[rel="stylesheet"], style').forEach(el =>
            pipWindow.document.head.appendChild(el.cloneNode(true)));
        const pipStyle = pipWindow.document.createElement('style');
        pipStyle.textContent = `
            html, body { margin:0 !important; padding:0 !important; width:100vw !important;
                height:100vh !important; overflow:hidden !important; background:#faf6f0 !important; }
            #pippin-floating-companion { display:flex !important; position:static !important;
                width:100vw !important; height:100vh !important; max-height:100vh !important;
                border:none !important; border-radius:0 !important; box-shadow:none !important;
                padding:3px 6px !important; box-sizing:border-box !important; overflow-y:auto !important; }
            #pippin-floating-companion.hub-open { overflow: visible !important; }
            .resize-handle, .drag-dots { display:none !important; }
        `;
        pipWindow.document.head.appendChild(pipStyle);
        pipWindow.document.title = 'Pippin Study Companion';
        pipWindow.document.body.className = 'pippin-base-body in-pip-mode';

// 4. Delegate clicks/keys/changes back to the MAIN page's functions
        pipWindow.document.addEventListener('click', (e) => {
            let el = e.target && e.target.closest ? e.target.closest('[onclick]') : null;
            while (el) {
                const h = handlers.get(el);
                if (h && h.click) { h.click.call(el, e); return; }
                el = el.parentElement && el.parentElement.closest ? el.parentElement.closest('[onclick]') : null;
            }
        });
        pipWindow.document.addEventListener('keydown', (e) => {
            const el = e.target && e.target.closest ? e.target.closest('[onkeydown]') : null;
            const h = el && handlers.get(el);
            if (h && h.keydown) h.keydown.call(el, e);
        });
        pipWindow.document.addEventListener('change', (e) => {
            const el = e.target && e.target.closest ? e.target.closest('[onchange]') : null;
            const h = el && handlers.get(el);
            if (h && h.change) h.change.call(el, e);
        });

// 5. Space / Esc inside the PiP window
        pipWindow.addEventListener('keydown', (e) => {
            const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
            const isTyping = tag === 'input' || tag === 'textarea';
            if (e.code === 'Space' && !isTyping) { e.preventDefault(); toggleTimerRunning(); }
            if (e.key === 'Escape') {
                if (companionState.isMultiHubOpen) toggleFloatingMultiHub();
                else if (companionState.activeTool) closeFloatingSubWindow();
                else cancelFloatingTimeEdit();
            }
        });

// 6. Move the LIVE node (timer + canvas listeners survive), keep it ticking even if main tab is throttled
        pipWindow.document.body.appendChild(companion);
        companion.style.display = 'flex';
        updateAllTimerDisplays();
        updatePlayButtonUI();
        updateLiveDateTime();
        armCompanionIdle();
        pipWindow.setInterval(() => { if (companionState.isPipActive) updateAllTimerDisplays(); }, 500);

// 7. Restore on close
        pipWindow.addEventListener('pagehide', () => {
            companionState.isPipActive = false;
            companionState.pipWindow = null;
            document.body.appendChild(companion);
            companion.style.display = 'none';
        });
    } catch (err) {
        console.error('Failed to open floating window:', err);
    }
};


// =============================================================================
// 10. GLOBAL KEYBOARD SHORTCUTS
// =============================================================================
function initGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
            document.addEventListener('visibilitychange', () => {
        if (!document.hidden) updateAllTimerDisplays();   // deadline-based: instantly correct
    });

        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const isTyping = activeTag === 'input' || activeTag === 'textarea';

if (e.code === 'Space' && !isTyping) {
            e.preventDefault();
            if (isRunning) pauseTimer(); else startTimer();
            return;
        }

const companionVisible = (companionState.isPipActive || companionState.isInTabFallback);
        if ((e.ctrlKey || e.metaKey) && companionVisible) {
            const key = e.key.toLowerCase();
            if (key === 'k') { e.preventDefault(); openFloatingTool('calculator'); }
            else if (key === 'm') { e.preventDefault(); toggleFloatingMultiHub(); }
        }

if (e.key === 'Escape') {
            if (companionState.isMultiHubOpen) toggleFloatingMultiHub();
            else if (companionState.activeTool) closeFloatingSubWindow();
            else cancelFloatingTimeEdit();
        }
    });
}

// =============================================================================
// HELPER: Escape HTML (must be the LAST function in the file)
// =============================================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
