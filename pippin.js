// Cinematic Splash Screen & Live Date/Time
window.addEventListener('DOMContentLoaded', () => {
    const welcomeScreen = document.getElementById('welcome-screen');
    const welcomeContent = document.querySelector('.welcome-content');
    
    setTimeout(() => {
        welcomeContent.classList.add('text-in');
    }, 300);

    setTimeout(() => {
        welcomeContent.classList.add('text-out');
        welcomeScreen.classList.add('fade-out-bg');
    }, 2500);

    updateLiveDateTime();
    setInterval(updateLiveDateTime, 1000);

    generateSmallCalendar();
    renderAllHubs();
    checkTrashExpiry();
});

// Live Date & Time Widget
function updateLiveDateTime() {
    const now = new Date();
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', optionsDate);
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    document.getElementById('live-datetime').textContent = `${dateStr} | ${timeStr}`;
}

// Sidebar Dropdown Toggler
window.toggleTaskbarTab = function(tabName, event) {
    const panels = document.querySelectorAll('.taskbar-dropdown-panel');
    const tabs = document.querySelectorAll('.taskbar-tab');
    const targetPanel = document.getElementById(`panel-${tabName}`);
    const isAlreadyOpen = targetPanel.classList.contains('open');

    panels.forEach(p => p.classList.remove('open'));
    tabs.forEach(t => t.classList.remove('active'));

    if (!isAlreadyOpen) {
        targetPanel.classList.add('open');
        event.currentTarget.classList.add('active');
    }
};

window.closeDropdownPanel = function() {
    document.querySelectorAll('.taskbar-dropdown-panel').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.taskbar-tab').forEach(t => t.classList.remove('active'));
};

// Storage Management
let appItems = JSON.parse(localStorage.getItem('pippin_items')) || [
    { id: 1, type: 'note', title: 'Welcome Note', body: 'Explore your new cozy matcha & chocolate sanctuary!', isPinned: true, timestamp: Date.now(), folder: 'notes' }
];

let calendarEvents = JSON.parse(localStorage.getItem('pippin_cal_events')) || {};

function saveToLocalStorage() {
    localStorage.setItem('pippin_items', JSON.stringify(appItems));
    localStorage.setItem('pippin_cal_events', JSON.stringify(calendarEvents));
    renderAllHubs();
    generateSmallCalendar();
}

// Calendar Date Click & Modal Logic
let selectedCalDateDay = null;

function generateSmallCalendar() {
    const grid = document.getElementById('small-cal-grid');
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

    modal.classList.add('open');
}

window.closeCalendarModal = function() {
    document.getElementById('calendar-date-modal').classList.remove('open');
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

function renderAllHubs() {
    const notesGrid = document.getElementById('notes-grid');
    const remindersGrid = document.getElementById('reminders-grid');
    const archiveGrid = document.getElementById('archive-grid');
    const trashGrid = document.getElementById('trash-grid');

    notesGrid.innerHTML = '';
    remindersGrid.innerHTML = '';
    archiveGrid.innerHTML = '';
    trashGrid.innerHTML = '';

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
                <div class="card-title-text">${item.title || 'Untitled'}</div>
                <div class="card-body-text">${contentDisplay}</div>
            </div>
            <div style="display:flex; gap:4px; margin-top:6px;">
                ${item.folder !== 'trash' ? `
                    <button class="pomo-btn" style="font-size:0.65rem; padding:2px 6px;" onclick="openEditNoteModal(${item.id})">Edit</button>
                    <button class="pomo-btn" style="font-size:0.65rem; padding:2px 6px;" onclick="moveToFolder(${item.id}, 'trash')">Trash</button>
                ` : `<button class="pomo-btn" style="font-size:0.65rem; padding:2px 6px;" onclick="restoreItem(${item.id})">Restore</button>`}
            </div>
        `;

        if (item.folder === 'notes') notesGrid.appendChild(card);
        else if (item.folder === 'reminders') remindersGrid.appendChild(card);
        else if (item.folder === 'archive') archiveGrid.appendChild(card);
        else if (item.folder === 'trash') trashGrid.appendChild(card);
    });
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

// Circular Radial FAM Toggle
const famMainBtn = document.getElementById('fam-main-btn');
const radialOptions = document.getElementById('radial-options');
famMainBtn.addEventListener('click', () => radialOptions.classList.toggle('open'));

// Note, List, Image, and Canvas Creation Overlay
let currentNoteType = 'note';
let editingNoteId = null;
let currentListType = 'bullet';
let uploadedImageData = null;
let canvasContext = null;
let isDrawing = false;
let currentCanvasTool = 'marker';

window.openNoteModal = function(type) {
    currentNoteType = type;
    editingNoteId = null;
    uploadedImageData = null;
    radialOptions.classList.remove('open');
    
    const padContainer = document.getElementById('writing-pad-container');
    padContainer.className = `paper-writing-pad ${type === 'drawing' ? 'plain-canvas' : ''}`;
    
    document.getElementById('paper-modal').classList.add('open');
    document.getElementById('modal-title').textContent = `Create ${type.toUpperCase()}`;
    document.getElementById('pad-pin-checkbox').checked = false;
    
    const padBody = document.getElementById('pad-body-content');

    if (type === 'note' || type === 'text' || type === 'reminder') {
        padBody.innerHTML = `
            <input type="text" class="pad-input" id="note-title" placeholder="Title..." style="font-weight:bold; margin-bottom:10px;">
            <textarea class="pad-textarea" id="note-body" placeholder="Write here..."></textarea>
        `;
    } else if (type === 'list') {
        padBody.innerHTML = `
            <input type="text" class="pad-input" id="note-title" placeholder="List Title..." style="font-weight:bold; margin-bottom:10px;">
            <div class="list-type-selector">
                <button class="list-type-btn active" id="btn-list-bullet" onclick="setListType('bullet')">• Bullets</button>
                <button class="list-type-btn" id="btn-list-number" onclick="setListType('number')">1. Numbered</button>
            </div>
            <div class="list-items-container" id="list-items-box">
                <div class="list-item-row">
                    <span class="list-bullet-prefix" id="prefix-0">•</span>
                    <input type="text" class="list-item-input" placeholder="Item 1..." onkeydown="handleListEnter(event, 0)">
                </div>
            </div>
            <button class="pomo-btn" style="font-size:0.75rem; padding:4px 12px; margin-top:10px;" onclick="addListItemRow()">+ Add Item</button>
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
                    <button class="canvas-tool-btn active" id="tool-marker" onclick="setCanvasTool('marker')">🖊️ Marker</button>
                    <button class="canvas-tool-btn" id="tool-eraser" onclick="setCanvasTool('eraser')">🧹 Eraser</button>
                    <button class="canvas-tool-btn" onclick="clearCanvas()">Clear</button>
                </div>
            </div>
            <textarea class="pad-textarea" id="note-body" placeholder="Notes about this drawing..." style="margin-top:8px;"></textarea>
        `;
        setTimeout(initCanvas, 100);
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
            document.getElementById('image-preview-area').innerHTML = `<img src="${uploadedImageData}" class="image-preview-img">`;
        };
        reader.readAsDataURL(file);
    }
};

// Canvas Drawing Logic
function initCanvas() {
    const canvas = document.getElementById('drawing-canvas');
    if (!canvas) return;
    canvasContext = canvas.getContext('2d');
    canvasContext.lineCap = 'round';
    canvasContext.lineJoin = 'round';
    canvasContext.lineWidth = 3;
    canvasContext.strokeStyle = '#5c3d2e';

    canvas.onmousedown = (e) => { isDrawing = true; draw(e); };
    canvas.onmousemove = (e) => { draw(e); };
    canvas.onmouseup = () => { isDrawing = false; canvasContext.beginPath(); };
    canvas.onmouseleave = () => { isDrawing = false; canvasContext.beginPath(); };
}

function draw(e) {
    if (!isDrawing || !canvasContext) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentCanvasTool === 'eraser') {
        canvasContext.strokeStyle = '#ffffff';
        canvasContext.lineWidth = 16;
    } else {
        canvasContext.strokeStyle = '#5c3d2e';
        canvasContext.lineWidth = 3;
    }

    canvasContext.lineTo(x, y);
    canvasContext.stroke();
    canvasContext.beginPath();
    canvasContext.moveTo(x, y);
}

window.setCanvasTool = function(tool) {
    currentCanvasTool = tool;
    document.getElementById('tool-marker').classList.toggle('active', tool === 'marker');
    document.getElementById('tool-eraser').classList.toggle('active', tool === 'eraser');
};

window.clearCanvas = function() {
    const canvas = document.getElementById('drawing-canvas');
    if (canvasContext && canvas) {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
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
        <input type="text" class="pad-input" id="note-title" value="${item.title || ''}" placeholder="Title..." style="font-weight:bold; margin-bottom:10px;">
        <textarea class="pad-textarea" id="note-body" placeholder="Write here...">${item.body || ''}</textarea>
    `;
};

window.closeNoteModal = function() {
    document.getElementById('paper-modal').classList.remove('open');
    editingNoteId = null;
};

window.savePaperNote = function() {
    const title = document.getElementById('note-title')?.value || 'Untitled';
    let body = document.getElementById('note-body')?.value || '';
    const isPinned = document.getElementById('pad-pin-checkbox').checked;

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
    alert("Copied to clipboard for sharing!");
};

// Containerless Timer & Interactive Mascot Cycle Logic
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const statusText = document.getElementById('status-text');
const mascotImg = document.getElementById('mascot-img');

const inputContainer = document.getElementById('input-container');
const controlsContainer = document.getElementById('controls-container');
const inputHours = document.getElementById('input-hours');
const inputMinutes = document.getElementById('input-minutes');
const inputSeconds = document.getElementById('input-seconds');
const saveTimeBtn = document.getElementById('save-time-btn');

let totalSeconds = 25 * 60;
let initialSeconds = 25 * 60;
let timerInterval = null;
let isRunning = false;

// Mascot Photo Assets Library
const mascotAssets = [
    'assets/pippinchill.png',
    'assets/pippinnerd.png',
    'assets/pippinsad.png',
    'assets/pippindawg.png'
];
let currentMascotIndex = 0;

// Interactive Mascot Tap to Cycle Photos!
window.cycleMascotImage = function() {
    currentMascotIndex = (currentMascotIndex + 1) % mascotAssets.length;
    mascotImg.src = mascotAssets[currentMascotIndex];
};

function updateMascotEmotion(state) {
    if (state === 'start') {
        mascotImg.src = 'assets/pippinchill.png';
    } else if (state === 'focus') {
        mascotImg.src = 'assets/pippinnerd.png';
    } else if (state === 'pause') {
        mascotImg.src = 'assets/pippinsad.png';
    } else {
        mascotImg.src = 'assets/pippinchill.png';
    }
}

function updateDisplay() {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (isRunning) {
        if (totalSeconds <= initialSeconds / 2) {
            updateMascotEmotion('focus');
        } else {
            updateMascotEmotion('start');
        }
    }
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    updateMascotEmotion('start');

    timerInterval = setInterval(() => {
        if (totalSeconds > 0) {
            totalSeconds--;
            updateDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            updateMascotEmotion('idle');
            alert("Session completed successfully! Take a well-deserved break!");
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    updateMascotEmotion('pause');
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    totalSeconds = initialSeconds;
    updateMascotEmotion('idle');
    updateDisplay();
}

function setMode(minutes, message, buttonElement) {
    clearInterval(timerInterval);
    isRunning = false;
    totalSeconds = minutes * 60;
    initialSeconds = minutes * 60;
    updateMascotEmotion('idle');
    updateDisplay();
    statusText.textContent = message;

    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
}

timerDisplay.addEventListener('click', () => {
    if (isRunning) return;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    inputHours.value = hours;
    inputMinutes.value = minutes;
    inputSeconds.value = seconds;

    timerDisplay.style.display = 'none';
    controlsContainer.style.display = 'none';
    inputContainer.classList.add('active');
});

saveTimeBtn.addEventListener('click', () => {
    const h = parseInt(inputHours.value) || 0;
    const m = parseInt(inputMinutes.value) || 0;
    const s = parseInt(inputSeconds.value) || 0;

    totalSeconds = (h * 3600) + (m * 60) + s;
    initialSeconds = totalSeconds;
    updateDisplay();

    inputContainer.classList.remove('active');
    timerDisplay.style.display = 'block';
    controlsContainer.style.display = 'flex';
});

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

updateDisplay();