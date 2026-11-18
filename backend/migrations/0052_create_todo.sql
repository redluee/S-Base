CREATE TABLE IF NOT EXISTS todo_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS todo_categories_user ON todo_categories(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS todo_categories_system ON todo_categories(user_id) WHERE is_system = 1;
CREATE TABLE IF NOT EXISTS todo_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES todo_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS todo_projects_category ON todo_projects(category_id);
CREATE UNIQUE INDEX IF NOT EXISTS todo_projects_source ON todo_projects(user_id, source) WHERE source IS NOT NULL;
CREATE TABLE IF NOT EXISTS todo_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category_id INTEGER REFERENCES todo_categories(id) ON DELETE SET NULL,
  project_id INTEGER REFERENCES todo_projects(id) ON DELETE SET NULL,
  archived_category_name TEXT,
  archived_category_color TEXT,
  due_date TEXT,
  flagged INTEGER NOT NULL DEFAULT 0 CHECK (flagged IN (0, 1)),
  notes TEXT NOT NULL DEFAULT '',
  position REAL NOT NULL,
  source_module TEXT,
  source_id INTEGER,
  source_previous_status TEXT,
  created_at TEXT NOT NULL,
  last_edited_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT,
  CHECK ((source_module IS NULL AND source_id IS NULL) OR (source_module IS NOT NULL AND source_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS todo_tasks_user_open ON todo_tasks(user_id, completed_at, position);
CREATE INDEX IF NOT EXISTS todo_tasks_user_completed ON todo_tasks(user_id, completed_at);
CREATE UNIQUE INDEX IF NOT EXISTS todo_tasks_source ON todo_tasks(user_id, source_module, source_id) WHERE source_module IS NOT NULL;
CREATE TABLE IF NOT EXISTS todo_subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  task_id INTEGER NOT NULL REFERENCES todo_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  position REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS todo_subtasks_task ON todo_subtasks(task_id);
CREATE TABLE IF NOT EXISTS todo_hidden_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  source_module TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  hidden_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS todo_hidden_links_source ON todo_hidden_links(user_id, source_module, source_id);
INSERT OR IGNORE INTO modules (module_name, module_alias, description)
VALUES ('todo', 'Get Shit Done', 'Persoonlijke takenlijst met categorieën, projecten en automatische taken');
