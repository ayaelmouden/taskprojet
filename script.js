const STORAGE_KEY = "taskflow_aya_tasks_v1";
const $ = (selector) => document.querySelector(selector);
const taskForm = $("#taskForm");
const taskInput = $("#taskInput");
const taskDate = $("#taskDate");
const taskPriority = $("#taskPriority");
const taskList = $("#taskList");
const emptyState = $("#emptyState");
const searchInput = $("#searchInput");
let tasks = loadTasks();
let currentFilter = "all";
let editingId = null;
let toastTimer;

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
function makeId() {
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}
function formatDate(date) {
  if (!date) return "Aucune échéance";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"});
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}
function updateStats() {
  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.length - completed;
  const today = new Date().toISOString().slice(0,10);
  $("#totalCount").textContent = tasks.length;
  $("#completedCount").textContent = completed;
  $("#pendingCount").textContent = pending;
  $("#todayCount").textContent = tasks.filter(t => !t.completed && t.date === today).length;
  $("#allFilterCount").textContent = tasks.length;
  $("#pendingFilterCount").textContent = pending;
  $("#completedFilterCount").textContent = completed;
}
function renderTasks() {
  updateStats();
  const query = searchInput.value.trim().toLowerCase();
  const visible = tasks.filter(task => {
    const matchesFilter = currentFilter === "all" || (currentFilter === "completed" ? task.completed : !task.completed);
    return matchesFilter && task.title.toLowerCase().includes(query);
  });
  taskList.innerHTML = "";
  emptyState.classList.toggle("hidden", visible.length !== 0);
  visible.forEach(task => {
    const item = document.createElement("article");
    item.className = `task-item ${task.completed ? "is-complete" : ""}`;
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "task-check";
    check.checked = task.completed;
    check.setAttribute("aria-label", `Marquer ${task.title} comme ${task.completed ? "non terminée" : "terminée"}`);
    check.addEventListener("change", () => toggleTask(task.id));
    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "task-name";
    title.textContent = task.title;
    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.textContent = `▣  ${formatDate(task.date)}`;
    info.append(title, meta);
    const priority = document.createElement("span");
    priority.className = `priority ${task.priority}`;
    priority.textContent = `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`;
    const actions = document.createElement("div");
    actions.className = "task-actions";
    const edit = document.createElement("button");
    edit.className = "icon-btn edit-btn";
    edit.type = "button";
    edit.title = "Modifier";
    edit.setAttribute("aria-label", `Modifier ${task.title}`);
    edit.textContent = "✎";
    edit.addEventListener("click", () => startEdit(task.id));
    const del = document.createElement("button");
    del.className = "icon-btn delete-btn";
    del.type = "button";
    del.title = "Supprimer";
    del.setAttribute("aria-label", `Supprimer ${task.title}`);
    del.textContent = "⌫";
    del.addEventListener("click", () => deleteTask(task.id));
    actions.append(edit, del);
    item.append(check, info, priority, actions);
    taskList.append(item);
  });
}
function resetForm() {
  taskForm.reset();
  editingId = null;
  $("#formTitle").textContent = "Add New Task";
  $("#submitBtn").textContent = "＋ Ajouter";
  $("#cancelEdit").classList.add("hidden");
}
taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    showToast("Veuillez saisir le nom de la tâche.");
    return;
  }
  if (editingId) {
    const task = tasks.find(t => t.id === editingId);
    if (task) Object.assign(task, {title, date:taskDate.value, priority:taskPriority.value});
    showToast("Tâche modifiée avec succès !");
  } else {
    tasks.unshift({id:makeId(), title, date:taskDate.value, priority:taskPriority.value, completed:false, createdAt:Date.now()});
    showToast("Nouvelle tâche ajoutée !");
  }
  saveTasks();
  resetForm();
  renderTasks();
});
function startEdit(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;
  taskInput.value = task.title;
  taskDate.value = task.date || "";
  taskPriority.value = task.priority;
  $("#formTitle").textContent = "Modifier la tâche";
  $("#submitBtn").textContent = "✓ Enregistrer";
  $("#cancelEdit").classList.remove("hidden");
  taskInput.focus();
  window.scrollTo({top:0, behavior:"smooth"});
}
function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  renderTasks();
  showToast(task.completed ? "Bravo ! Tâche terminée 🎉" : "Tâche remise en attente.");
}
function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task || !confirm(`Supprimer "${task.title}"?`)) return;
  tasks = tasks.filter(t => t.id !== id);
  if (editingId === id) resetForm();
  saveTasks();
  renderTasks();
  showToast("Tâche supprimée.");
}
$("#cancelEdit").addEventListener("click", resetForm);
searchInput.addEventListener("input", renderTasks);
document.querySelectorAll(".filter-btn").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("selected", b === button));
    renderTasks();
  });
});
document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    const view = button.dataset.view;
    if (view === "completed") currentFilter = "completed";
    else currentFilter = "all";
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("selected", b.dataset.filter === currentFilter));
    if (view === "settings") showToast("Vos tâches sont enregistrées dans ce navigateur.");
    renderTasks();
    $("#sidebar").classList.remove("open");
  });
});
$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  $("#themeToggle").innerHTML = dark ? "🌙 <span>Mode sombre</span>" : "☀️ <span>Mode clair</span>";
  localStorage.setItem("taskflow_aya_theme", dark ? "dark" : "light");
});
if (localStorage.getItem("taskflow_aya_theme") === "dark") {
  document.body.classList.add("dark");
  $("#themeToggle").innerHTML = "🌙 <span>Mode sombre</span>";
}
$("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
renderTasks();
