import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    try {
        const { username } = await request.json();

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        // Check if user exists
        const getStmt = db.prepare('SELECT * FROM users WHERE username = ?');
        let user = getStmt.get(username);

        if (!user) {
            // Create new user
            const id = uuidv4();
            const insertStmt = db.prepare('INSERT INTO users (id, username) VALUES (?, ?)');
            insertStmt.run(id, username);
            user = { id, username };
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Auth Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
