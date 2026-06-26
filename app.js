const choreInput = document.getElementById("chore-input");
const assigneeSelect = document.getElementById("assignee-select");
const addBtn = document.getElementById("add-btn");
const memberInput = document.getElementById("member-input");
const addMemberBtn = document.getElementById("add-member-btn");
const choreList = document.getElementById("chore-list");

let chores = JSON.parse(localStorage.getItem("chores")) || [];
let members = JSON.parse(localStorage.getItem("members")) || [];

function save() {
    localStorage.setItem("chores", JSON.stringify(chores));
    localStorage.setItem("members", JSON.stringify(members));
}

function renderMembers() {
    assigneeSelect.innerHTML = '<option value="">Assign to...</option>';
    members.forEach(function (member) {
        const option = document.createElement("option");
        option.value = member;
        option.textContent = member;
        assigneeSelect.appendChild(option);
    });
}

function renderChores() {
    choreList.innerHTML = "";
    chores.forEach(function (chore, index) {
        const div = document.createElement("div");
        div.className = "chore-item" + (chore.done ? " done" : "");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = chore.done;
        checkbox.addEventListener("change", function () {
            chores[index].done = checkbox.checked;
            save();
            renderChores();
        });

        const name = document.createElement("span");
        name.className = "chore-name";
        name.textContent = chore.name;

        const assignee = document.createElement("span");
        assignee.className = "chore-assignee";
        assignee.textContent = chore.assignee || "Unassigned";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", function () {
            chores.splice(index, 1);
            save();
            renderChores();
        });

        div.appendChild(checkbox);
        div.appendChild(name);
        div.appendChild(assignee);
        div.appendChild(deleteBtn);
        choreList.appendChild(div);
    });
}

addBtn.addEventListener("click", function () {
    const name = choreInput.value.trim();
    if (!name) return;
    chores.push({ name: name, assignee: assigneeSelect.value, done: false });
    choreInput.value = "";
    save();
    renderChores();
});

addMemberBtn.addEventListener("click", function () {
    const name = memberInput.value.trim();
    if (!name) return;
    members.push(name);
    memberInput.value = "";
    save();
    renderMembers();
});

choreInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") addBtn.click();
});

memberInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") addMemberBtn.click();
});

renderMembers();
renderChores();
