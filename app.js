var DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
var POINTS = { daily: 10, weekly: 25, monthly: 50 };
var COLOR_PALETTE = ["#e63946", "#2a9d8f", "#e9c46a", "#457b9d", "#8338ec", "#f4845f"];

var DEFAULT_CHORES = {
    daily: [
        { category: "Kitchen", items: ["Wash/rinse dishes", "Run/empty dishwasher", "Wipe down countertops", "Clear the table"] },
        { category: "Surfaces & Tidy-up", items: ["Make beds", "Declutter shared living spaces", "Quick wipe bathroom sinks"] },
        { category: "Floors", items: ["Sweep up crumbs / robot vacuum"] },
        { category: "Trash", items: ["Empty full garbage", "Take out recycling", "Empty compost bins"] },
        { category: "Pets", items: ["Feed pets", "Fresh water", "Clean litter boxes/cages"] }
    ],
    weekly: [
        { category: "Bathrooms", items: ["Scrub/disinfect toilets", "Scrub tubs and showers", "Clean mirrors", "Polish fixtures"] },
        { category: "Floors", items: ["Vacuum all rugs and carpets", "Sweep/mop hard floors"] },
        { category: "Laundry", items: ["Wash, fold & put away clothes", "Wash bath towels", "Wash dish towels", "Wash bed linens"] },
        { category: "Kitchen Deep Dive", items: ["Disinfect kitchen sink", "Clean microwave", "Wipe down appliances", "Clean out fridge"] },
        { category: "Dusting", items: ["Dust shelves and tables", "Dust window sills"] }
    ],
    monthly: [
        { category: "Appliances", items: ["Clean out oven", "Deep clean freezer", "Run washing machine cleaning cycle"] },
        { category: "Air Quality", items: ["Change HVAC/furnace filters", "Vacuum vents"] },
        { category: "Windows & Blinds", items: ["Dust blinds", "Wash curtains", "Clean interior windows", "Clean exterior windows"] },
        { category: "Closets & Pantry", items: ["Organize seasonal clothing", "Deep clean pantry", "Check expiration dates"] }
    ]
};

// ---- PERSISTENCE ----
function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
}

function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

var state = {
    members: load("members", []),
    choreEntries: load("choreEntries", {}),
    scores: load("scores", {}),
    customChores: load("customChores", { daily: [], weekly: [], monthly: [] }),
    hiddenChores: load("hiddenChores", { daily: [], weekly: [], monthly: [] }),
    memberColors: load("memberColors", {}),
    appTitle: load("appTitle", "Our Family Chores")
};

function saveAll() {
    save("members", state.members);
    save("choreEntries", state.choreEntries);
    save("scores", state.scores);
    save("customChores", state.customChores);
    save("hiddenChores", state.hiddenChores);
    save("memberColors", state.memberColors);
    save("appTitle", state.appTitle);
}

// ---- MIGRATION from old format ----
(function migrate() {
    var oldWeekly = localStorage.getItem("weeklyAssignments");
    var oldDaily = localStorage.getItem("dailyChecks");
    var oldMonthly = localStorage.getItem("monthlyChecks");
    if (!oldWeekly && !oldDaily && !oldMonthly) return;
    localStorage.removeItem("weeklyAssignments");
    localStorage.removeItem("dailyChecks");
    localStorage.removeItem("monthlyChecks");
    localStorage.removeItem("completionLog");
    saveAll();
})();

// ---- COLOR HELPERS ----
function getMemberColor(member) {
    if (state.memberColors[member]) return state.memberColors[member];
    var idx = state.members.indexOf(member);
    if (idx === -1) idx = 0;
    return COLOR_PALETTE[idx % COLOR_PALETTE.length];
}

function ensureMemberColor(member) {
    if (!state.memberColors[member]) {
        var idx = state.members.indexOf(member);
        if (idx === -1) idx = Object.keys(state.memberColors).length;
        state.memberColors[member] = COLOR_PALETTE[idx % COLOR_PALETTE.length];
    }
}

function darkenColor(hex, amount) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.floor(r * (1 - amount)));
    g = Math.max(0, Math.floor(g * (1 - amount)));
    b = Math.max(0, Math.floor(b * (1 - amount)));
    return "#" + [r, g, b].map(function (c) { return c.toString(16).padStart(2, "0"); }).join("");
}

// ---- CHORE HELPERS ----
function getChoresForFreq(freq) {
    var hidden = state.hiddenChores[freq] || [];
    var result = [];
    DEFAULT_CHORES[freq].forEach(function (cat) {
        var items = cat.items.filter(function (i) { return hidden.indexOf(i) === -1; });
        if (items.length > 0) result.push({ category: cat.category, items: items });
    });
    var custom = state.customChores[freq] || [];
    if (custom.length > 0) result.push({ category: "Custom", items: custom });
    return result;
}

function dateStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function todayStr() { return dateStr(new Date()); }

// ---- APP TITLE ----
var titleEl = document.getElementById("app-title");
titleEl.textContent = "\u{1F3E0} " + state.appTitle;

titleEl.addEventListener("click", function () {
    titleEl.contentEditable = "true";
    titleEl.classList.add("editing");
    var text = state.appTitle;
    titleEl.textContent = text;
    titleEl.focus();
    var range = document.createRange();
    range.selectNodeContents(titleEl);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
});

titleEl.addEventListener("blur", function () {
    saveTitleFromEl();
});

titleEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        titleEl.blur();
    }
});

function saveTitleFromEl() {
    titleEl.contentEditable = "false";
    titleEl.classList.remove("editing");
    var text = titleEl.textContent.trim();
    if (text) {
        state.appTitle = text;
    }
    titleEl.textContent = "\u{1F3E0} " + state.appTitle;
    document.getElementById("title-input").value = state.appTitle;
    saveAll();
}

// ---- CALENDAR STATE ----
var calView = "month";
var calDate = new Date();

// ---- TABS ----
document.querySelectorAll(".tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
        document.querySelectorAll(".tab-content").forEach(function (c) { c.classList.remove("active"); });
        btn.classList.add("active");
        document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
        renderActiveTab(btn.dataset.tab);
    });
});

function renderActiveTab(tab) {
    if (tab === "calendar") renderCalendar();
    else if (tab === "leaderboard") renderLeaderboard();
    else if (tab === "settings") renderSettings();
}

// ---- CALENDAR VIEW TOGGLE ----
document.querySelectorAll(".cal-view-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".cal-view-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        calView = btn.dataset.view;
        renderCalendar();
    });
});

document.getElementById("cal-prev").addEventListener("click", function () {
    if (calView === "month") calDate.setMonth(calDate.getMonth() - 1);
    else calDate.setDate(calDate.getDate() - 7);
    renderCalendar();
});

document.getElementById("cal-next").addEventListener("click", function () {
    if (calView === "month") calDate.setMonth(calDate.getMonth() + 1);
    else calDate.setDate(calDate.getDate() + 7);
    renderCalendar();
});

// ---- RENDER CALENDAR ----
function renderCalendar() {
    closeChipPopup();
    var container = document.getElementById("calendar-grid");
    var title = document.getElementById("cal-title");
    if (calView === "month") renderMonthView(container, title);
    else renderWeekView(container, title);
}

function renderMonthView(container, titleEl) {
    var year = calDate.getFullYear();
    var month = calDate.getMonth();
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    titleEl.textContent = monthNames[month] + " " + year;

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var daysInPrev = new Date(year, month, 0).getDate();
    var today = todayStr();

    var html = '<div class="cal-month">';
    DAYS.forEach(function (d) { html += '<div class="cal-day-header">' + d + '</div>'; });

    var totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (var i = 0; i < totalCells; i++) {
        var dayNum, ds, outside;
        if (i < firstDay) {
            dayNum = daysInPrev - firstDay + i + 1;
            ds = dateStr(new Date(year, month - 1, dayNum));
            outside = true;
        } else if (i >= firstDay + daysInMonth) {
            dayNum = i - firstDay - daysInMonth + 1;
            ds = dateStr(new Date(year, month + 1, dayNum));
            outside = true;
        } else {
            dayNum = i - firstDay + 1;
            ds = dateStr(new Date(year, month, dayNum));
            outside = false;
        }

        var classes = "cal-day";
        if (outside) classes += " outside";
        if (ds === today) classes += " today";

        html += '<div class="' + classes + '" data-date="' + ds + '">';
        html += '<div class="cal-day-number">' + dayNum + '</div>';
        html += '<div class="cal-day-chores">' + renderChoreChips(ds) + '</div>';
        html += '<button class="add-btn-cell" data-date="' + ds + '">+</button>';
        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
    attachCalendarListeners(container);
}

function renderWeekView(container, titleEl) {
    var d = new Date(calDate);
    var day = d.getDay();
    var weekStart = new Date(d);
    weekStart.setDate(d.getDate() - day);
    var today = todayStr();

    var weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    titleEl.textContent = monthNames[weekStart.getMonth()] + " " + weekStart.getDate() + " – " + monthNames[weekEnd.getMonth()] + " " + weekEnd.getDate() + ", " + weekEnd.getFullYear();

    var html = '<div class="cal-week">';

    for (var i = 0; i < 7; i++) {
        var wd = new Date(weekStart);
        wd.setDate(weekStart.getDate() + i);
        html += '<div class="cal-week-header"><div class="day-name">' + DAYS[i] + '</div><div class="day-date">' + wd.getDate() + '</div></div>';
    }

    for (var j = 0; j < 7; j++) {
        var wd2 = new Date(weekStart);
        wd2.setDate(weekStart.getDate() + j);
        var ds2 = dateStr(wd2);
        var classes = "cal-day";
        if (ds2 === today) classes += " today";

        html += '<div class="' + classes + '" data-date="' + ds2 + '">';
        html += '<div class="cal-day-chores">' + renderChoreChips(ds2) + '</div>';
        html += '<button class="add-btn-cell" data-date="' + ds2 + '">+</button>';
        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
    attachCalendarListeners(container);
}

function renderChoreChips(ds) {
    var entries = state.choreEntries[ds] || [];
    var html = "";
    entries.forEach(function (entry, idx) {
        var cls = entry.done ? "done" : "owner";
        var pts = POINTS[entry.freq] || 0;
        var color = getMemberColor(entry.member);
        html += '<div class="chore-chip ' + cls + '" data-date="' + ds + '" data-idx="' + idx + '">';
        html += '<span class="chip-color-dot" style="background:' + color + ';"></span>';
        html += '<span class="chip-name">' + escHtml(entry.name) + '</span>';
        html += '<span class="chip-member">' + escHtml(entry.member) + '</span>';
        html += '<span class="chip-pts">' + pts + '</span>';
        html += '</div>';
    });
    return html;
}

function attachCalendarListeners(container) {
    container.querySelectorAll(".add-btn-cell").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            e.stopPropagation();
            openAddChoreModal(btn.dataset.date);
        });
    });

    container.querySelectorAll(".cal-day").forEach(function (cell) {
        cell.addEventListener("click", function (e) {
            if (e.target.closest(".chore-chip") || e.target.closest(".add-btn-cell")) return;
            openAddChoreModal(cell.dataset.date);
        });
    });

    container.querySelectorAll(".chore-chip").forEach(function (chip) {
        chip.addEventListener("click", function (e) {
            e.stopPropagation();
            var ds = chip.dataset.date;
            var idx = parseInt(chip.dataset.idx);
            showChipPopup(ds, idx, chip);
        });
    });
}

// ---- CHIP POPUP ----
var chipPopup = document.getElementById("chip-popup");
var chipPopupContent = document.getElementById("chip-popup-content");
var activePopup = null;

function showChipPopup(ds, idx, chipEl) {
    closeChipPopup();
    var entries = state.choreEntries[ds];
    if (!entries || !entries[idx]) return;
    var entry = entries[idx];

    var html = '';
    if (entry.done) {
        html += '<button class="chip-popup-btn success" data-action="toggle">✓ Mark Undone</button>';
    } else {
        html += '<button class="chip-popup-btn success" data-action="toggle">✓ Mark Done</button>';
    }
    html += '<button class="chip-popup-btn" data-action="reassign">↻ Reassign</button>';
    html += '<button class="chip-popup-btn danger" data-action="remove">✕ Remove</button>';

    chipPopupContent.innerHTML = html;

    var rect = chipEl.getBoundingClientRect();
    chipPopup.style.top = (rect.bottom + 4) + "px";
    chipPopup.style.left = rect.left + "px";
    chipPopup.classList.remove("hidden");
    activePopup = { ds: ds, idx: idx };

    chipPopupContent.querySelector('[data-action="toggle"]').addEventListener("click", function () {
        toggleChoreCompletion(ds, idx);
        closeChipPopup();
    });

    chipPopupContent.querySelector('[data-action="remove"]').addEventListener("click", function () {
        removeChoreEntry(ds, idx);
        closeChipPopup();
    });

    chipPopupContent.querySelector('[data-action="reassign"]').addEventListener("click", function () {
        showReassignList(ds, idx);
    });
}

function showReassignList(ds, idx) {
    var entry = state.choreEntries[ds][idx];
    var html = '<div class="chip-popup-divider">Reassign to:</div>';
    state.members.forEach(function (m) {
        if (m === entry.member) return;
        var color = getMemberColor(m);
        html += '<button class="chip-popup-member" data-member="' + escAttr(m) + '"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + color + ';margin-right:6px;"></span>' + escHtml(m) + '</button>';
    });
    chipPopupContent.innerHTML = html;

    chipPopupContent.querySelectorAll(".chip-popup-member").forEach(function (btn) {
        btn.addEventListener("click", function () {
            reassignChore(ds, idx, btn.dataset.member);
            closeChipPopup();
        });
    });
}

function closeChipPopup() {
    chipPopup.classList.add("hidden");
    activePopup = null;
}

document.addEventListener("click", function (e) {
    if (activePopup && !chipPopup.contains(e.target) && !e.target.closest(".chore-chip")) {
        closeChipPopup();
    }
});

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeChipPopup();
});

// ---- CHORE ACTIONS ----
function toggleChoreCompletion(ds, idx) {
    var entries = state.choreEntries[ds];
    if (!entries || !entries[idx]) return;
    var entry = entries[idx];

    if (entry.done) {
        entry.done = false;
        addScore(entry.member, entry.freq, -POINTS[entry.freq]);
    } else {
        entry.done = true;
        addScore(entry.member, entry.freq, POINTS[entry.freq]);
    }
    saveAll();
    renderCalendar();
}

function removeChoreEntry(ds, idx) {
    var entries = state.choreEntries[ds];
    if (!entries || !entries[idx]) return;
    var entry = entries[idx];
    if (entry.done) {
        addScore(entry.member, entry.freq, -POINTS[entry.freq]);
    }
    entries.splice(idx, 1);
    if (entries.length === 0) delete state.choreEntries[ds];
    saveAll();
    renderCalendar();
}

function reassignChore(ds, idx, newMember) {
    var entries = state.choreEntries[ds];
    if (!entries || !entries[idx]) return;
    var entry = entries[idx];
    if (entry.done) {
        addScore(entry.member, entry.freq, -POINTS[entry.freq]);
        addScore(newMember, entry.freq, POINTS[entry.freq]);
    }
    entry.member = newMember;
    saveAll();
    renderCalendar();
}

function addScore(member, freq, pts) {
    if (!member) return;
    if (!state.scores[member]) state.scores[member] = { total: 0, daily: 0, weekly: 0, monthly: 0 };
    state.scores[member].total += pts;
    state.scores[member][freq] += pts;
}

// ---- ADD CHORE MODAL ----
var modalOverlay = document.getElementById("modal-overlay");
var modalBody = document.getElementById("modal-body");
var modalTitle = document.getElementById("modal-title");
var modalDate = "";

document.getElementById("modal-close").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", function (e) {
    if (e.target === modalOverlay) closeModal();
});

function closeModal() {
    modalOverlay.classList.add("hidden");
}

function openAddChoreModal(ds) {
    modalDate = ds;
    var d = new Date(ds + "T12:00:00");
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    modalTitle.textContent = "Add Chore — " + monthNames[d.getMonth()] + " " + d.getDate();
    showStep1();
    modalOverlay.classList.remove("hidden");
}

function showStep1() {
    var html = '';
    html += '<button class="modal-freq-btn" data-freq="daily"><span class="freq-label">Daily Chores</span><span class="freq-pts">10 pts</span></button>';
    html += '<button class="modal-freq-btn" data-freq="weekly"><span class="freq-label">Weekly Chores</span><span class="freq-pts">25 pts</span></button>';
    html += '<button class="modal-freq-btn" data-freq="monthly"><span class="freq-label">Monthly Chores</span><span class="freq-pts">50 pts</span></button>';
    modalBody.innerHTML = html;

    modalBody.querySelectorAll(".modal-freq-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            showStep2(btn.dataset.freq);
        });
    });
}

function showStep2(freq) {
    var categories = getChoresForFreq(freq);
    var existing = (state.choreEntries[modalDate] || []).map(function (e) { return e.name; });

    var html = '<button class="modal-back-btn">&larr; Back to frequency</button>';

    if (categories.length === 0) {
        html += '<p style="color:#999;padding:1rem 0;">No chores available. Add some in Settings.</p>';
        modalBody.innerHTML = html;
        modalBody.querySelector(".modal-back-btn").addEventListener("click", showStep1);
        return;
    }

    categories.forEach(function (cat) {
        html += '<div class="modal-category">' + escHtml(cat.category) + '</div>';
        cat.items.forEach(function (item) {
            var disabled = existing.indexOf(item) !== -1;
            html += '<button class="modal-chore-btn" data-chore="' + escAttr(item) + '" data-freq="' + freq + '"' + (disabled ? ' disabled style="opacity:0.4;cursor:default;"' : '') + '>' + escHtml(item) + (disabled ? ' (added)' : '') + '</button>';
        });
    });

    modalBody.innerHTML = html;
    modalBody.querySelector(".modal-back-btn").addEventListener("click", showStep1);

    modalBody.querySelectorAll(".modal-chore-btn:not([disabled])").forEach(function (btn) {
        btn.addEventListener("click", function () {
            showStep3(btn.dataset.freq, btn.dataset.chore);
        });
    });
}

function showStep3(freq, choreName) {
    if (state.members.length === 0) {
        var html = '<button class="modal-back-btn">&larr; Back to chores</button>';
        html += '<p style="color:#999;padding:1rem 0;">No family members. Add some in Settings first.</p>';
        modalBody.innerHTML = html;
        modalBody.querySelector(".modal-back-btn").addEventListener("click", function () { showStep2(freq); });
        return;
    }

    var html = '<button class="modal-back-btn">&larr; Back to chores</button>';
    html += '<p style="margin-bottom:0.75rem;color:#666;">Assign <strong>' + escHtml(choreName) + '</strong> to:</p>';

    state.members.forEach(function (member) {
        var color = getMemberColor(member);
        html += '<button class="modal-member-btn" data-member="' + escAttr(member) + '"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + color + ';margin-right:8px;"></span>' + escHtml(member) + '</button>';
    });

    modalBody.innerHTML = html;
    modalBody.querySelector(".modal-back-btn").addEventListener("click", function () { showStep2(freq); });

    modalBody.querySelectorAll(".modal-member-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            addChoreEntry(modalDate, choreName, freq, btn.dataset.member);
            closeModal();
            renderCalendar();
        });
    });
}

function addChoreEntry(ds, name, freq, member) {
    if (!state.choreEntries[ds]) state.choreEntries[ds] = [];
    state.choreEntries[ds].push({ name: name, freq: freq, member: member, done: false });
    saveAll();
}

// ---- LEADERBOARD (Racing Only) ----
function getScores() {
    var scores = [];
    state.members.forEach(function (member) {
        var s = state.scores[member] || { total: 0, daily: 0, weekly: 0, monthly: 0 };
        scores.push({ name: member, total: s.total, daily: s.daily, weekly: s.weekly, monthly: s.monthly });
    });
    scores.sort(function (a, b) { return b.total - a.total; });
    return scores;
}

function renderLeaderboard() {
    var container = document.getElementById("leaderboard-container");
    var scores = getScores();

    if (scores.length === 0) {
        container.innerHTML = '<p style="color:#999;padding:2rem;text-align:center;">Add family members in Settings and complete some chores to see the leaderboard.</p>';
        return;
    }

    var html = '<div class="lb-racing">';
    scores.forEach(function (s, i) {
        var color = getMemberColor(s.name);
        var darkColor = darkenColor(color, 0.15);
        html += '<div class="lb-racing-row">';
        html += '<div class="lb-racing-rank">' + (i + 1) + '</div>';
        html += '<div class="lb-racing-bar" style="background:linear-gradient(90deg,' + color + ',' + darkColor + ');">';
        html += '<span>' + escHtml(s.name) + '</span>';
        html += '<span class="lb-racing-score">' + s.total + ' pts</span>';
        html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

// ---- SETTINGS ----
function renderSettings() {
    renderMemberList();
    renderChoreManager();
    document.getElementById("title-input").value = state.appTitle;
}

function renderMemberList() {
    var list = document.getElementById("member-list");
    list.innerHTML = "";
    state.members.forEach(function (m, i) {
        ensureMemberColor(m);
        var li = document.createElement("li");

        var nameSpan = document.createElement("span");
        nameSpan.className = "member-name";
        nameSpan.textContent = m;

        var colorPicker = document.createElement("input");
        colorPicker.type = "color";
        colorPicker.className = "member-color-picker";
        colorPicker.value = state.memberColors[m];
        colorPicker.addEventListener("input", function () {
            state.memberColors[m] = colorPicker.value;
            saveAll();
        });

        var btn = document.createElement("button");
        btn.className = "remove-btn";
        btn.textContent = "Remove";
        btn.addEventListener("click", function () {
            state.members.splice(i, 1);
            delete state.memberColors[m];
            saveAll();
            renderMemberList();
        });

        li.appendChild(nameSpan);
        li.appendChild(colorPicker);
        li.appendChild(btn);
        list.appendChild(li);
    });
}

document.getElementById("add-member-btn").addEventListener("click", function () {
    var input = document.getElementById("member-input");
    var name = input.value.trim();
    if (!name || state.members.indexOf(name) !== -1) return;
    state.members.push(name);
    ensureMemberColor(name);
    input.value = "";
    saveAll();
    renderMemberList();
});

document.getElementById("member-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") document.getElementById("add-member-btn").click();
});

// ---- TITLE SETTINGS ----
document.getElementById("save-title-btn").addEventListener("click", function () {
    var input = document.getElementById("title-input");
    var text = input.value.trim();
    if (text) {
        state.appTitle = text;
        titleEl.textContent = "\u{1F3E0} " + state.appTitle;
        saveAll();
    }
});

document.getElementById("title-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") document.getElementById("save-title-btn").click();
});

// ---- CHORE MANAGER ----
var activeFreqTab = "daily";

document.querySelectorAll(".freq-tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".freq-tab").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        activeFreqTab = btn.dataset.freq;
        renderChoreManager();
    });
});

function renderChoreManager() {
    var container = document.getElementById("chore-list-manager");
    var freq = activeFreqTab;
    var hidden = state.hiddenChores[freq] || [];

    var html = '<ul class="chore-manager-list">';

    DEFAULT_CHORES[freq].forEach(function (cat) {
        html += '<li class="cat-header">' + escHtml(cat.category) + '</li>';
        cat.items.forEach(function (item) {
            var isHidden = hidden.indexOf(item) !== -1;
            if (isHidden) {
                html += '<li style="opacity:0.5;"><span style="text-decoration:line-through;">' + escHtml(item) + '</span>';
                html += '<button class="restore-btn" data-chore="' + escAttr(item) + '" data-freq="' + freq + '">Restore</button></li>';
            } else {
                html += '<li><span>' + escHtml(item) + '</span>';
                html += '<button class="remove-chore-btn" data-chore="' + escAttr(item) + '" data-freq="' + freq + '" data-type="default">&times;</button></li>';
            }
        });
    });

    var custom = state.customChores[freq] || [];
    if (custom.length > 0) {
        html += '<li class="cat-header">Custom</li>';
        custom.forEach(function (item) {
            html += '<li><span>' + escHtml(item) + '</span>';
            html += '<button class="remove-chore-btn" data-chore="' + escAttr(item) + '" data-freq="' + freq + '" data-type="custom">&times;</button></li>';
        });
    }

    html += '</ul>';
    container.innerHTML = html;

    container.querySelectorAll(".remove-chore-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var chore = btn.dataset.chore;
            var f = btn.dataset.freq;
            if (btn.dataset.type === "default") {
                if (!state.hiddenChores[f]) state.hiddenChores[f] = [];
                state.hiddenChores[f].push(chore);
            } else {
                var arr = state.customChores[f];
                var idx = arr.indexOf(chore);
                if (idx !== -1) arr.splice(idx, 1);
            }
            saveAll();
            renderChoreManager();
        });
    });

    container.querySelectorAll(".restore-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var chore = btn.dataset.chore;
            var f = btn.dataset.freq;
            var arr = state.hiddenChores[f];
            var idx = arr.indexOf(chore);
            if (idx !== -1) arr.splice(idx, 1);
            saveAll();
            renderChoreManager();
        });
    });
}

document.getElementById("add-new-chore-btn").addEventListener("click", function () {
    var input = document.getElementById("new-chore-input");
    var name = input.value.trim();
    if (!name) return;
    if (!state.customChores[activeFreqTab]) state.customChores[activeFreqTab] = [];
    state.customChores[activeFreqTab].push(name);
    input.value = "";
    saveAll();
    renderChoreManager();
});

document.getElementById("new-chore-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") document.getElementById("add-new-chore-btn").click();
});

// ---- RESET ----
document.getElementById("reset-btn").addEventListener("click", function () {
    if (!confirm("This will erase all data. Are you sure?")) return;
    localStorage.clear();
    state.members = [];
    state.choreEntries = {};
    state.scores = {};
    state.customChores = { daily: [], weekly: [], monthly: [] };
    state.hiddenChores = { daily: [], weekly: [], monthly: [] };
    state.memberColors = {};
    state.appTitle = "Our Family Chores";
    titleEl.textContent = "\u{1F3E0} " + state.appTitle;
    renderCalendar();
    renderSettings();
});

// ---- UTILITIES ----
function pad(str, len) {
    while (str.length < len) str += " ";
    return str;
}

function escHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function escAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---- INIT ----
renderCalendar();
