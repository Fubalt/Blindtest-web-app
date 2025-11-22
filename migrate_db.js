const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'blindtest.db');
const db = new Database(dbPath);

try {
    console.log('Migrating database...');
    // Add settings column to rooms if it doesn't exist
    try {
        db.exec('ALTER TABLE rooms ADD COLUMN settings TEXT');
        console.log('Added settings column to rooms table.');
    } catch (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Settings column already exists.');
        } else {
            throw err;
        }
    }
    console.log('Migration complete.');
} catch (error) {
    console.error('Migration failed:', error);
}
