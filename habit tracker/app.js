/**
 * HabitFlow — Habit Tracker Application
 * ======================================
 * Core logic for managing habits, calendar rendering, and task completion tracking.
 * All data persists in localStorage.
 */

(function () {
  'use strict';

  // ===== CONSTANTS =====
  const STORAGE_KEY = 'habitflow_data';
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const DEFAULT_HABITS = [
    { id: genId(), name: 'Exercise 30 min', color: '#6C5CE7' },
    { id: genId(), name: 'Read a book', color: '#E84393' },
    { id: genId(), name: 'Drink 8 glasses of water', color: '#00B894' },
    { id: genId(), name: 'Meditate', color: '#0984E3' },
    { id: genId(), name: 'No junk food', color: '#FDCB6E' },
    { id: genId(), name: 'Journal', color: '#E17055' },
    { id: genId(), name: 'Sleep by 11 PM', color: '#00CEC9' },
  ];

  // ===== STATE =====
  let state = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    habits: [],
    // completions: { "YYYY-MM-DD": { habitId: true, ... }, ... }
    completions: {},
    selectedDate: todayStr(),
    selectedHabitId: null,
  };

  // ===== DOM REFS =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    monthName: $('#monthName'),
    yearLabel: $('#yearLabel'),
    prevMonthBtn: $('#prevMonthBtn'),
    nextMonthBtn: $('#nextMonthBtn'),
    taskList: $('#taskList'),
    calendarGrid: $('#calendarGrid'),
    addTaskBtn: $('#addTaskBtn'),
    addTaskForm: $('#addTaskForm'),
    taskInput: $('#taskInput'),
    colorPicker: $('#colorPicker'),
    cancelTaskBtn: $('#cancelTaskBtn'),
    saveTaskBtn: $('#saveTaskBtn'),
    completedToday: $('#completedToday'),
    totalHabits: $('#totalHabits'),
    dateTooltip: $('#dateTooltip'),
    tooltipText: $('#tooltipText'),
  };

  // ===== UTILITIES =====
  function genId() {
    return 'h_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }

  // ===== STORAGE =====
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        state.habits = saved.habits || [];
        state.completions = saved.completions || {};
      } else {
        // First run — seed default habits
        state.habits = DEFAULT_HABITS;
        saveState();
      }
    } catch {
      state.habits = DEFAULT_HABITS;
      saveState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      habits: state.habits,
      completions: state.completions,
    }));
  }

  // ===== RENDERING: MONTH DISPLAY =====
  function renderMonthDisplay() {
    els.monthName.textContent = MONTHS[state.currentMonth];
    els.yearLabel.textContent = state.currentYear;
  }

  // ===== RENDERING: TASK LIST =====
  function renderTaskList() {
    const dateKey = state.selectedDate;
    const dayCompletions = state.completions[dateKey] || {};

    if (state.habits.length === 0) {
      els.taskList.innerHTML = `
        <li class="empty-state">
          <div class="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <p class="empty-state-text">No habits yet.<br/>Click + to add your first habit!</p>
        </li>`;
      updateStats();
      return;
    }

    els.taskList.innerHTML = state.habits.map(habit => {
      const isCompleted = !!dayCompletions[habit.id];
      const isSelected = state.selectedHabitId === habit.id;
      return `
        <li class="task-item ${isCompleted ? 'completed' : ''} ${isSelected ? 'selected' : ''}"
            data-habit-id="${habit.id}"
            id="task-${habit.id}">
          <div class="task-checkbox ${isCompleted ? 'checked' : ''}"
               style="${isCompleted ? `background: ${habit.color};` : `border-color: ${habit.color};`}"
               data-action="toggle"
               data-habit-id="${habit.id}">
            ${isCompleted ? `<span style="color: white; font-size: 11px;">✓</span>` : ''}
          </div>
          <span class="task-name">${escapeHtml(habit.name)}</span>
          <div class="task-color-bar" style="background: ${habit.color}"></div>
          <button class="task-delete-btn" data-action="delete" data-habit-id="${habit.id}" aria-label="Delete habit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </li>`;
    }).join('');

    updateStats();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function updateStats() {
    const dateKey = state.selectedDate;
    const dayCompletions = state.completions[dateKey] || {};
    const completedCount = Object.values(dayCompletions).filter(Boolean).length;
    els.completedToday.textContent = completedCount;
    els.totalHabits.textContent = state.habits.length;
  }

  // ===== RENDERING: CALENDAR =====
  function renderCalendar() {
    const { currentYear, currentMonth } = state;
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const today = todayStr();

    let cells = '';

    // Empty cells before 1st
    for (let i = 0; i < firstDay; i++) {
      cells += `<div class="calendar-cell empty"><span class="cell-date"></span><div class="cell-habits"></div></div>`;
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dKey = dateStr(currentYear, currentMonth, d);
      const isToday = dKey === today;
      const isSelected = dKey === state.selectedDate;
      const dayCompletions = state.completions[dKey] || {};

      // Build habit lines
      let habitLines = '';
      for (const habit of state.habits) {
        if (dayCompletions[habit.id]) {
          habitLines += `<div class="habit-line" style="background: ${habit.color}" title="${escapeHtml(habit.name)}"></div>`;
        }
      }

      cells += `
        <div class="calendar-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
             data-date="${dKey}" data-day="${d}">
          <span class="cell-date">${d}</span>
          <div class="cell-habits">${habitLines}</div>
        </div>`;
    }

    // Remaining empty cells to fill grid (6 rows × 7 = 42)
    const totalCells = firstDay + daysInMonth;
    const remaining = (totalCells <= 35 ? 35 : 42) - totalCells;
    for (let i = 0; i < remaining; i++) {
      cells += `<div class="calendar-cell empty"><span class="cell-date"></span><div class="cell-habits"></div></div>`;
    }

    els.calendarGrid.innerHTML = cells;

    // Update grid rows based on cell count
    const totalRows = (firstDay + daysInMonth) <= 35 ? 5 : 6;
    els.calendarGrid.style.gridTemplateRows = `repeat(${totalRows}, 1fr)`;
  }

  // ===== EVENT HANDLERS =====

  // Month navigation
  function goToPrevMonth() {
    state.currentMonth--;
    if (state.currentMonth < 0) {
      state.currentMonth = 11;
      state.currentYear--;
    }
    // Update selectedDate to 1st of new month
    state.selectedDate = dateStr(state.currentYear, state.currentMonth, 1);
    renderAll();
  }

  function goToNextMonth() {
    state.currentMonth++;
    if (state.currentMonth > 11) {
      state.currentMonth = 0;
      state.currentYear++;
    }
    state.selectedDate = dateStr(state.currentYear, state.currentMonth, 1);
    renderAll();
  }

  // Task list click handling (delegation)
  function handleTaskListClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) {
      // Click on the task item itself — select it
      const taskItem = e.target.closest('.task-item');
      if (taskItem) {
        const habitId = taskItem.dataset.habitId;
        state.selectedHabitId = state.selectedHabitId === habitId ? null : habitId;
        renderTaskList();
      }
      return;
    }

    const action = actionEl.dataset.action;
    const habitId = actionEl.dataset.habitId;

    if (action === 'toggle') {
      toggleHabitCompletion(habitId);
    } else if (action === 'delete') {
      deleteHabit(habitId);
    }
  }

  function toggleHabitCompletion(habitId) {
    const dateKey = state.selectedDate;
    if (!state.completions[dateKey]) {
      state.completions[dateKey] = {};
    }
    state.completions[dateKey][habitId] = !state.completions[dateKey][habitId];
    if (!state.completions[dateKey][habitId]) {
      delete state.completions[dateKey][habitId];
    }
    saveState();
    renderTaskList();
    renderCalendar();
  }

  function deleteHabit(habitId) {
    state.habits = state.habits.filter(h => h.id !== habitId);
    // Remove from all completions
    for (const dateKey of Object.keys(state.completions)) {
      delete state.completions[dateKey][habitId];
    }
    if (state.selectedHabitId === habitId) {
      state.selectedHabitId = null;
    }
    saveState();
    renderTaskList();
    renderCalendar();
  }

  // Calendar cell click
  function handleCalendarClick(e) {
    const cell = e.target.closest('.calendar-cell:not(.empty)');
    if (!cell) return;

    const dateKey = cell.dataset.date;
    state.selectedDate = dateKey;

    // Show tooltip
    showTooltip(dateKey);

    renderTaskList();
    renderCalendar();
  }

  function showTooltip(dateKey) {
    const d = new Date(dateKey + 'T00:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = MONTHS[d.getMonth()];
    els.tooltipText.textContent = `${dayName}, ${monthName} ${d.getDate()}, ${d.getFullYear()}`;
    els.dateTooltip.classList.add('visible');
    clearTimeout(showTooltip._timer);
    showTooltip._timer = setTimeout(() => {
      els.dateTooltip.classList.remove('visible');
    }, 2000);
  }

  // Add task form
  let selectedColor = '#6C5CE7';

  function showAddTaskForm() {
    els.addTaskForm.classList.add('visible');
    els.taskInput.value = '';
    els.taskInput.focus();
    // Select first color
    selectColor('#6C5CE7');
  }

  function hideAddTaskForm() {
    els.addTaskForm.classList.remove('visible');
    els.taskInput.value = '';
  }

  function selectColor(color) {
    selectedColor = color;
    els.colorPicker.querySelectorAll('.color-dot').forEach(dot => {
      dot.classList.toggle('selected', dot.dataset.color === color);
    });
  }

  function saveNewTask() {
    const name = els.taskInput.value.trim();
    if (!name) {
      els.taskInput.focus();
      return;
    }
    state.habits.push({
      id: genId(),
      name: name,
      color: selectedColor,
    });
    saveState();
    hideAddTaskForm();
    renderTaskList();
  }

  // ===== BIND EVENTS =====
  function bindEvents() {
    els.prevMonthBtn.addEventListener('click', goToPrevMonth);
    els.nextMonthBtn.addEventListener('click', goToNextMonth);
    els.taskList.addEventListener('click', handleTaskListClick);
    els.calendarGrid.addEventListener('click', handleCalendarClick);
    els.addTaskBtn.addEventListener('click', showAddTaskForm);
    els.cancelTaskBtn.addEventListener('click', hideAddTaskForm);
    els.saveTaskBtn.addEventListener('click', saveNewTask);

    // Color picker
    els.colorPicker.addEventListener('click', (e) => {
      const dot = e.target.closest('.color-dot');
      if (dot) selectColor(dot.dataset.color);
    });

    // Enter key in task input
    els.taskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveNewTask();
      if (e.key === 'Escape') hideAddTaskForm();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') goToPrevMonth();
      if (e.key === 'ArrowRight') goToNextMonth();
    });
  }

  // ===== RENDER ALL =====
  function renderAll() {
    renderMonthDisplay();
    renderTaskList();
    renderCalendar();
  }

  // ===== INIT =====
  function init() {
    loadState();
    bindEvents();
    renderAll();
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
