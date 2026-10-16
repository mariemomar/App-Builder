// VibrantTodo - Main script
// --------------------------------------------------
// This script implements state management, persistence, CRUD operations,
// rendering, filtering, keyboard shortcuts, and dark‑mode handling for the
// VibrantTodo application.

// ---------------------------
// 1. State Management
// ---------------------------
const LOCAL_STORAGE_KEY = "vibrantTodoItems";
const DARK_MODE_KEY = "vibrantTodoDarkMode";
let todos = [];
let currentFilter = "all"; // possible values: 'all', 'active', 'completed'

// ---------------------------
// 2. DOM Caching
// ---------------------------
const input = document.getElementById('new-todo-input');
const list = document.getElementById('todo-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const darkToggle = document.getElementById('dark-mode-toggle');

// ---------------------------
// 3. Utility Functions
// ---------------------------
/** Escape HTML to prevent XSS when rendering user‑provided text */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
/** Simple ID generator – wrapper around Date.now() for readability */
function generateId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

// ---------------------------
// 4. Persistence Functions
// ---------------------------
function loadTodos() {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                todos = parsed;
            }
        } catch (e) {
            console.error('Failed to parse stored todos:', e);
            todos = [];
        }
    }
    render(currentFilter);
}
function saveTodos() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(todos));
}

// ---------------------------
// 5. CRUD Operations
// ---------------------------
function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newTodo = {
        id: generateId(),
        text: trimmed,
        completed: false,
    };
    todos.push(newTodo);
    saveTodos();
    render(currentFilter);
}
function editTodo(id, newText) {
    const trimmed = newText.trim();
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    if (trimmed) {
        todo.text = trimmed;
    }
    saveTodos();
    render(currentFilter);
}
function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    render(currentFilter);
}
function toggleComplete(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    saveTodos();
    render(currentFilter);
}

// ---------------------------
// 6. Rendering
// ---------------------------
function render(filter = 'all') {
    // Preserve the current filter for later re‑renders
    currentFilter = filter;
    // Clear existing list
    list.innerHTML = '';

    const fragment = document.createDocumentFragment();

    todos.forEach(todo => {
        // Apply filter
        if (filter === 'active' && todo.completed) return;
        if (filter === 'completed' && !todo.completed) return;

        const li = document.createElement('li');
        li.dataset.id = todo.id;
        li.className = todo.completed ? 'completed' : '';

        // Build inner HTML – using template literals for readability
        const escapedText = escapeHtml(todo.text);
        li.innerHTML = `
            <input type="checkbox" class="toggle" data-id="${todo.id}" ${todo.completed ? 'checked' : ''}>
            <label class="todo-text" data-id="${todo.id}">${escapedText}</label>
            <input class="edit-input" data-id="${todo.id}" value="${escapedText}" hidden>
            <button class="delete-btn" data-id="${todo.id}" aria-label="Delete">✕</button>
        `;

        // ---------- Event Listeners for this item ----------
        // Checkbox toggle
        const checkbox = li.querySelector('input.toggle');
        checkbox.addEventListener('change', () => {
            toggleComplete(todo.id);
        });

        // Double‑click label → edit mode
        const label = li.querySelector('label.todo-text');
        const editInput = li.querySelector('input.edit-input');
        label.addEventListener('dblclick', () => {
            li.classList.add('editing');
            editInput.hidden = false;
            label.hidden = true;
            editInput.dataset.original = todo.text; // store original for Escape handling
            editInput.focus();
            editInput.select();
        });

        // Save edit on blur
        editInput.addEventListener('blur', () => {
            const newVal = editInput.value;
            if (newVal !== todo.text) {
                editTodo(todo.id, newVal);
            } else {
                // No change – just exit edit mode
                exitEditMode(li, editInput, label);
            }
        });
        // Save edit on Enter key
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                editInput.blur(); // triggers the blur handler
            } else if (e.key === 'Escape') {
                // Cancel edit – revert value and exit
                editInput.value = editInput.dataset.original || '';
                exitEditMode(li, editInput, label);
                // Return focus to the label (or the main input)
                input.focus();
            }
        });

        // Delete button
        const delBtn = li.querySelector('button.delete-btn');
        delBtn.addEventListener('click', () => {
            deleteTodo(todo.id);
        });

        fragment.appendChild(li);
    });

    list.appendChild(fragment);
}

function exitEditMode(li, editInput, label) {
    li.classList.remove('editing');
    editInput.hidden = true;
    label.hidden = false;
}

// ---------------------------
// 7. Filtering UI
// ---------------------------
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const selected = btn.dataset.filter;
        // Update aria‑pressed attributes
        filterButtons.forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
        render(selected);
    });
});

// ---------------------------
// 8. Dark Mode Toggle
// ---------------------------
function applyDarkMode(enabled) {
    if (enabled) {
        document.body.classList.add('dark-mode');
        darkToggle.setAttribute('aria-pressed', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        darkToggle.setAttribute('aria-pressed', 'false');
    }
    localStorage.setItem(DARK_MODE_KEY, enabled);
}
function toggleDarkMode() {
    const isDark = document.body.classList.contains('dark-mode');
    applyDarkMode(!isDark);
}
// Initialise dark mode based on stored preference
(function initDarkMode() {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    const enabled = stored === 'true';
    applyDarkMode(enabled);
})();

// ---------------------------
// 9. Keyboard Shortcuts & Global Listeners
// ---------------------------
// Add‑todo via Enter when input is focused
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const value = input.value.trim();
        if (value) {
            addTodo(value);
            input.value = '';
        }
    }
});
// Dark‑mode shortcut: Ctrl+Enter
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        toggleDarkMode();
    }
});
// Global Escape to cancel any active edit mode
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const editingLi = document.querySelector('li.editing');
        if (editingLi) {
            const editInput = editingLi.querySelector('input.edit-input');
            const label = editingLi.querySelector('label.todo-text');
            // Revert changes
            editInput.value = editInput.dataset.original || '';
            exitEditMode(editingLi, editInput, label);
            input.focus();
        }
    }
});

// Dark‑mode button click
if (darkToggle) {
    darkToggle.addEventListener('click', toggleDarkMode);
}

// ---------------------------
// 10. Initialization
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadTodos();
    // The rest of the listeners are already attached above.
});
