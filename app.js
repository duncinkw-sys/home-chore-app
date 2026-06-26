var DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
}

function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

var state = {
    members: load("members", []),
    weeklyAssignments: load("weeklyAssignments", {}),
    dailyChecks: load("dailyChecks", {}),
    monthlyChecks: load("monthlyChecks", {}),
    customChores: load("customChores", { daily: [], weekly: [], monthly: [] }),
    completionLog: load("completionLog", {})
};

function saveAll() {
    save("members", state.members);
    save("weeklyAssignments", state.weeklyAssignments);
    save("dailyChecks", state.dailyChecks);
    save("monthlyChecks", state.monthlyChecks);
    save("customChores", state.customChores);
    save("completionLog", state.completionLog);
}

function getWeekKey() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 1);
    var week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
    return now.getFullYear() + "-W" + week;
}

function getDayKey() {
    return new Date().toISOString().slice(0, 10);
}

function getMonthKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function getAllWeeklyChores() {
    var chores = [];
    DEFAULT_CHORES.weekly.forEach(function (cat) {
        cat.items.forEach(function (item) { chores.push(item); });
    });
    state.customChores.weekly.forEach(function (item) { chores.push(item); });
    return chores;
}

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
    if (tab === "weekly") renderWeeklyGrid();
    else if (tab === "daily") renderChecklist("daily");
    else if (tab === "monthly") renderChecklist("monthly");
    else if (tab === "leaderboard") renderLeaderboard();
    else if (tab === "settings") renderSettings();
}

// ---- WEEKLY GRID ----
function renderWeeklyGrid() {
    var tbody = document.getElementById("weekly-body");
    tbody.innerHTML = "";
    var chores = getAllWeeklyChores();
    var weekKey = getWeekKey();

    if (state.members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding:2rem;text-align:center;color:#999;">Add family members in Settings to get started.</td></tr>';
        return;
    }

    state.members.forEach(function (member) {
        var tr = document.createElement("tr");
        var memberTd = document.createElement("td");
        memberTd.className = "member-cell";
        memberTd.textContent = member;
        tr.appendChild(memberTd);

        DAYS.forEach(function (day) {
            var td = document.createElement("td");
            var aKey = weekKey + "|" + member + "|" + day;
            var assigned = state.weeklyAssignments[aKey] || [];

            assigned.forEach(function (chore) {
                var doneKey = aKey + "|" + chore;
                var isDone = !!state.completionLog[doneKey];
                var chip = document.createElement("span");
                chip.className = "chore-chip " + (isDone ? "done" : "owner");
                chip.textContent = chore;
                chip.title = isDone ? "Completed — click to undo" : "Assigned — click to mark done";
                chip.addEventListener("click", function () {
                    if (isDone) {
                        delete state.completionLog[doneKey];
                    } else {
                        state.completionLog[doneKey] = { by: member, at: new Date().toISOString() };
                    }
                    saveAll();
                    renderWeeklyGrid();
                });
                td.appendChild(chip);
            });

            var addBtn = document.createElement("select");
            addBtn.innerHTML = '<option value="">+ add</option>';
            chores.forEach(function (c) {
                if (assigned.indexOf(c) === -1) {
                    var opt = document.createElement("option");
                    opt.value = c;
                    opt.textContent = c;
                    addBtn.appendChild(opt);
                }
            });
            addBtn.style.cssText = "font-size:0.7rem;width:100%;margin-top:4px;padding:2px;border:1px solid #ddd;border-radius:3px;color:#999;";
            addBtn.addEventListener("change", function () {
                if (!addBtn.value) return;
                if (!state.weeklyAssignments[aKey]) state.weeklyAssignments[aKey] = [];
                state.weeklyAssignments[aKey].push(addBtn.value);
                saveAll();
                renderWeeklyGrid();
            });
            td.appendChild(addBtn);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

// ---- CHECKLISTS (daily/monthly) ----
function renderChecklist(freq) {
    var container = document.getElementById(freq + "-list");
    container.innerHTML = "";
    var categories = DEFAULT_CHORES[freq].slice();
    var custom = state.customChores[freq] || [];
    if (custom.length > 0) {
        categories = categories.concat([{ category: "Custom", items: custom }]);
    }

    var checkState = freq === "daily" ? state.dailyChecks : state.monthlyChecks;
    var periodKey = freq === "daily" ? getDayKey() : getMonthKey();

    categories.forEach(function (cat) {
        var header = document.createElement("div");
        header.className = "checklist-category";
        header.textContent = cat.category;
        container.appendChild(header);

        cat.items.forEach(function (item) {
            var key = periodKey + "|" + item;
            var checked = !!checkState[key];
            var div = document.createElement("div");
            div.className = "checklist-item" + (checked ? " checked" : "");

            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = checked;

            var lbl = document.createElement("label");
            lbl.textContent = item;

            var sel = document.createElement("select");
            sel.innerHTML = '<option value="">—</option>';
            state.members.forEach(function (m) {
                var opt = document.createElement("option");
                opt.value = m;
                opt.textContent = m;
                if (checkState[key] && checkState[key].by === m) opt.selected = true;
                sel.appendChild(opt);
            });

            cb.addEventListener("change", function () {
                if (cb.checked) {
                    checkState[key] = { by: sel.value || "", at: new Date().toISOString() };
                    if (sel.value) logCompletion(sel.value, freq);
                } else {
                    delete checkState[key];
                }
                saveAll();
                renderChecklist(freq);
            });

            sel.addEventListener("change", function () {
                if (checkState[key]) checkState[key].by = sel.value;
                saveAll();
            });

            lbl.addEventListener("click", function () { cb.click(); });

            div.appendChild(cb);
            div.appendChild(lbl);
            div.appendChild(sel);
            container.appendChild(div);
        });
    });
}

function logCompletion(member, freq) {
    var logKey = "score|" + member;
    if (!state.completionLog[logKey]) state.completionLog[logKey] = { total: 0, daily: 0, weekly: 0, monthly: 0 };
    state.completionLog[logKey].total++;
    state.completionLog[logKey][freq]++;
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
        var weekKey = getWeekKey();
        var weeklyDone = 0;
        var keys = Object.keys(state.completionLog);
        keys.forEach(function (k) {
            if (k.indexOf(weekKey + "|" + member + "|") === 0) weeklyDone++;
        });

        var logKey = "score|" + member;
        var log = state.completionLog[logKey] || { total: 0, daily: 0, weekly: 0, monthly: 0 };

        scores.push({
            name: member,
            total: log.total + weeklyDone,
            daily: log.daily,
            weekly: weeklyDone,
            monthly: log.monthly
        });
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
        html += '<span class="lb-racing-score">' + s.total + '</span>';
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
    lines.push("CHORE LEADERBOARD");
    lines.push("=================");
    lines.push("");
    lines.push(pad("Rank", 6) + pad("Name", 16) + pad("Daily", 8) + pad("Weekly", 8) + pad("Monthly", 9) + "Total");
    lines.push("----  --------------  ------  ------  -------  -----");
    scores.forEach(function (s, i) {
        lines.push(pad("#" + (i + 1), 6) + pad(s.name, 16) + pad(String(s.daily), 8) + pad(String(s.weekly), 8) + pad(String(s.monthly), 9) + s.total);
    });
    container.innerHTML = '<div class="lb-plain">' + escHtml(lines.join("\n")) + '</div>';
}

function pad(str, len) {
    while (str.length < len) str += " ";
    return str;
}

function escHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ---- SETTINGS ----
function renderSettings() {
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
            renderSettings();
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
    renderSettings();
});

document.getElementById("member-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") document.getElementById("add-member-btn").click();
});

document.getElementById("add-chore-btn").addEventListener("click", function () {
    var input = document.getElementById("custom-chore-input");
    var freq = document.getElementById("custom-chore-freq").value;
    var name = input.value.trim();
    if (!name) return;
    if (!state.customChores[freq]) state.customChores[freq] = [];
    state.customChores[freq].push(name);
    input.value = "";
    saveAll();
});

document.getElementById("custom-chore-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") document.getElementById("add-chore-btn").click();
});

document.getElementById("reset-btn").addEventListener("click", function () {
    if (!confirm("This will erase all data. Are you sure?")) return;
    localStorage.clear();
    state.members = [];
    state.weeklyAssignments = {};
    state.dailyChecks = {};
    state.monthlyChecks = {};
    state.customChores = { daily: [], weekly: [], monthly: [] };
    state.completionLog = {};
    renderActiveTab("weekly");
    renderSettings();
});

// ---- INIT ----
renderWeeklyGrid();
