
const STORAGE_KEY = "taskflow-tasks-v1";

const $ = (selector) => document.querySelector(selector);

const taskForm = $("#task-form");
const taskTitle = $("#task-title");
const taskDescription = $("#task-description");
const taskCategory = $("#task-category");
const taskPriority = $("#task-priority");
const taskDeadline = $("#task-deadline");
const taskList = $("#task-list");
const emptyState = $("#empty-state");
const searchInput = $("#search-input");
const priorityFilter = $("#priority-filter");

let tasks = loadTasks();
let currentFilter = "All";
let editingId = null;

function dateOffset(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return localDateString(date);
}

function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function createDemoTasks() {
    const now = new Date().toISOString();

    return [
        {
            id: "demo-1",
            title: "Review weekly goals",
            description: "Choose the most important things to finish this week.",
            category: "Personal",
            priority: "High",
            deadline: dateOffset(0),
            completed: false,
            createdAt: now
        },
        {
            id: "demo-2",
            title: "Finish portfolio updates",
            description: "Check responsive layouts and polish the project cards.",
            category: "Work",
            priority: "High",
            deadline: dateOffset(1),
            completed: false,
            createdAt: now
        },
        {
            id: "demo-3",
            title: "Study database concepts",
            description: "Revise SQL queries, joins, and normalization.",
            category: "Study",
            priority: "Medium",
            deadline: dateOffset(2),
            completed: false,
            createdAt: now
        },
        {
            id: "demo-4",
            title: "Plan a new project",
            description: "Write down the main features and the first milestones.",
            category: "Work",
            priority: "Medium",
            deadline: dateOffset(4),
            completed: false,
            createdAt: now
        },
        {
            id: "demo-5",
            title: "Organize project files",
            description: "Clean up folders and update project documentation.",
            category: "Personal",
            priority: "Low",
            deadline: dateOffset(5),
            completed: false,
            createdAt: now
        },
        {
            id: "demo-6",
            title: "Complete daily reading",
            description: "Make time for a short reading session.",
            category: "Personal",
            priority: "Low",
            deadline: "",
            completed: true,
            createdAt: dateOffset(-1) + "T10:00:00.000Z",
            completedAt: new Date().toISOString()
        },
        {
            id: "demo-7",
            title: "Review Java practice",
            description: "Revisit a previous exercise and improve the solution.",
            category: "Study",
            priority: "Medium",
            deadline: "",
            completed: true,
            createdAt: dateOffset(-2) + "T10:00:00.000Z",
            completedAt: new Date().toISOString()
        }
    ];
}

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === null) {
            const demos = createDemoTasks();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(demos));
            return demos;
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) return [];

        return parsed.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            ["Low", "Medium", "High"].includes(task.priority) &&
            typeof task.completed === "boolean"
        ).map(task => ({
            ...task,
            description: task.description || "",
            category: task.category || "Personal",
            deadline: task.deadline || "",
            createdAt: task.createdAt || new Date().toISOString()
        }));
    } catch (error) {
        console.error("Could not load tasks:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        alert("Could not save your tasks. Check your browser storage settings.");
        return false;
    }
}

function formatDate(dateString, options = {}) {
    if (!dateString) return "";

    const date = new Date(`${dateString}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        ...options
    });
}

function formatToday() {
    $("#today-date").textContent = new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function openForm(task = null) {
    editingId = task ? task.id : null;
    taskForm.reset();

    $("#form-heading").textContent = task ? "Edit a task" : "Create a task";
    $("#save-button").textContent = task ? "Update task ↗" : "Save task ↗";

    if (task) {
        taskTitle.value = task.title;
        taskDescription.value = task.description || "";
        taskCategory.value = task.category || "Personal";
        taskPriority.value = task.priority;
        taskDeadline.value = task.deadline || "";
    } else {
        taskCategory.value = "Personal";
        taskPriority.value = "Medium";
    }

    taskForm.classList.remove("hidden");
    taskTitle.focus();
    taskForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeForm() {
    taskForm.classList.add("hidden");
    taskForm.reset();
    editingId = null;
}

function setView(view) {
    currentFilter = view;
    const titles = {
        All: "Overview",
        Active: "My tasks",
        Upcoming: "Upcoming",
        Completed: "Completed"
    };

    $("#breadcrumb-title").textContent = titles[view] || "Overview";
    $("#list-heading").firstChild.textContent =
        view === "All" ? "My tasks " : `${titles[view]} `;

    $("#page-title").innerHTML = {
        All: 'Good things take <span>focus.</span>',
        Active: 'Make progress, <span>daily.</span>',
        Upcoming: 'Plan ahead with <span>clarity.</span>',
        Completed: 'Look how far you’ve <span>come.</span>'
    }[view] || 'Good things take <span>focus.</span>';

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.toggle("active", button.dataset.view === view);
    });

    renderTasks();
}

function getVisibleTasks() {
    const query = searchInput.value.trim().toLowerCase();
    const priority = priorityFilter.value;
    const today = dateOffset(0);

    return tasks.filter(task => {
        let matchesView = true;

        if (currentFilter === "Active") {
            matchesView = !task.completed;
        } else if (currentFilter === "Completed") {
            matchesView = task.completed;
        } else if (currentFilter === "Upcoming") {
            matchesView = !task.completed && Boolean(task.deadline);
        }

        const matchesQuery =
            task.title.toLowerCase().includes(query) ||
            (task.description || "").toLowerCase().includes(query) ||
            (task.category || "").toLowerCase().includes(query);

        const matchesPriority =
            priority === "All" || task.priority === priority;

        return matchesView && matchesQuery && matchesPriority;
    }).sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);

        if (!a.deadline) return b.deadline ? 1 : -1;
        if (!b.deadline) return 1;

        return a.deadline.localeCompare(b.deadline);
    });
}

function renderTasks() {
    const visibleTasks = getVisibleTasks();
    taskList.replaceChildren();

    visibleTasks.forEach((task, index) => {
        const item = makeElement(
            "article",
            `task-item${task.completed ? " is-completed" : ""}`
        );
        item.style.animationDelay = `${Math.min(index * 35, 245)}ms`;

        const checkbox = makeElement("input", "task-check");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", `Mark ${task.title} complete`);
        checkbox.addEventListener("change", () => toggleTask(task.id));

        const main = makeElement("div", "task-main");
        main.append(makeElement("div", "task-title", task.title));

        if (task.description) {
            main.append(makeElement("p", "task-description", task.description));
        }

        const meta = makeElement("div", "task-meta");
        meta.append(makeElement(
            "span",
            `priority priority-${task.priority.toLowerCase()}`,
            `${task.priority} priority`
        ));
        meta.append(makeElement("span", "category-chip", task.category || "Personal"));

        if (task.deadline) {
            const today = dateOffset(0);
            const deadlineLabel = task.deadline < today
                ? `Overdue · ${formatDate(task.deadline)}`
                : `Due ${formatDate(task.deadline)}`;

            meta.append(makeElement("span", "deadline", deadlineLabel));
        }

        main.append(meta);

        const actions = makeElement("div", "task-actions");

        const editButton = makeElement("button", "icon-button", "✎");
        editButton.type = "button";
        editButton.title = "Edit task";
        editButton.setAttribute("aria-label", `Edit ${task.title}`);
        editButton.addEventListener("click", () => openForm(task));

        const deleteButton = makeElement("button", "icon-button delete-button", "×");
        deleteButton.type = "button";
        deleteButton.title = "Delete task";
        deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
        deleteButton.addEventListener("click", () => deleteTask(task.id));

        actions.append(editButton, deleteButton);
        item.append(checkbox, main, actions);
        taskList.append(item);
    });

    taskList.classList.toggle("hidden", visibleTasks.length === 0);
    emptyState.classList.toggle("hidden", visibleTasks.length !== 0);

    if (visibleTasks.length === 0) {
        $("#empty-state h3").textContent = tasks.length === 0
            ? "A fresh start"
            : "Nothing matches just yet";

        $("#empty-state p").textContent = tasks.length === 0
            ? "Add your first task and give your ideas a place to start."
            : "Try changing your filters or adding a new task.";
    }

    const completed = tasks.filter(task => task.completed).length;
    const active = tasks.length - completed;
    const rate = tasks.length ? Math.round(completed / tasks.length * 100) : 0;

    $("#total-count").textContent = tasks.length;
    $("#active-count").textContent = active;
    $("#completed-count").textContent = completed;
    $("#completion-rate").textContent = `${rate}%`;
    $("#completion-bar").style.width = `${rate}%`;
    $("#sidebar-active").textContent = active;
    $("#visible-count").textContent = visibleTasks.length;
    $("#task-summary").textContent =
        `${visibleTasks.length} shown · ${tasks.length} total`;

    document.querySelectorAll(".filter-button").forEach(button => {
        button.classList.toggle("active", button.dataset.filter === currentFilter);
        button.setAttribute("aria-pressed", String(button.dataset.filter === currentFilter));
    });

    renderUpcoming();
    renderWeeklyChart();
}

function toggleTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    const completed = !task.completed;

    tasks = tasks.map(item => item.id === id
        ? {
            ...item,
            completed,
            completedAt: completed ? new Date().toISOString() : ""
        }
        : item
    );

    if (saveTasks()) renderTasks();
}

function deleteTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    if (!confirm(`Delete "${task.title}"?`)) return;

    tasks = tasks.filter(item => item.id !== id);
    if (saveTasks()) renderTasks();
}

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskTitle.value.trim();
    if (!title) {
        taskTitle.focus();
        return;
    }

    const existing = tasks.find(task => task.id === editingId);

    const task = {
        id: editingId || (
            typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`
        ),
        title,
        description: taskDescription.value.trim(),
        category: taskCategory.value,
        priority: taskPriority.value,
        deadline: taskDeadline.value,
        completed: existing ? existing.completed : false,
        createdAt: existing ? existing.createdAt : new Date().toISOString(),
        completedAt: existing ? (existing.completedAt || "") : ""
    };

    if (editingId) {
        tasks = tasks.map(item => item.id === editingId ? task : item);
    } else {
        tasks.unshift(task);
    }

    if (saveTasks()) {
        closeForm();
        renderTasks();
    }
});

function renderUpcoming() {
    const container = $("#upcoming-list");
    container.replaceChildren();

    const today = dateOffset(0);
    const upcoming = tasks
        .filter(task => !task.completed && task.deadline)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 4);

    if (upcoming.length === 0) {
        container.append(makeElement(
            "p",
            "upcoming-empty",
            "No deadlines scheduled. You're all clear!"
        ));
        return;
    }

    upcoming.forEach(task => {
        const date = makeElement("div", "due-date");
        date.append(makeElement("span", "", new Date(
            `${task.deadline}T12:00:00`
        ).toLocaleDateString(undefined, { month: "short" })));
        date.append(makeElement("strong", "", String(
            new Date(`${task.deadline}T12:00:00`).getDate()
        )));

        const copy = makeElement("div", "upcoming-copy");
        copy.append(makeElement("strong", "", task.title));

        const description = task.deadline < today
            ? "Overdue"
            : task.deadline === today
                ? "Due today"
                : `Due ${formatDate(task.deadline, { year: undefined })}`;

        copy.append(makeElement("span", "", description));

        const dot = makeElement(
            "span",
            `due-dot${task.deadline < today ? " overdue" : ""}`
        );

        const row = makeElement("div", "upcoming-item");
        row.append(date, copy, dot);
        container.append(row);
    });
}

function renderWeeklyChart() {
    const container = $("#weekly-chart");
    container.replaceChildren();

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const days = [];

    for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        const key = localDateString(date);

        const count = tasks.filter(task => {
            if (!task.completed || !task.completedAt) return false;
            const completedDate = new Date(task.completedAt);
            return !Number.isNaN(completedDate.getTime()) &&
                localDateString(completedDate) === key;
        }).length;

        days.push({ date, key, count });
    }

    const max = Math.max(1, ...days.map(day => day.count));

    days.forEach((day, index) => {
        const col = makeElement(
            "div",
            `week-day${index === 6 ? " today" : ""}`
        );

        const wrap = makeElement("div", "week-bar-wrap");
        const bar = makeElement("span", "week-bar");
        bar.style.height = `${Math.max(4, day.count / max * 100)}%`;
        bar.style.animationDelay = `${index * 55}ms`;
        bar.title = `${day.count} completed`;

        wrap.append(bar);
        col.append(wrap);

        col.append(makeElement("span", "", day.date.toLocaleDateString(
            undefined, { weekday: "short" }
        )));

        container.append(col);
    });

    const total = days.reduce((sum, day) => sum + day.count, 0);
    $("#weekly-total").textContent = `${total} completed this week`;
}

function clearCompleted() {
    const count = tasks.filter(task => task.completed).length;

    if (!count) {
        alert("There are no completed tasks to clear.");
        return;
    }

    if (!confirm(`Delete all ${count} completed task(s)?`)) return;

    tasks = tasks.filter(task => !task.completed);
    if (saveTasks()) renderTasks();
}

/* Buttons and navigation */

$("#header-add-button").addEventListener("click", () => openForm());
$("#panel-add-button").addEventListener("click", () => openForm());
$("#empty-add-button").addEventListener("click", () => openForm());
$("#cancel-button").addEventListener("click", closeForm);
$("#close-form-button").addEventListener("click", closeForm);
$("#clear-completed-button").addEventListener("click", clearCompleted);

document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll(".filter-button").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        renderTasks();
    });
});

searchInput.addEventListener("input", renderTasks);
priorityFilter.addEventListener("change", renderTasks);

document.addEventListener("keydown", event => {
    const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(
        document.activeElement?.tagName
    );

    if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchInput.focus();
    }

    if (event.key === "Escape" && !taskForm.classList.contains("hidden")) {
        closeForm();
    }
});

formatToday();
setView("All");
