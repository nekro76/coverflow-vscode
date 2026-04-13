import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface Track {
    name: string;
    artist: string;
    album: string;
    duration: number;
    hasArtwork?: boolean;
    artworkBase64?: string;
}

export interface Playlist {
    name: string;
    id: string;
}

export async function runAppleScript(script: string): Promise<string> {
    try {
        const { stdout } = await execPromise(`osascript -e '${script}'`, {
            timeout: 10000
        });
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
    const result = await runAppleScript(`
        tell app "Music"
            if player state is stopped then
                return ""
            end if
            set trackName to name of current track
            set trackArtist to artist of current track
            set trackAlbum to album of current track
            set trackDuration to duration of current track
            set hasArtwork to (count of artworks of current track) > 0
            return trackName & "|||" & trackArtist & "|||" & trackAlbum & "|||" & trackDuration & "|||" & hasArtwork
        end tell
    `);
    
    if (!result || result === '') {
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

/**
 * Robustly fetches artwork as Base64.
 */
export async function getArtworkBase64(): Promise<string | null> {
    const script = `
        tell app "Music"
            if (count of artworks of current track) > 0 then
                return data of artwork 1 of current track
            else
                return ""
            end if
        end tell
    `;

    try {
        const { stdout } = await execPromise(`osascript -e '${script}'`, {
            timeout: 15000,
            maxBuffer: 10 * 1024 * 1024
        });

        const output = stdout.trim();
        if (!output || output === '') {
            return null;
        }

        const match = output.match(/«data [A-Za-z]+([0-9A-Fa-f]+)»/);
        if (match && match[1]) {
            return Buffer.from(match[1], 'hex').toString('base64');
        }

        return null;
    } catch (error) {
        console.error('Artwork fetch error:', error);
        return null;
    }
}

export async function isPlaying(): Promise<boolean> {
    const result = await runAppleScript(`
        tell app "Music"
            return player state is playing
        end tell
    `);
    return result === 'true';
}

export async function getVolume(): Promise<number> {
    const result = await runAppleScript(`
        tell app "Music"
            return sound volume
        end tell
    `);
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
    await runAppleScript(`
        tell app "Music"
            set shuffle enabled to not shuffle enabled
        end tell
    `);
}

export async function toggleRepeat(): Promise<void> {
    await runAppleScript(`
        tell app "Music"
            if repeat mode is off then
                set repeat mode to all
            else if repeat mode is all then
                set repeat mode to one
            else
                set repeat mode to off
            end if
        end tell
    `);
}

export async function getShuffleEnabled(): Promise<boolean> {
    const result = await runAppleScript(`
        tell app "Music"
            return shuffle enabled
        end tell
    `);
    return result === 'true';
}

export async function getRepeatMode(): Promise<string> {
    const result = await runAppleScript(`
        tell app "Music"
            return repeat mode as text
        end tell
    `);
    return result || 'off';
}

export async function getPlayerPosition(): Promise<number> {
    const result = await runAppleScript(`
        tell app "Music"
            return player position
        end tell
    `);
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
