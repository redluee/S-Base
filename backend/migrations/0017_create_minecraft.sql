CREATE TABLE IF NOT EXISTS mc_servers (
  serverId INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  displayName TEXT NOT NULL,
  engine TEXT NOT NULL,
  mcVersion TEXT NOT NULL,
  serverDir TEXT NOT NULL,
  javaArgs TEXT,
  templateId INTEGER,
  mapEnabled INTEGER DEFAULT 0,
  mapPort INTEGER,
  mapModJar TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mc_templates (
  templateId INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  engine TEXT NOT NULL,
  mcVersion TEXT NOT NULL,
  javaArgs TEXT,
  propertiesJson TEXT,
  notes TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mc_template_files (
  fileId INTEGER PRIMARY KEY AUTOINCREMENT,
  templateId INTEGER NOT NULL,
  fileType TEXT NOT NULL,
  filename TEXT NOT NULL,
  sha256 TEXT,
  FOREIGN KEY(templateId) REFERENCES mc_templates(templateId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mc_player_stats (
  statId INTEGER PRIMARY KEY AUTOINCREMENT,
  serverId INTEGER NOT NULL,
  playerUuid TEXT NOT NULL,
  playerName TEXT NOT NULL,
  firstSeen TEXT DEFAULT CURRENT_TIMESTAMP,
  lastSeen TEXT,
  totalPlaytime INTEGER DEFAULT 0,
  UNIQUE(serverId, playerUuid),
  FOREIGN KEY(serverId) REFERENCES mc_servers(serverId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mc_player_sessions (
  sessionId INTEGER PRIMARY KEY AUTOINCREMENT,
  serverId INTEGER NOT NULL,
  playerUuid TEXT NOT NULL,
  joinedAt TEXT NOT NULL,
  leftAt TEXT,
  FOREIGN KEY(serverId) REFERENCES mc_servers(serverId) ON DELETE CASCADE
);
