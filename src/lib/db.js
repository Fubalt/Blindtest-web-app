import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'blindtest.db');
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    songs TEXT, -- JSON string of songs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    host_id TEXT,
    playlist_id TEXT,
    status TEXT DEFAULT 'waiting', -- waiting, playing, finished
    current_song_index INTEGER DEFAULT 0,
    players TEXT, -- JSON string of players
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(host_id) REFERENCES users(id),
    FOREIGN KEY(playlist_id) REFERENCES playlists(id)
  );
`);

export default db;
