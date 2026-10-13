/**
 * PIPPIN COZY STUDY DESKTOP
 * Complete Base Workspace + Enhanced Floating Companion Engine
 */

// =============================================================================
// GLOBAL SHARED STATE
// =============================================================================
let appItems = JSON.parse(localStorage.getItem('pippin_items')) || [
    { id: 1, type: 'note', title: 'Welcome Note', body: 'Explore your cozy matcha & chocolate sanctuary!', isPinned: true, timestamp: Date.now(), folder: 'notes' }
];

let calendarEvents = JSON.parse(localStorage.getItem('pippin_cal_events')) || {};

// Timer State
let totalSeconds = 25 * 60;
let initialSeconds = 25 * 60;
let timerInterval = null;
let isRunning = false;

// Mascot Assets & Emotion State
const mascotAssets = [
    'assets/pippinchill.png',
    'assets/pippinnerd.png',
    'assets/pippinsad.png',
    'assets/pippindawg.png'
];
let currentMascotIndex = 0;

// Floating Companion State
let companionState = {
    isMiniMode: false,
    isLocked: false,
    currentPreset: 'medium',
    activeTool: null, // 'notes' | 'lists' | 'drawing' | 'calculator' | 'shortcuts' | null
    isMultiHubOpen: false,
    isPipActive: false,
    pipWindow: null,
    // Calculator inside companion
    calcExpression: '0',
    calcFormula: '',
    calcHistory: JSON.parse(localStorage.getItem('pippin_calc_history')) || [],
    // Lists inside companion
    listStyle: 'bullet', // 'bullet' | 'numbered'
    currentListItems: [],
    savedLists: JSON.parse(localStorage.getItem('pippin_saved_lists')) || [],
    // Drawing inside companion
    drawTool: 'marker',
    drawColor: '#4a2c1d',
    isDrawing: false,
    savedDrawings: JSON.parse(localStorage.getItem('pippin_drawings')) || []
};

// =============================================================================
// DOM CONTENT LOADED - INITIALIZE BOTH WORKSPACES
// =============================================================================
window.addEventListener('DOMContentLoaded', () => {
    initSplashScreen();
    updateLiveDateTime();
    setInterval(updateLiveDateTime, 1000);

    generateSmallCalendar();
    renderAllHubs();
    checkTrashExpiry();

    // Initialize Floating Companion Interactions
    initCompanionDragging();
    initCompanion8WayResizing();
    initCompanionCanvas();
    initGlobalShortcuts();

    updateAllTimerDisplays();
    renderCalcHistoryUI();
    renderFloatingListsUI();
    renderFloatingDrawingsGalleryUI();
});

function saveToLocalStorage() {
    localStorage.setItem('pippin_items', JSON.stringify(appItems));
    localStorage.setItem('pippin_cal_events', JSON.stringify(calendarEvents));
    localStorage.setItem('pippin_calc_history', JSON.stringify(companionState.calcHistory));
    localStorage.setItem('pippin_saved_lists', JSON.stringify(companionState.savedLists));
    localStorage.setItem('pippin_drawings', JSON.stringify(companionState.savedDrawings));
    renderAllHubs();
    generateSmallCalendar();
}

// =============================================================================
// 1. CINEMATIC SPLASH SCREEN & LIVE DATE/TIME WIDGET (Base Features)
// =============================================================================
function initSplashScreen() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const welcomeContent = document.querySelector('.welcome-content');
    
    setTimeout(() => {
        if (welcomeContent) welcomeContent.classList.add('text-in');
    }, 300);

    setTimeout(() => {
        if (welcomeContent) welcomeContent.classList.add('text-out');
        if (welcomeScreen) welcomeScreen.classList.add('fade-out-bg');
    }, 2400);
}

function updateLiveDateTime() {
    const now = new Date();
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', optionsDate);
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dtWidget = document.getElementById('live-datetime');
    if (dtWidget) dtWidget.textContent = `${dateStr} | ${timeStr}`;
}

// =============================================================================
// 2. FULL-HEIGHT LEFT SIDEBAR DOCK (Base Features)
// =============================================================================
window.toggleTaskbarTab = function(tabName, event) {
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

window.closeDropdownPanel = function() {
    document.querySelectorAll('.taskbar-dropdown-panel').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.taskbar-tab').forEach(t => t.classList.remove('active'));
};

// =============================================================================
// 3. CALENDAR & REMINDERS (Base Features)
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

window.closeCalendarModal = function() {
    const modal = document.getElementById('calendar-date-modal');
    if (modal) modal.classList.remove('open');
};

window.saveCalendarEvent = function() {
    const text = document.getElementById('cal-event-text').value.trim();
    const isPinned = document.getElementById('cal-pin-checkbox').checked;
    const isReminder = document.getElementById('cal-reminder-checkbox').checked;

    if (text) {
        calendarEvents[selectedCalDateDay] = { text: text, isPinned: isPinned };

        if (isReminder) {
            appItems.push({
                id: Date.now(),
                type: 'reminder',
                title: `Oct ${selectedCalDateDay} Reminder`,
                body: text,
                isPinned: isPinned,
                timestamp: Date.now(),
                folder: 'reminders'
            });
        }
        saveToLocalStorage();
    } else {
        delete calendarEvents[selectedCalDateDay];
        saveToLocalStorage();
    }
    closeCalendarModal();
};

window.openAddReminderModal = function() {
    openNoteModal('reminder');
};

// =============================================================================
// 4. STORAGE & HUB VIEWER (Notes, Tasks, Archive, Trash)
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
        
        let contentDisplay = item.body;
        if (item.type === 'image' && item.imageData) {
            contentDisplay = `<img src="${item.imageData}" style="max-width:100%; border-radius:8px; margin-bottom:6px;"><br>${item.body}`;
        } else if (item.type === 'drawing' && item.drawingData) {
            contentDisplay = `<img src="${item.drawingData}" style="max-width:100%; border-radius:8px; background:#fff; margin-bottom:6px;"><br>${item.body}`;
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

    // Update count in floating notes drawer
    const fnotesCount = document.getElementById('fnotes-count');
    if (fnotesCount) {
        fnotesCount.textContent = appItems.filter(i => i.folder === 'notes').length;
    }
}

window.moveToFolder = function(id, targetFolder) {
    const item = appItems.find(i => i.id === id);
    if (item) {
        item.folder = targetFolder;
        if (targetFolder === 'trash') item.deletedAt = Date.now();
        saveToLocalStorage();
    }
};

window.restoreItem = function(id) {
    const item = appItems.find(i => i.id === id);
    if (item) {
        item.folder = 'notes';
        delete item.deletedAt;
        saveToLocalStorage();
    }
};

function checkTrashExpiry() {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    appItems = appItems.filter(item => {
        if (item.folder === 'trash' && item.deletedAt) {
            return (now - item.deletedAt) < sevenDaysMs;
        }
        return true;
    });
    saveToLocalStorage();
}

window.emptyTrashNow = function() {
    appItems = appItems.filter(item => item.folder !== 'trash');
    saveToLocalStorage();
};

// =============================================================================
// 5. BASE RADIAL FLOATING ACTION MENU & PAPER MODALS (Base Features)
// =============================================================================
const famMainBtn = document.getElementById('fam-main-btn');
const radialOptions = document.getElementById('radial-options');
if (famMainBtn) {
    famMainBtn.addEventListener('click', () => radialOptions.classList.toggle('open'));
}

let currentNoteType = 'note';
let editingNoteId = null;
let currentListType = 'bullet';
let uploadedImageData = null;
let baseCanvasContext = null;
let isBaseDrawing = false;
let currentBaseCanvasTool = 'marker';

window.openNoteModal = function(type) {
    currentNoteType = type;
    editingNoteId = null;
    uploadedImageData = null;
    if (radialOptions) radialOptions.classList.remove('open');
    
    const padContainer = document.getElementById('writing-pad-container');
    if (padContainer) padContainer.className = `paper-writing-pad ${type === 'drawing' ? 'plain-canvas' : ''}`;
    
    const paperModal = document.getElementById('paper-modal');
    if (paperModal) paperModal.classList.add('open');
    
    const titleElem = document.getElementById('modal-title');
    if (titleElem) titleElem.textContent = `Create ${type.toUpperCase()}`;
    
    const pinCheck = document.getElementById('pad-pin-checkbox');
    if (pinCheck) pinCheck.checked = false;
    
    const padBody = document.getElementById('pad-body-content');
    if (!padBody) return;

    if (type === 'note' || type === 'text' || type === 'reminder') {
        padBody.innerHTML = `
            <input type="text" class="pad-input" id="note-title" placeholder="Title..." style="font-weight:bold; margin-bottom:10px;">
            <textarea class="pad-textarea" id="note-body" placeholder="Write here..."></textarea>
        `;
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
            <button type="button" class="pomo-btn" style="font-size:0.75rem; padding:4px 12px; margin-top:10px;" onclick="addListItemRow()">+ Add Item</button>
        `;
    } else if (type === 'image') {
        padBody.innerHTML = `
            <input type="text" class="pad-input" id="note-title" placeholder="Image Title..." style="font-weight:bold; margin-bottom:10px;">
            <div class="image-upload-dropzone" onclick="document.getElementById('file-input').click()">
                <div id="image-preview-area">Click to Select / Upload Photo from Storage</div>
                <input type="file" id="file-input" accept="image/*" style="display:none;" onchange="handleImageUpload(event)">
            </div>
            <textarea class="pad-textarea" id="note-body" placeholder="Add notes or caption for this image..."></textarea>
        `;
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
            <textarea class="pad-textarea" id="note-body" placeholder="Notes about this drawing..." style="margin-top:8px;"></textarea>
        `;
        setTimeout(initBaseCanvas, 100);
    }
};

window.setListType = function(type) {
    currentListType = type;
    document.getElementById('btn-list-bullet').classList.toggle('active', type === 'bullet');
    document.getElementById('btn-list-number').classList.toggle('active', type === 'number');
    
    const prefixes = document.querySelectorAll('.list-bullet-prefix');
    prefixes.forEach((p, idx) => {
        p.textContent = type === 'bullet' ? '•' : `${idx + 1}.`;
    });
};

window.addListItemRow = function() {
    const box = document.getElementById('list-items-box');
    if (!box) return;
    const idx = box.children.length;
    const row = document.createElement('div');
    row.className = 'list-item-row';
    row.innerHTML = `
        <span class="list-bullet-prefix">${currentListType === 'bullet' ? '•' : `${idx + 1}.`}</span>
        <input type="text" class="list-item-input" placeholder="Item ${idx + 1}..." onkeydown="handleListEnter(event, ${idx})">
    `;
    box.appendChild(row);
    row.querySelector('input').focus();
};

window.handleListEnter = function(e, idx) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addListItemRow();
    }
};

window.handleImageUpload = function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
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
    baseCanvasContext.strokeStyle = '#5c3d2e';

    canvas.onmousedown = (e) => { isBaseDrawing = true; drawBaseCanvas(e); };
    canvas.onmousemove = (e) => { drawBaseCanvas(e); };
    canvas.onmouseup = () => { isBaseDrawing = false; baseCanvasContext.beginPath(); };
    canvas.onmouseleave = () => { isBaseDrawing = false; baseCanvasContext.beginPath(); };
}

function drawBaseCanvas(e) {
    if (!isBaseDrawing || !baseCanvasContext) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentBaseCanvasTool === 'eraser') {
        baseCanvasContext.strokeStyle = '#ffffff';
        baseCanvasContext.lineWidth = 16;
    } else {
        baseCanvasContext.strokeStyle = '#5c3d2e';
        baseCanvasContext.lineWidth = 3;
    }

    baseCanvasContext.lineTo(x, y);
    baseCanvasContext.stroke();
    baseCanvasContext.beginPath();
    baseCanvasContext.moveTo(x, y);
}

window.setBaseCanvasTool = function(tool) {
    currentBaseCanvasTool = tool;
    const marker = document.getElementById('tool-marker');
    const eraser = document.getElementById('tool-eraser');
    if (marker) marker.classList.toggle('active', tool === 'marker');
    if (eraser) eraser.classList.toggle('active', tool === 'eraser');
};

window.clearBaseCanvas = function() {
    const canvas = document.getElementById('drawing-canvas');
    if (baseCanvasContext && canvas) {
        baseCanvasContext.clearRect(0, 0, canvas.width, canvas.height);
    }
};

window.openEditNoteModal = function(id) {
    const item = appItems.find(i => i.id === id);
    if (!item) return;

    editingNoteId = id;
    currentNoteType = item.type;
    document.getElementById('paper-modal').classList.add('open');
    document.getElementById('modal-title').textContent = `Edit Item`;
    document.getElementById('pad-pin-checkbox').checked = item.isPinned;

    const padBody = document.getElementById('pad-body-content');
    padBody.innerHTML = `
        <input type="text" class="pad-input" id="note-title" value="${escapeHtml(item.title || '')}" placeholder="Title..." style="font-weight:bold; margin-bottom:10px;">
        <textarea class="pad-textarea" id="note-body" placeholder="Write here...">${escapeHtml(item.body || '')}</textarea>
    `;
};

window.closeNoteModal = function() {
    const modal = document.getElementById('paper-modal');
    if (modal) modal.classList.remove('open');
    editingNoteId = null;
};

window.savePaperNote = function() {
    const title = document.getElementById('note-title')?.value || 'Untitled';
    let body = document.getElementById('note-body')?.value || '';
    const isPinned = document.getElementById('pad-pin-checkbox')?.checked || false;

    if (currentNoteType === 'list') {
        const inputs = document.querySelectorAll('.list-item-input');
        const listItems = [];
        inputs.forEach((inp, idx) => {
            if (inp.value.trim()) {
                const prefix = currentListType === 'bullet' ? '•' : `${idx + 1}.`;
                listItems.push(`${prefix} ${inp.value.trim()}`);
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
            item.title = title;
            item.body = body;
            item.isPinned = isPinned;
            item.timestamp = Date.now();
        }
    } else {
        appItems.push({
            id: Date.now(),
            type: currentNoteType,
            title: title,
            body: body,
            imageData: uploadedImageData,
            drawingData: drawingData,
            isPinned: isPinned,
            timestamp: Date.now(),
            folder: targetFolder
        });
    }
    saveToLocalStorage();
    closeNoteModal();
};

window.discardPaperNote = function() {
    if (editingNoteId !== null) {
        appItems = appItems.filter(i => i.id !== editingNoteId);
        saveToLocalStorage();
    }
    closeNoteModal();
};

window.sharePaperNote = function() {
    alert("Note copied to clipboard for sharing!");
};

// =============================================================================
// 6. SYNCHRONIZED TIMER ENGINE (Runs Across Base App & Floating Companion)
// =============================================================================
function updateAllTimerDisplays() {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const baseTimer = document.getElementById('timer');
    if (baseTimer) baseTimer.textContent = timeFormatted;

    const compTimer = document.getElementById('companion-timer-display');
    if (compTimer) compTimer.textContent = timeFormatted;

    document.title = `${timeFormatted} - Pippin Cozy Study Desktop`;
}

function updateMascotEmotion(state) {
    const baseMascot = document.getElementById('mascot-img');
    const compMascot = document.getElementById('companion-mascot-img');

    let src = 'assets/pippinchill.png';
    if (state === 'focus' || state === 'start') src = 'assets/pippinnerd.png';
    else if (state === 'pause' || state === 'stop') src = 'assets/pippinsad.png';
    else if (state === 'completed') src = 'assets/pippindawg.png';

    if (baseMascot) baseMascot.src = src;
    if (compMascot) compMascot.src = src;
}

window.cycleMascotImage = function() {
    currentMascotIndex = (currentMascotIndex + 1) % mascotAssets.length;
    const baseMascot = document.getElementById('mascot-img');
    const compMascot = document.getElementById('companion-mascot-img');
    if (baseMascot) baseMascot.src = mascotAssets[currentMascotIndex];
    if (compMascot) compMascot.src = mascotAssets[currentMascotIndex];
};

window.startTimer = function() {
    if (isRunning) return;
    if (totalSeconds <= 0) totalSeconds = initialSeconds;

    isRunning = true;
    updateMascotEmotion('focus');

    timerInterval = setInterval(() => {
        if (totalSeconds > 0) {
            totalSeconds--;
            updateAllTimerDisplays();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            updateMascotEmotion('completed');
            alert("Session completed successfully!");
        }
    }, 1000);
};

window.pauseTimer = function() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    isRunning = false;
    updateMascotEmotion('pause');
};

window.resetTimer = function() {
    clearInterval(timerInterval);
    isRunning = false;
    totalSeconds = initialSeconds;
    updateMascotEmotion('idle');
    updateAllTimerDisplays();
};

window.stopTimer = function() {
    clearInterval(timerInterval);
    isRunning = false;
    totalSeconds = 0;
    updateMascotEmotion('stop');
    updateAllTimerDisplays();
};

window.restartTimer = function() {
    clearInterval(timerInterval);
    totalSeconds = initialSeconds;
    isRunning = false;
    updateAllTimerDisplays();
    startTimer();
};

window.setMode = function(minutes, message, buttonElement) {
    clearInterval(timerInterval);
    isRunning = false;
    totalSeconds = minutes * 60;
    initialSeconds = minutes * 60;
    updateMascotEmotion('idle');
    updateAllTimerDisplays();

    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = message;

    const compMode = document.getElementById('companion-mode-text');
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
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        inputHours.value = h;
        inputMinutes.value = m;
        inputSeconds.value = s;

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
        if (baseTimerDisplay) baseTimerDisplay.style.display = 'block';
        if (controlsContainer) controlsContainer.style.display = 'flex';
    });
}

// =============================================================================
// 7. ENHANCED FLOATING COMPANION WIDGET CONTROLLER
// =============================================================================
window.toggleMiniMode = function(enableMini) {
    companionState.isMiniMode = enableMini;
    document.body.classList.toggle('mini-mode-active', enableMini);
    
    const companion = document.getElementById('pippin-floating-companion');
    if (companion) {
        companion.style.display = enableMini ? 'flex' : 'none';
        if (enableMini) updateAllTimerDisplays();
    }
};

// Companion Inline Time Edit
window.enableFloatingTimeEdit = function() {
    if (isRunning) return;
    const box = document.getElementById('companion-time-edit-box');
    const display = document.getElementById('companion-timer-display');
    if (box && display) {
        display.style.display = 'none';
        box.classList.add('active');

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        document.getElementById('floating-input-h').value = h;
        document.getElementById('floating-input-m').value = m;
        document.getElementById('floating-input-s').value = s;
    }
};

window.saveFloatingTimeEdit = function() {
    const h = parseInt(document.getElementById('floating-input-h').value, 10) || 0;
    const m = parseInt(document.getElementById('floating-input-m').value, 10) || 0;
    const s = parseInt(document.getElementById('floating-input-s').value, 10) || 0;

    totalSeconds = Math.max(1, (h * 3600) + (m * 60) + s);
    initialSeconds = totalSeconds;
    updateAllTimerDisplays();
    cancelFloatingTimeEdit();
};

window.cancelFloatingTimeEdit = function() {
    const box = document.getElementById('companion-time-edit-box');
    const display = document.getElementById('companion-timer-display');
    if (box && display) {
        box.classList.remove('active');
        display.style.display = 'block';
    }
};

// Lock / Unlock Toggle
window.toggleCompanionLock = function() {
    companionState.isLocked = !companionState.isLocked;
    const companion = document.getElementById('pippin-floating-companion');
    const lockIcon = document.getElementById('lock-icon');
    const lockText = document.getElementById('lock-text');
    const lockBadge = document.getElementById('companion-lock-badge');

    if (!companion) return;

    if (companionState.isLocked) {
        companion.classList.remove('mode-unlocked');
        companion.classList.add('mode-locked');
        if (lockIcon) lockIcon.textContent = '🔒';
        if (lockText) lockText.textContent = 'Unlock';
        if (lockBadge) lockBadge.textContent = 'Locked';
    } else {
        companion.classList.remove('mode-locked');
        companion.classList.add('mode-unlocked');
        if (lockIcon) lockIcon.textContent = '🔓';
        if (lockText) lockText.textContent = 'Lock';
        if (lockBadge) lockBadge.textContent = 'Unlocked';
    }
};

// Size Presets Menu
window.toggleCompanionSizeMenu = function() {
    const menu = document.getElementById('companion-size-menu');
    if (menu) menu.classList.toggle('open');
};

window.setCompanionPreset = function(preset) {
    const companion = document.getElementById('pippin-floating-companion');
    const menu = document.getElementById('companion-size-menu');
    if (menu) menu.classList.remove('open');
    if (!companion) return;

    companion.classList.remove('size-dot', 'size-small', 'size-medium', 'size-large', 'size-fullscreen');
    companion.classList.add(`size-${preset}`);
    companionState.currentPreset = preset;

    companion.style.width = '';
    companion.style.height = '';

    if (preset === 'fullscreen') {
        companion.style.left = '10px';
        companion.style.top = '10px';
    }
};

// MultiHub Radial Menu (+)
window.toggleFloatingMultiHub = function() {
    companionState.isMultiHubOpen = !companionState.isMultiHubOpen;
    const wrapper = document.getElementById('companion-multihub-wrapper');
    if (wrapper) wrapper.classList.toggle('open', companionState.isMultiHubOpen);
};

window.openFloatingTool = function(toolName) {
    companionState.activeTool = toolName;
    companionState.isMultiHubOpen = false;

    const wrapper = document.getElementById('companion-multihub-wrapper');
    if (wrapper) wrapper.classList.remove('open');

    const subWin = document.getElementById('floating-sub-window');
    const title = document.getElementById('sub-window-title');
    if (!subWin || !title) return;

    subWin.classList.add('open');
    title.textContent = toolName.toUpperCase();

    // Hide all tool views
    document.querySelectorAll('.f-tool-view').forEach(v => v.style.display = 'none');

    const targetView = document.getElementById(`ftool-${toolName}`);
    if (targetView) targetView.style.display = 'flex';

    if (toolName === 'calculator') renderCalcHistoryUI();
    else if (toolName === 'lists') renderFloatingListsUI();
    else if (toolName === 'notes') switchFloatingNotesTab('write');
    else if (toolName === 'drawing') setTimeout(resizeFloatingCanvas, 80);
};

window.closeFloatingSubWindow = function() {
    companionState.activeTool = null;
    const subWin = document.getElementById('floating-sub-window');
    if (subWin) subWin.classList.remove('open');
};

// =============================================================================
// COMPANION TOOLS IMPLEMENTATION
// =============================================================================

// --- 1. FLOATING NOTES ---
window.switchFloatingNotesTab = function(tab) {
    const writeBox = document.getElementById('fnotes-write-box');
    const listBox = document.getElementById('fnotes-list-box');
    const btnWrite = document.getElementById('btn-fnotes-write');
    const btnList = document.getElementById('btn-fnotes-list');

    if (tab === 'write') {
        if (writeBox) writeBox.style.display = 'block';
        if (listBox) listBox.style.display = 'none';
        if (btnWrite) btnWrite.classList.add('active');
        if (btnList) btnList.classList.remove('active');
    } else {
        if (writeBox) writeBox.style.display = 'none';
        if (listBox) listBox.style.display = 'flex';
        if (btnWrite) btnWrite.classList.remove('active');
        if (btnList) btnList.classList.add('active');
        renderFloatingNotesList();
    }
};

window.saveFloatingNote = function() {
    const title = document.getElementById('float-note-title')?.value.trim() || 'Untitled';
    const body = document.getElementById('float-note-body')?.value.trim() || '';

    if (!body) { alert('Please enter note text.'); return; }

    appItems.unshift({
        id: Date.now(),
        type: 'note',
        title: title,
        body: body,
        isPinned: false,
        timestamp: Date.now(),
        folder: 'notes'
    });
    saveToLocalStorage();
    discardFloatingNote();
    switchFloatingNotesTab('list');
};

window.discardFloatingNote = function() {
    const t = document.getElementById('float-note-title');
    const b = document.getElementById('float-note-body');
    if (t) t.value = '';
    if (b) b.value = '';
};

function renderFloatingNotesList() {
    const listBox = document.getElementById('fnotes-list-box');
    if (!listBox) return;
    listBox.innerHTML = '';
    const notes = appItems.filter(i => i.folder === 'notes');
    if (notes.length === 0) {
        listBox.innerHTML = '<div style="font-size:0.75rem; color:#7a5c4d; text-align:center;">No saved notes yet.</div>';
        return;
    }
    notes.forEach(n => {
        const card = document.createElement('div');
        card.className = 'workspace-card';
        card.innerHTML = `
            <div class="card-title-text">${escapeHtml(n.title)}</div>
            <div class="card-body-text">${escapeHtml(n.body.slice(0, 50))}...</div>
        `;
        listBox.appendChild(card);
    });
}

// --- 2. FLOATING LISTS ---
window.setFloatingListStyle = function(style) {
    companionState.listStyle = style;
    document.getElementById('btn-flist-bullet').classList.toggle('active', style === 'bullet');
    document.getElementById('btn-flist-numbered').classList.toggle('active', style === 'numbered');
    renderFloatingListRows();
};

window.handleFloatingListEnter = function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        addFloatingListItem();
    }
};

window.addFloatingListItem = function() {
    const input = document.getElementById('float-new-item-input');
    if (!input || !input.value.trim()) return;

    companionState.currentListItems.push({
        id: Date.now(),
        text: input.value.trim(),
        done: false
    });
    input.value = '';
    renderFloatingListRows();
    input.focus();
};

function renderFloatingListRows() {
    const box = document.getElementById('float-list-items-box');
    if (!box) return;
    box.innerHTML = '';
    companionState.currentListItems.forEach((item, idx) => {
        const row = document.createElement('div');
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

window.toggleFloatingListItemDone = function(id) {
    const item = companionState.currentListItems.find(i => i.id === id);
    if (item) { item.done = !item.done; renderFloatingListRows(); }
};

window.deleteFloatingListItem = function(id) {
    companionState.currentListItems = companionState.currentListItems.filter(i => i.id !== id);
    renderFloatingListRows();
};

window.saveFloatingList = function() {
    const title = document.getElementById('float-list-title')?.value.trim() || 'Untitled List';
    if (companionState.currentListItems.length === 0) { alert('Add at least one list item.'); return; }

    companionState.savedLists.unshift({
        id: Date.now(),
        title: title,
        style: companionState.listStyle,
        items: [...companionState.currentListItems]
    });
    localStorage.setItem('pippin_saved_lists', JSON.stringify(companionState.savedLists));
    discardFloatingList();
    renderFloatingListsUI();
    showFloatingSavedLists();
};

window.discardFloatingList = function() {
    companionState.currentListItems = [];
    const t = document.getElementById('float-list-title');
    if (t) t.value = '';
    renderFloatingListRows();
};

window.showFloatingSavedLists = function() {
    const drawer = document.getElementById('flists-drawer');
    if (!drawer) return;
    drawer.style.display = drawer.style.display === 'flex' ? 'none' : 'flex';
    drawer.innerHTML = '';
    if (companionState.savedLists.length === 0) {
        drawer.innerHTML = '<div style="font-size:0.75rem; text-align:center; padding:8px;">No saved lists.</div>';
        return;
    }
    companionState.savedLists.forEach(l => {
        const card = document.createElement('div');
        card.className = 'workspace-card';
        card.innerHTML = `
            <div style="font-weight:bold; font-size:0.8rem;">${escapeHtml(l.title)} (${l.items.length} items)</div>
            <div style="display:flex; gap:4px; margin-top:4px;">
                <button type="button" class="btn-hist-small" onclick="loadSavedListToFloating(${l.id})">Open</button>
                <button type="button" class="btn-hist-small" onclick="deleteSavedFloatingList(${l.id})">✕</button>
            </div>
        `;
        drawer.appendChild(card);
    });
};

window.loadSavedListToFloating = function(id) {
    const l = companionState.savedLists.find(i => i.id === id);
    if (!l) return;
    document.getElementById('float-list-title').value = l.title;
    companionState.listStyle = l.style || 'bullet';
    companionState.currentListItems = [...l.items];
    setFloatingListStyle(companionState.listStyle);
    renderFloatingListRows();
    document.getElementById('flists-drawer').style.display = 'none';
};

window.deleteSavedFloatingList = function(id) {
    companionState.savedLists = companionState.savedLists.filter(i => i.id !== id);
    localStorage.setItem('pippin_saved_lists', JSON.stringify(companionState.savedLists));
    renderFloatingListsUI();
    showFloatingSavedLists();
};

function renderFloatingListsUI() {
    const count = document.getElementById('flists-count');
    if (count) count.textContent = companionState.savedLists.length;
}

// --- 3. FLOATING DRAWING ---
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

        if (companionState.drawTool === 'eraser') {
            floatCanvasCtx.strokeStyle = '#ffffff';
            floatCanvasCtx.lineWidth = 14;
        } else {
            floatCanvasCtx.strokeStyle = companionState.drawColor;
            floatCanvasCtx.lineWidth = 3;
        }

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

window.setFloatingCanvasTool = function(tool) {
    companionState.drawTool = tool;
    document.getElementById('ftool-marker').classList.toggle('active', tool === 'marker');
    document.getElementById('ftool-eraser').classList.toggle('active', tool === 'eraser');
};

window.setFloatingDrawColor = function(c) {
    companionState.drawColor = c;
    setFloatingCanvasTool('marker');
};

window.clearFloatingCanvas = function() {
    const canvas = document.getElementById('float-drawing-canvas');
    if (canvas && floatCanvasCtx) floatCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
};

window.saveFloatingDrawing = function() {
    const canvas = document.getElementById('float-drawing-canvas');
    if (!canvas) return;
    companionState.savedDrawings.unshift({
        id: Date.now(),
        dataUrl: canvas.toDataURL('image/png'),
        timestamp: Date.now()
    });
    localStorage.setItem('pippin_drawings', JSON.stringify(companionState.savedDrawings));
    renderFloatingDrawingsGalleryUI();
    alert('Doodle saved to gallery!');
};

window.discardFloatingDrawing = function() {
    clearFloatingCanvas();
};

window.toggleFloatingDrawingGallery = function() {
    const gallery = document.getElementById('fdrawings-gallery');
    if (!gallery) return;
    gallery.style.display = gallery.style.display === 'flex' ? 'none' : 'flex';
    if (gallery.style.display === 'flex') renderFloatingDrawingsGalleryUI();
};

function renderFloatingDrawingsGalleryUI() {
    const count = document.getElementById('fdrawings-count');
    const gallery = document.getElementById('fdrawings-gallery');
    if (count) count.textContent = companionState.savedDrawings.length;
    if (!gallery) return;
    gallery.innerHTML = '';
    if (companionState.savedDrawings.length === 0) {
        gallery.innerHTML = '<div style="font-size:0.75rem; text-align:center; padding:6px;">No doodles yet.</div>';
        return;
    }
    companionState.savedDrawings.forEach(d => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '6px';
        item.style.padding = '4px';
        item.style.background = '#faf6f0';
        item.style.borderRadius = '6px';
        item.innerHTML = `
            <img src="${d.dataUrl}" style="width:40px; height:30px; object-fit:cover; border-radius:4px; background:#fff; border:1px solid #e6dacb;">
            <span style="flex:1; font-size:0.7rem;">${new Date(d.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'})}</span>
            <button type="button" class="btn-del-hist" onclick="deleteFloatingDrawing(${d.id})">✕</button>
        `;
        gallery.appendChild(item);
    });
}

window.deleteFloatingDrawing = function(id) {
    companionState.savedDrawings = companionState.savedDrawings.filter(i => i.id !== id);
    localStorage.setItem('pippin_drawings', JSON.stringify(companionState.savedDrawings));
    renderFloatingDrawingsGalleryUI();
};

// --- 4. FLOATING CALCULATOR (C Button, DEL Single Char, Operations, History) ---
window.fcalcNum = function(num) {
    if (companionState.calcExpression === '0') companionState.calcExpression = num;
    else companionState.calcExpression += num;
    updateFCalcDisplay();
};

window.fcalcDecimal = function() {
    const parts = companionState.calcExpression.split(/[+\-*/]/);
    const last = parts[parts.length - 1];
    if (!last.includes('.')) {
        companionState.calcExpression += '.';
        updateFCalcDisplay();
    }
};

window.fcalcOp = function(op) {
    const expr = companionState.calcExpression;
    const lastChar = expr.slice(-1);
    if (['+', '-', '*', '/'].includes(lastChar)) {
        companionState.calcExpression = expr.slice(0, -1) + op;
    } else {
        companionState.calcExpression += op;
    }
    updateFCalcDisplay();
};

// C Button: Clear everything (125+20 -> 0)
window.fcalcClear = function() {
    companionState.calcExpression = '0';
    companionState.calcFormula = '';
    updateFCalcDisplay();
};

// DEL / Backspace: Deletes ONE character at a time (12345 -> 1234 -> 123 -> 12)
window.fcalcDelete = function() {
    const expr = companionState.calcExpression;
    if (expr.length > 1) companionState.calcExpression = expr.slice(0, -1);
    else companionState.calcExpression = '0';
    updateFCalcDisplay();
};

// Equal = Evaluate and record history
window.fcalcEqual = function() {
    const expr = companionState.calcExpression;
    try {
        const sanitized = expr.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized})`)();

        if (result === undefined || isNaN(result) || !isFinite(result)) {
            companionState.calcFormula = expr + ' =';
            companionState.calcExpression = 'Error';
        } else {
            const resFormatted = String(Math.round(result * 100000000) / 100000000);
            companionState.calcFormula = expr + ' =';

            // Auto save to history
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
    const d = document.getElementById('fcalc-display');
    const f = document.getElementById('fcalc-formula');
    if (d) d.textContent = companionState.calcExpression.replace(/\*/g, '×').replace(/\//g, '÷');
    if (f) f.textContent = companionState.calcFormula || '\u00A0';
}

window.saveCalculationHistory = function() {
    localStorage.setItem('pippin_calc_history', JSON.stringify(companionState.calcHistory));
    alert('History saved.');
};

window.deleteCalcHistoryItem = function(id) {
    companionState.calcHistory = companionState.calcHistory.filter(h => h.id !== id);
    localStorage.setItem('pippin_calc_history', JSON.stringify(companionState.calcHistory));
    renderCalcHistoryUI();
};

window.clearCalculationHistory = function() {
    companionState.calcHistory = [];
    localStorage.setItem('pippin_calc_history', JSON.stringify([]));
    renderCalcHistoryUI();
};

window.discardCalculationHistory = function() {
    clearCalculationHistory();
};

function renderCalcHistoryUI() {
    const list = document.getElementById('fcalc-history-list');
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
// 8. DRAGGING & 8-DIRECTION RESIZING FOR FLOATING COMPANION
// =============================================================================
function initCompanionDragging() {
    const companion = document.getElementById('pippin-floating-companion');
    const handle = document.getElementById('companion-drag-handle');
    if (!companion || !handle) return;

    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    handle.addEventListener('pointerdown', (e) => {
        if (companionState.isLocked) return;
        if (e.target.closest('button')) return;

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

    handles.forEach(h => {
        h.addEventListener('pointerdown', (e) => {
            if (companionState.isLocked) return;
            e.stopPropagation();
            e.preventDefault();

            const dir = h.getAttribute('data-dir');
            const startX = e.clientX;
            const startY = e.clientY;
            const startRect = companion.getBoundingClientRect();

            h.setPointerCapture(e.pointerId);

            const onMove = (ev) => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;

                let newW = startRect.width;
                let newH = startRect.height;
                let newL = startRect.left;
                let newT = startRect.top;

                if (dir.includes('e')) newW = Math.max(120, startRect.width + dx);
                if (dir.includes('s')) newH = Math.max(68, startRect.height + dy);
                if (dir.includes('w')) {
                    newW = Math.max(120, startRect.width - dx);
                    newL = startRect.left + (startRect.width - newW);
                }
                if (dir.includes('n')) {
                    newH = Math.max(68, startRect.height - dy);
                    newT = startRect.top + (startRect.height - newH);
                }

                companion.style.width = `${newW}px`;
                companion.style.height = `${newH}px`;
                companion.style.left = `${newL}px`;
                companion.style.top = `${newT}px`;
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
// 9. NATIVE OS ALWAYS-ON-TOP DESKTOP FLOAT (DOCUMENT PICTURE-IN-PICTURE)
// =============================================================================
window.toggleDesktopFloat = async function() {
    if (!('documentPictureInPicture' in window)) {
        alert(
            'Document Picture-in-Picture is not supported in this browser.\n\n' +
            'For true Always-On-Top floating over other desktop windows:\n' +
            '1. Open Pippin in Microsoft Edge or Google Chrome (v116+).\n' +
            '2. Or run the "Launch-Pippin.bat" desktop shortcut!'
        );
        // Fallback: activate in-tab mini mode
        toggleMiniMode(true);
        return;
    }

    try {
        if (companionState.isPipActive && companionState.pipWindow) {
            companionState.pipWindow.close();
            return;
        }

        const companion = document.getElementById('pippin-floating-companion');
        if (!companion) return;

        // Open live interactive OS window
        const pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 440,
            height: 200
        });

        companionState.pipWindow = pipWindow;
        companionState.isPipActive = true;

        // Copy stylesheets and fonts
        document.querySelectorAll('link[rel="stylesheet"], style').forEach(el => {
            pipWindow.document.head.appendChild(el.cloneNode(true));
        });

        // Inject high-priority PiP reset styling
        const pipStyle = pipWindow.document.createElement('style');
        pipStyle.textContent = `
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                overflow: hidden !important;
                background: #faf6f0 !important;
            }
            #pippin-floating-companion {
                display: flex !important;
                position: static !important;
                width: 100vw !important;
                height: 100vh !important;
                max-height: 100vh !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                padding: 3px 6px !important;
                box-sizing: border-box !important;
            }
            .resize-handle, #companion-pip-btn {
                display: none !important;
            }
        `;
        pipWindow.document.head.appendChild(pipStyle);

        pipWindow.document.title = 'Pippin Cozy Study Companion (Always on Top)';
        pipWindow.document.body.className = 'pippin-base-body in-pip-mode';

        // Move live companion into PiP window
        pipWindow.document.body.appendChild(companion);

        // When PiP closes, restore to main window
        pipWindow.addEventListener('pagehide', () => {
            companionState.isPipActive = false;
            companionState.pipWindow = null;
            document.body.appendChild(companion);
            if (!companionState.isMiniMode) companion.style.display = 'none';
        });

    } catch (err) {
        console.error('Failed to open Document Picture-in-Picture window:', err);
    }
};

// =============================================================================
// 10. GLOBAL KEYBOARD SHORTCUTS
// =============================================================================
function initGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const isTyping = activeTag === 'input' || activeTag === 'textarea';

        // Space: Start/Pause Timer (when not typing)
        if (e.code === 'Space' && !isTyping) {
            e.preventDefault();
            if (isRunning) pauseTimer();
            else startTimer();
            return;
        }

        // Ctrl + shortcuts
        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();

            if (key === 'n') {
                e.preventDefault();
                toggleMiniMode(true);
                openFloatingTool('notes');
            } else if (key === 'l') {
                e.preventDefault();
                toggleMiniMode(true);
                openFloatingTool('lists');
            } else if (key === 'd') {
                e.preventDefault();
                toggleMiniMode(true);
                openFloatingTool('drawing');
            } else if (key === 'k') {
                e.preventDefault();
                toggleMiniMode(true);
                openFloatingTool('calculator');
            } else if (key === 'm') {
                e.preventDefault();
                toggleMiniMode(true);
                toggleFloatingMultiHub();
            } else if (key === 't') {
                e.preventDefault();
                toggleMiniMode(true);
                enableFloatingTimeEdit();
            }
        }

        // Esc: close floating tool or MultiHub
        if (e.key === 'Escape') {
            if (companionState.isMultiHubOpen) toggleFloatingMultiHub();
            else if (companionState.activeTool) closeFloatingSubWindow();
            else cancelFloatingTimeEdit();
        }
    });
}

// Helper: Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}