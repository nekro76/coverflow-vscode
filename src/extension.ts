import * as vscode from 'vscode';
import * as music from './music-controller';
import * as path from 'path';
import * as fs from 'fs';

let statusBarItem: vscode.StatusBarItem;
let statusBarPrevious: vscode.StatusBarItem;
let statusBarPlayPause: vscode.StatusBarItem;
let statusBarNext: vscode.StatusBarItem;
let updateInterval: NodeJS.Timeout;
let panel: vscode.WebviewPanel | undefined;

async function updateStatusBar(): Promise<void> {
    const track = await music.getCurrentTrack();
    if (track) {
        const text = `$(music-note) ${track.name} - ${track.artist}`;
        statusBarItem.text = text.length > 50 ? text.substring(0, 47) + '...' : text;
        statusBarItem.tooltip = `${track.name}\n${track.artist}\n${track.album}`;
    } else {
        statusBarItem.text = '$(music-note) Not Playing';
        statusBarItem.tooltip = 'No track playing';
    }
}

async function updatePlayPauseButton(): Promise<void> {
    const isPlaying = await music.isPlaying();
    const track = await music.getCurrentTrack();
    
    statusBarPlayPause.text = isPlaying ? '$(debug-pause)' : '$(play)';
    
    if (track) {
        statusBarPlayPause.tooltip = isPlaying 
            ? `Pause: ${track.name} - ${track.artist}` 
            : `Play: ${track.name} - ${track.artist}`;
    } else {
        statusBarPlayPause.tooltip = isPlaying ? 'Pause' : 'Play';
    }
}

async function updateAllStatusBars(): Promise<void> {
    await updateStatusBar();
    await updatePlayPauseButton();
}

function startStatusUpdates(): void {
    updateAllStatusBars();
    updateInterval = setInterval(() => updateAllStatusBars(), 2000);
}

function stopStatusUpdates(): void {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}

export function activate(context: vscode.ExtensionContext): void {
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    statusBarItem.command = 'coverflow.showPanel';
    statusBarItem.text = '$(music-note) CoverFlow';
    statusBarItem.tooltip = 'Click to show CoverFlow panel';
    statusBarItem.show();

    statusBarPrevious = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        99
    );
    statusBarPrevious.command = 'coverflow.previous';
    statusBarPrevious.text = '$(chevron-left)';
    statusBarPrevious.tooltip = 'Previous Track';
    statusBarPrevious.show();

    statusBarPlayPause = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        98
    );
    statusBarPlayPause.command = 'coverflow.togglePlayPause';
    statusBarPlayPause.text = '$(play)';
    statusBarPlayPause.tooltip = 'Play';
    statusBarPlayPause.show();

    statusBarNext = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        97
    );
    statusBarNext.command = 'coverflow.next';
    statusBarNext.text = '$(chevron-right)';
    statusBarNext.tooltip = 'Next Track';
    statusBarNext.show();
    
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(statusBarPrevious);
    context.subscriptions.push(statusBarPlayPause);
    context.subscriptions.push(statusBarNext);
    context.subscriptions.push({
        dispose: stopStatusUpdates
    });

    const commands = [
        vscode.commands.registerCommand('coverflow.play', async () => {
            await music.play();
            await updateAllStatusBars();
            await updatePanel();
        }),
        vscode.commands.registerCommand('coverflow.pause', async () => {
            await music.pause();
            await updateAllStatusBars();
            await updatePanel();
        }),
        vscode.commands.registerCommand('coverflow.togglePlayPause', async () => {
            await music.togglePlayPause();
            await updateAllStatusBars();
            await updatePanel();
        }),
        vscode.commands.registerCommand('coverflow.next', async () => {
            await music.nextTrack();
            await updateAllStatusBars();
            await updatePanel();
        }),
        vscode.commands.registerCommand('coverflow.previous', async () => {
            await music.previousTrack();
            await updateAllStatusBars();
            await updatePanel();
        }),
        vscode.commands.registerCommand('coverflow.showPanel', async () => {
            const column = await vscode.window.showQuickPick(
                ['Left (Primary)', 'Right (Next to Terminal)', 'Far Right'],
                { placeHolder: 'Choose panel position' }
            );
            
            let viewColumn: vscode.ViewColumn;
            switch (column) {
                case 'Right (Next to Terminal)':
                    viewColumn = vscode.ViewColumn.Two;
                    break;
                case 'Far Right':
                    viewColumn = vscode.ViewColumn.Three;
                    break;
                default:
                    viewColumn = vscode.ViewColumn.One;
            }

            if (panel) {
                try {
                    panel.reveal(viewColumn);
                } catch (e) {
                    console.error('Failed to reveal panel:', e);
                    // If reveal fails, it might be disposed, so let's try to recreate it
                    panel = undefined;
                    // Note: In a real scenario, you might want to trigger the 'else' block logic here
                    // but for simplicity, we'll just let the user click again or handle it in next turn.
                }
            }
            
            if (!panel) {
                panel = vscode.window.createWebviewPanel(
                    'coverflowPanel',
                    'CoverFlow',
                    viewColumn,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true,
                        localResourceRoots: [
                            vscode.Uri.file(path.join(context.extensionPath, 'media')),
                            vscode.Uri.file(path.join(context.extensionPath, 'src', 'webview'))
                        ]
                    }
                );
                
                panel.webview.html = getPanelHtml(panel.webview, context);
                
                panel.webview.onDidReceiveMessage((msg) => {
                    handlePanelMessage(msg);
                });
                
                panel.onDidDispose(() => {
                    panel = undefined;
                });
                
                context.subscriptions.push(panel);
            }
        }),
        vscode.commands.registerCommand('coverflow.volumeUp', async () => {
            await music.volumeUp();
        }),
        vscode.commands.registerCommand('coverflow.volumeDown', async () => {
            await music.volumeDown();
        }),
        vscode.commands.registerCommand('coverflow.toggleShuffle', async () => {
            await music.toggleShuffle();
        }),
        vscode.commands.registerCommand('coverflow.toggleRepeat', async () => {
            await music.toggleRepeat();
        })
    ];
    
    commands.forEach(cmd => context.subscriptions.push(cmd));
    
    startStatusUpdates();
}

async function updatePanel(): Promise<void> {
    if (!panel) {
        return;
    }

    try {
        const track = await music.getCurrentTrack();
        const isPlaying = await music.isPlaying();
        const artworkBase64 = track ? await music.getArtworkBase64() : null;
        const shuffleEnabled = await music.getShuffleEnabled();
        const repeatMode = await music.getRepeatMode();
        const volume = await music.getVolume();
        
        await panel.webview.postMessage({
            type: 'trackUpdate',
            track: track ? { ...track, artworkBase64 } : null,
            isPlaying: isPlaying,
            shuffleEnabled: shuffleEnabled,
            repeatMode: repeatMode,
            volume: volume
        });
    } catch (error) {
        console.error('Failed to update panel:', error);
        // If it failed because it's disposed, make sure we know
        if (error instanceof Error && error.message.includes('disposed')) {
            panel = undefined;
        }
    }
}

async function handlePanelMessage(msg: { command: string; value?: any }): Promise<void> {
    switch (msg.command) {
        case 'play':
            await music.play();
            break;
        case 'pause':
            await music.pause();
            break;
        case 'togglePlayPause':
            await music.togglePlayPause();
            break;
        case 'next':
            await music.nextTrack();
            break;
        case 'previous':
            await music.previousTrack();
            break;
        case 'volume':
            if (typeof msg.value === 'number') {
                await music.setVolume(msg.value);
            }
            break;
        case 'toggleShuffle':
            await music.toggleShuffle();
            break;
        case 'toggleRepeat':
            await music.toggleRepeat();
            break;
        case 'getTrack':
            await updatePanel();
            break;
        case 'getPlaylists':
            const playlists = await music.getPlaylists();
            try {
                await panel?.webview.postMessage({ type: 'playlists', playlists });
            } catch (e) {
                console.error('Failed to post playlists:', e);
            }
            break;
        case 'getPlaylistTracks':
            if (msg.value) {
                const tracks = await music.getPlaylistTracks(msg.value);
                try {
                    await panel?.webview.postMessage({ type: 'playlistTracks', tracks, playlistId: msg.value });
                } catch (e) {
                    console.error('Failed to post playlist tracks:', e);
                }
            }
            break;
        case 'playTrack':
            if (msg.value && msg.value.playlistId && msg.value.trackName) {
                await music.playTrack(msg.value.playlistId, msg.value.trackName);
                await updateAllStatusBars();
                await updatePanel();
            }
            break;
    }
    await updateAllStatusBars();
}

function getPanelHtml(webview: vscode.Webview, context: vscode.ExtensionContext): string {
    const htmlPath = path.join(context.extensionPath, 'src', 'webview', 'coverflow.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    const stylePath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'coverflow.css'));
    const styleUri = webview.asWebviewUri(stylePath);

    const nonce = getNonce();

    html = html.replace('{styleUri}', styleUri.toString());
    html = html.replace('{cspSource}', webview.cspSource);
    html = html.replace(/{nonce}/g, nonce);

    return html;
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function deactivate(): void {
    stopStatusUpdates();
}