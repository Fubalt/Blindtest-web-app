const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testImport() {
    console.log('Testing Import API...');
    try {
        // Test with a known valid Spotify URL (Daft Punk - One More Time)
        const spotifyUrl = 'https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV';
        const res = await axios.post(`${BASE_URL}/api/import`, { url: spotifyUrl });
        console.log('Import Success:', res.data);
    } catch (error) {
        console.error('Import Failed:', error.response?.status, error.response?.data);
    }
}

async function testPlaylistSave() {
    console.log('\nTesting Playlist Save API...');
    try {
        // 1. Login to get valid user ID
        console.log('Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, { username: 'testuser' });
        const user = loginRes.data;
        console.log('Login Success:', user);

        // 2. Save Large Playlist
        console.log('Generating large playlist...');
        const largeSongs = Array.from({ length: 200 }, (_, i) => ({
            id: `song-${i}`,
            title: `Song ${i}`,
            artist: `Artist ${i}`,
            source: 'spotify',
            cover: 'https://placehold.co/60x60',
            preview_url: null
        }));

        const payload = {
            userId: user.id,
            name: 'Large Test Playlist',
            songs: largeSongs
        };

        console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
        const res = await axios.post(`${BASE_URL}/api/playlist`, payload);
        console.log('Playlist Save Success:', res.data.id);
    } catch (error) {
        console.error('Playlist Save Failed:', error.response?.status, error.response?.data);
    }
}

async function run() {
    await testImport();
    await testPlaylistSave();
}

run();
