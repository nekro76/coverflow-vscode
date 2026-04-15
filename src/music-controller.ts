import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export interface Track {
    name: string;
    artist: string;
    album: string;
    duration: number;
    hasArtwork?: boolean;
    artworkBase64?: string;
    artworkMimeType?: string;
    playlistId?: string;
    trackIndex?: number;
}

export interface Playlist {
    name: string;
    id: string;
}

export async function runAppleScript(script: string): Promise<string> {
    try {
        const { stdout, stderr } = await execPromise(`osascript -e '${script}'`, {
            timeout: 10000
        });
        if (stderr) {
            console.error('AppleScript stderr:', stderr);
        }
        return stdout.trim();
    } catch (error) {
        console.error('AppleScript error:', error);
        return '';
    }
}

export async function play(): Promise<void> {
    await runAppleScript('tell app "Music" to play');
}

export async function pause(): Promise<void> {
    await runAppleScript('tell app "Music" to pause');
}

export async function togglePlayPause(): Promise<void> {
    await runAppleScript(`
        tell app "Music"
            if player state is playing then
                pause
            else
                play
            end if
        end tell
    `);
}

export async function nextTrack(): Promise<void> {
    await runAppleScript('tell app "Music" to next track');
}

export async function previousTrack(): Promise<void> {
    await runAppleScript('tell app "Music" to previous track');
}

export async function getCurrentTrack(): Promise<Track | null> {
    const script = `tell app "Music"
if player state is stopped then
return "STOPPED"
end if
set trackName to name of current track
set trackArtist to artist of current track
set trackAlbum to album of current track
set trackDuration to duration of current track
set hasArtwork to (count of artworks of current track) > 0
return trackName & "|||" & trackArtist & "|||" & trackAlbum & "|||" & trackDuration & "|||" & hasArtwork
end tell`;

    const result = await runAppleScript(script);
    
    if (!result || result === '' || result === 'STOPPED') {
        return null;
    }
    
    const parts = result.split('|||');
    if (parts.length < 4) {
        return null;
    }
    
    const track: Track = {
        name: parts[0],
        artist: parts[1],
        album: parts[2],
        duration: parseInt(parts[3], 10) || 0
    };
    
    if (parts.length > 4 && parts[4] === 'true') {
        track.hasArtwork = true;
    }
    
    return track;
}

async function fetchArtworkData(): Promise<{ result: string; mimeType: string } | null> {
    const script = `tell app "Music"
if (count of artworks of current track) > 0 then
return data of artwork 1 of current track
else
return ""
end if
end tell`;

    try {
        const { stdout } = await execPromise(`osascript -e '${script.replace(/'/g, "\\'")}'`, {
            timeout: 15000,
            maxBuffer: 10 * 1024 * 1024
        });

        const result = stdout.trim();
        
        if (!result || result === '') {
            return null;
        }

        const jpegIndex = result.indexOf('JPEG');
        const pngIndex = result.indexOf('PNG');
        
        let mimeType = 'image/jpeg';
        let hexData = result;
        
        if (pngIndex >= 0 && (jpegIndex < 0 || pngIndex < jpegIndex)) {
            mimeType = 'image/png';
            hexData = result.substring(pngIndex + 3);
        } else if (jpegIndex >= 0) {
            hexData = result.substring(jpegIndex + 4);
        }
        
        hexData = hexData.replace(/[^0-9A-Fa-f]/g, '');
        
        if (hexData.length > 0) {
            return { result: hexData, mimeType };
        }

        return null;
    } catch (error) {
        console.error('Artwork fetch error:', error);
        return null;
    }
}

/**
 * Fetches artwork as Base64 with retry logic.
 * Forces artwork loading by accessing dimensions first (fixes streaming track issue).
 */
export async function getArtwork(): Promise<{ base64: string; mimeType: string } | null> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const artworkData = await fetchArtworkData();
        
        if (artworkData) {
            const base64 = Buffer.from(artworkData.result, 'hex').toString('base64');
            if (base64.length > 0) {
                return { base64, mimeType: artworkData.mimeType };
            }
        }
        
        if (attempt < maxRetries) {
            const delay = 300 * attempt;
            console.log(`Artwork attempt ${attempt} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
    
    console.log('Artwork fetch failed after all retries');
    return null;
}

export async function isPlaying(): Promise<boolean> {
    const result = await runAppleScript('tell app "Music" to return player state is playing');
    return result === 'true';
}

export async function getVolume(): Promise<number> {
    const result = await runAppleScript('tell app "Music" to return sound volume');
    return parseInt(result, 10) || 0;
}

export async function setVolume(level: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, level));
    await runAppleScript(`tell app "Music" to set sound volume to ${clamped}`);
}

export async function volumeUp(): Promise<void> {
    const current = await getVolume();
    await setVolume(current + 5);
}

export async function volumeDown(): Promise<void> {
    const current = await getVolume();
    await setVolume(current - 5);
}

export async function toggleShuffle(): Promise<void> {
    await runAppleScript('tell app "Music" to set shuffle enabled to not shuffle enabled');
}

export async function toggleRepeat(): Promise<void> {
    await runAppleScript(`tell app "Music"
if repeat mode is off then
set repeat mode to all
else if repeat mode is all then
set repeat mode to one
else
set repeat mode to off
end if
end tell`);
}

export async function getShuffleEnabled(): Promise<boolean> {
    const result = await runAppleScript('tell app "Music" to return shuffle enabled');
    return result === 'true';
}

export async function getRepeatMode(): Promise<string> {
    const result = await runAppleScript('tell app "Music" to return repeat mode as text');
    return result || 'off';
}

export async function getPlayerPosition(): Promise<number> {
    const result = await runAppleScript('tell app "Music" to return player position');
    return parseFloat(result) || 0;
}

/**
 * Fetches all playlists from Music.app library.
 */
export async function getPlaylists(): Promise<Playlist[]> {
    const result = await runAppleScript(`
        tell app "Music"
            set playlistNames to name of user playlists
            set playlistIds to persistent ID of user playlists
            set output to ""
            repeat with i from 1 to count of playlistNames
                set output to output & item i of playlistNames & "|||" & item i of playlistIds & "###"
            end repeat
            return output
        end tell
    `);

    if (!result) return [];

    return result.split('###')
        .filter(p => p.trim() !== '')
        .map(p => {
            const [name, id] = p.split('|||');
            return { name, id };
        });
}

export async function getAdjacentTracks(playlistId: string, currentIndex: number): Promise<{ prevTrack: Track | null; nextTrack: Track | null }> {
    const result = await runAppleScript(`
        tell app "Music"
            set output to ""
            try
                set targetPlaylist to some playlist whose persistent ID is "${playlistId}"
                set trackList to tracks of targetPlaylist
                set trackCount to count of trackList
                set prevIndex to ${currentIndex} - 1
                set nextIndex to ${currentIndex} + 1
                if prevIndex >= 1 then
                    set prevName to name of item prevIndex of trackList
                    set prevArtist to artist of item prevIndex of trackList
                    set prevAlbum to album of item prevIndex of trackList
                    set prevHasArt to (count of artworks of item prevIndex of trackList) > 0
                    set output to output & prevName & "|||" & prevArtist & "|||" & prevAlbum & "|||" & prevHasArt & "###"
                else
                    set output to output & "###"
                end if
                if nextIndex <= trackCount then
                    set nextName to name of item nextIndex of trackList
                    set nextArtist to artist of item nextIndex of trackList
                    set nextAlbum to album of item nextIndex of trackList
                    set nextHasArt to (count of artworks of item nextIndex of trackList) > 0
                    set output to output & nextName & "|||" & nextArtist & "|||" & nextAlbum & "|||" & nextHasArt
                end if
            end try
            return output
        end tell
    `);

    let prevTrack: Track | null = null;
    let nextTrack: Track | null = null;

    if (result && result.trim() !== '') {
        const parts = result.split('###');
        
        if (parts.length > 0 && parts[0].trim() !== '') {
            const prevParts = parts[0].split('|||');
            if (prevParts.length >= 3) {
                prevTrack = {
                    name: prevParts[0],
                    artist: prevParts[1],
                    album: prevParts[2],
                    duration: 0,
                    hasArtwork: prevParts[3] === 'true'
                };
            }
        }
        
        if (parts.length > 1 && parts[1].trim() !== '') {
            const nextParts = parts[1].split('|||');
            if (nextParts.length >= 3) {
                nextTrack = {
                    name: nextParts[0],
                    artist: nextParts[1],
                    album: nextParts[2],
                    duration: 0,
                    hasArtwork: nextParts[3] === 'true'
                };
            }
        }
    }

    return { prevTrack, nextTrack };
}

/**
 * Fetches tracks from a specific playlist.
 */
export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
    const result = await runAppleScript(`
        tell app "Music"
            set targetPlaylist to some playlist whose persistent ID is "${playlistId}"
            set trackNames to name of tracks of targetPlaylist
            set trackArtists to artist of tracks of targetPlaylist
            set trackAlbums to album of tracks of targetPlaylist
            set output to ""
            repeat with i from 1 to count of trackNames
                set output to output & item i of trackNames & "|||" & item i of trackArtists & "|||" & item i of trackAlbums & "###"
            end repeat
            return output
        end tell
    `);

    if (!result) return [];

    return result.split('###')
        .filter(t => t.trim() !== '')
        .map(t => {
            const [name, artist, album] = t.split('|||');
            return { name, artist, album, duration: 0 };
        });
}

/**
 * Plays a specific track from a playlist.
 */
export async function playTrack(playlistId: string, trackName: string): Promise<void> {
    await runAppleScript(`
        tell app "Music"
            set targetPlaylist to some playlist whose persistent ID is "${playlistId}"
            play track "${trackName}" of targetPlaylist
        end tell
    `);
}

/**
 * Gets the queue/up next tracks.
 */
export async function getQueue(): Promise<Track[]> {
    const result = await runAppleScript(`
        tell app "Music"
            set queueTracks to {}
            try
                set queueCount to 0
                repeat with aTrack in (up next tracks)
                    set queueCount to queueCount + 1
                    if queueCount > 10 then exit repeat
                    set end of queueTracks to aTrack
                end repeat
            end try
            set output to ""
            repeat with qTrack in queueTracks
                set output to output & name of qTrack & "|||" & artist of qTrack & "|||" & album of qTrack & "###"
            end repeat
            return output
        end tell
    `);

    if (!result) return [];

    return result.split('###')
        .filter(t => t.trim() !== '')
        .map(t => {
            const [name, artist, album] = t.split('|||');
            return { name, artist, album, duration: 0 };
        });
}
