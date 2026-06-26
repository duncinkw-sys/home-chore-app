var DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
var POINTS = { daily: 10, weekly: 25, monthly: 50 };

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
    hiddenChores: load("hiddenChores", { daily: [], weekly: [], monthly: [] })
};

function saveAll() {
    save("members", state.members);
    save("choreEntries", state.choreEntries);
    save("scores", state.scores);
    save("customChores", state.customChores);
    save("hiddenChores", state.hiddenChores);
}

// ---- MIGRATION from old format ----
(function migrate() {
    var oldWeekly = localStorage.getItem("weeklyAssignments");
    var oldDaily = localStorage.getItem("dailyChecks");
    var oldMonthly = localStorage.getItem("monthlyChecks");
    var oldLog = localStorage.getItem("completionLog");
    if (!oldWeekly && !oldDaily && !oldMonthly) return;

    localStorage.removeItem("weeklyAssignments");
    localStorage.removeItem("dailyChecks");
    localStorage.removeItem("monthlyChecks");
    localStorage.removeItem("completionLog");
    saveAll();
})();

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

function getAllChoreNames(freq) {
    var names = [];
    getChoresForFreq(freq).forEach(function (cat) {
        cat.items.forEach(function (i) { names.push(i); });
    });
    return names;
}

function dateStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function todayStr() { return dateStr(new Date()); }

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
    if (calView === "month") {
        calDate.setMonth(calDate.getMonth() - 1);
    } else {
        calDate.setDate(calDate.getDate() - 7);
    }
    renderCalendar();
});

document.getElementById("cal-next").addEventListener("click", function () {
    if (calView === "month") {
        calDate.setMonth(calDate.getMonth() + 1);
    } else {
        calDate.setDate(calDate.getDate() + 7);
    }
    renderCalendar();
});

// ---- RENDER CALENDAR ----
function renderCalendar() {
    var container = document.getElementById("calendar-grid");
    var title = document.getElementById("cal-title");

    if (calView === "month") {
        renderMonthView(container, title);
    } else {
        renderWeekView(container, title);
    }
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
        var ds = dateStr(wd);
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
        html += '<div class="chore-chip ' + cls + '" data-date="' + ds + '" data-idx="' + idx + '" title="' + (entry.done ? "Completed" : "Click to complete") + '">';
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
            toggleChoreCompletion(ds, idx);
        });
    });
}

// ---- TOGGLE COMPLETION ----
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
    var html = "";
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
        html += '<button class="modal-member-btn" data-member="' + escAttr(member) + '">' + escHtml(member) + '</button>';
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

// ---- LEADERBOARD ----
document.querySelectorAll(".lb-style-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
        e.stopPropagation();
        document.querySelectorAll(".lb-style-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        renderLeaderboard();
    });
});

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
    var style = document.querySelector(".lb-style-btn.active").dataset.style;
    var scores = getScores();

    if (scores.length === 0) {
        container.innerHTML = '<p style="color:#999;padding:2rem;text-align:center;">Add family members in Settings and complete some chores to see the leaderboard.</p>';
        return;
    }

    if (style === "racing") renderRacing(container, scores);
    else if (style === "scorecard") renderScorecard(container, scores);
    else renderPlain(container, scores);
}

function renderRacing(container, scores) {
    var html = '<div class="lb-racing">';
    scores.forEach(function (s, i) {
        html += '<div class="lb-racing-row">';
        html += '<div class="lb-racing-rank">' + (i + 1) + '</div>';
        html += '<div class="lb-racing-bar">';
        html += '<span>' + escHtml(s.name) + '</span>';
        html += '<span class="lb-racing-score">' + s.total + ' pts</span>';
        html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderScorecard(container, scores) {
    var maxScore = 0;
    var minScore = Infinity;
    scores.forEach(function (s) {
        if (s.total > maxScore) maxScore = s.total;
        if (s.total < minScore) minScore = s.total;
    });

    var html = '<div class="lb-scorecard"><table>';
    html += '<thead><tr><th>MEMBER</th><th>DAILY</th><th>WEEKLY</th><th>MONTHLY</th><th>TOTAL</th></tr></thead><tbody>';
    scores.forEach(function (s) {
        var cls = s.total === maxScore && scores.length > 1 ? "score-high" : (s.total === minScore && scores.length > 1 ? "score-low" : "");
        html += '<tr>';
        html += '<td>' + escHtml(s.name) + '</td>';
        html += '<td>' + s.daily + '</td>';
        html += '<td>' + s.weekly + '</td>';
        html += '<td>' + s.monthly + '</td>';
        html += '<td class="score-total ' + cls + '">' + s.total + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderPlain(container, scores) {
    var lines = [];
    lines.push("CHORE LEADERBOARD (Points)");
    lines.push("==========================");
    lines.push("");
    lines.push(pad("Rank", 6) + pad("Name", 16) + pad("Daily", 8) + pad("Weekly", 8) + pad("Monthly", 9) + "Total");
    lines.push("----  --------------  ------  ------  -------  -----");
    scores.forEach(function (s, i) {
        lines.push(pad("#" + (i + 1), 6) + pad(s.name, 16) + pad(String(s.daily), 8) + pad(String(s.weekly), 8) + pad(String(s.monthly), 9) + s.total);
    });
    container.innerHTML = '<div class="lb-plain">' + escHtml(lines.join("\n")) + '</div>';
}

// ---- SETTINGS ----
function renderSettings() {
    renderMemberList();
    renderChoreManager();
}

function renderMemberList() {
    var list = document.getElementById("member-list");
    list.innerHTML = "";
    state.members.forEach(function (m, i) {
        var li = document.createElement("li");
        li.innerHTML = '<span>' + escHtml(m) + '</span>';
        var btn = document.createElement("button");
        btn.className = "remove-btn";
        btn.textContent = "Remove";
        btn.addEventListener("click", function () {
            state.members.splice(i, 1);
            saveAll();
            renderMemberList();
        });
        li.appendChild(btn);
        list.appendChild(li);
    });
}

document.getElementById("add-member-btn").addEventListener("click", function () {
    var input = document.getElementById("member-input");
    var name = input.value.trim();
    if (!name || state.members.indexOf(name) !== -1) return;
    state.members.push(name);
    input.value = "";
    saveAll();
    renderMemberList();
});

document.getElementById("member-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") document.getElementById("add-member-btn").click();
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
