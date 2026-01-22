CREATE TABLE
	IF NOT EXISTS users (
		user_id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		pswd_hash TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

-- Create the Modules table
CREATE TABLE
	IF NOT EXISTS modules (
		module_id INTEGER PRIMARY KEY AUTOINCREMENT,
		module_name TEXT NOT NULL UNIQUE,
		module_alias TEXT UNIQUE,
		description TEXT
	);

-- Create the UserModulePermissions (junction) table
CREATE TABLE
	IF NOT EXISTS usermodulepermissions (
		user_id INTEGER NOT NULL,
		module_id INTEGER NOT NULL,
		granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		-- Define Foreign Keys
		FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
		FOREIGN KEY (module_id) REFERENCES modules (module_id) ON DELETE CASCADE,
		-- Define the Composite Primary Key
		PRIMARY KEY (user_id, module_id)
	);

CREATE TABLE
	IF NOT EXISTS sessions (
		session_id TEXT PRIMARY KEY, -- UUID
		user_id INTEGER NOT NULL,
		expires_at TIMESTAMP NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
	);

-- (Optional) Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions ON usermodulepermissions (user_id);

CREATE INDEX IF NOT EXISTS idx_module_permissions ON usermodulepermissions (module_id);