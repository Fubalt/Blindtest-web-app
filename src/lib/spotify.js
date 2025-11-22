import axios from 'axios';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

let accessToken = null;
let tokenExpiration = 0;

async function getAccessToken() {
    if (accessToken && Date.now() < tokenExpiration) {
        return accessToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Missing Spotify credentials');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    try {
        const response = await axios.post(SPOTIFY_TOKEN_URL, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
            }
        });

        accessToken = response.data.access_token;
        tokenExpiration = Date.now() + (response.data.expires_in * 1000);
        return accessToken;
    } catch (error) {
        console.error('Error fetching Spotify token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with Spotify');
    }
}

export async function searchSpotify(query) {
    try {
        const token = await getAccessToken();
        const response = await axios.get(`${SPOTIFY_API_URL}/search`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { q: query, type: 'track', limit: 10 }
        });

        return response.data.tracks.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            source: 'spotify',
            cover: track.album.images[0]?.url || 'https://placehold.co/60x60/1db954/ffffff?text=S',
            preview_url: track.preview_url
        }));
    } catch (error) {
        console.error('Spotify search error:', error.response?.data || error.message);
        return [];
    }
}

export async function getSpotifyTrack(id) {
    try {
        const token = await getAccessToken();
        const response = await axios.get(`${SPOTIFY_API_URL}/tracks/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const track = response.data;
        return {
            id: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            source: 'spotify',
            cover: track.album.images[0]?.url,
            preview_url: track.preview_url
        };
    } catch (error) {
        console.error('Spotify track error:', error);
        return null;
    }
}

export async function getSpotifyPlaylist(id) {
    try {
        const token = await getAccessToken();
        let url = `${SPOTIFY_API_URL}/playlists/${id}`;
        let allTracks = [];

        while (url) {
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const tracks = response.data.tracks ? response.data.tracks.items : response.data.items;

            const formattedTracks = tracks
                .filter(item => item.track) // Filter out null tracks
                .map(item => ({
                    id: item.track.id,
                    title: item.track.name,
                    artist: item.track.artists.map(a => a.name).join(', '),
                    source: 'spotify',
                    cover: item.track.album.images[0]?.url,
                    preview_url: item.track.preview_url
                }));

            allTracks = [...allTracks, ...formattedTracks];
            url = response.data.tracks ? response.data.tracks.next : response.data.next;

            // Safety break to prevent infinite loops if something goes wrong, or limit to reasonable amount (e.g. 500)
            if (allTracks.length > 500) break;
        }

        // We need to get the name separately if we are paging, or just use the first response
        // Let's just fetch the name first to be safe and clean
        const detailsResponse = await axios.get(`${SPOTIFY_API_URL}/playlists/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return {
            name: detailsResponse.data.name,
            songs: allTracks
        };
    } catch (error) {
        console.error('Spotify playlist error:', error);
        return null;
    }
}
