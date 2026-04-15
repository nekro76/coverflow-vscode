import * as vscode from 'vscode';
import * as music from './music-controller';
import * as path from 'path';
import * as fs from 'fs';

let statusBarItem: vscode.StatusBarItem;
let statusBarPrevious: vscode.StatusBarItem;
let statusBarPlayPause: vscode.StatusBarItem;
let statusBarNext: vscode.StatusBarItem;
let panel: vscode.WebviewPanel | undefined;
let updateInterval: NodeJS.Timeout;
let lastTrackName = '';
let lastArtist = '';

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

async function syncWithAppleMusic(): Promise<void> {
    const track = await music.getCurrentTrack();
    if (track) {
        if (track.name !== lastTrackName || track.artist !== lastArtist) {
            lastTrackName = track.name;
            lastArtist = track.artist;
            await updateAllStatusBars();
            if (panel) {
                await updatePanel();
            }
        }
    } else {
        if (lastTrackName !== '') {
            lastTrackName = '';
            lastArtist = '';
            await updateAllStatusBars();
            if (panel) {
                await updatePanel();
            }
        }
    }
}

async function startStatusUpdates(): Promise<void> {
    await syncWithAppleMusic();
    updateInterval = setInterval(() => {
        syncWithAppleMusic();
    }, 10000);
}

export function activate(context: vscode.ExtensionContext): void {
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
statusBarItem.command = 'coverMusicPlayer.showPanel';
    statusBarItem.text = '$(music-note) Cover Music Player';
        statusBarItem.tooltip = 'Click to show Cover Music Player panel';
    statusBarItem.show();

    statusBarPrevious = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        99
    );
    statusBarPrevious.command = 'coverMusicPlayer.previous';
    statusBarPrevious.text = '$(chevron-left)';
    statusBarPrevious.tooltip = 'Previous Track';
    statusBarPrevious.show();

    statusBarPlayPause = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        98
    );
    statusBarPlayPause.command = 'coverMusicPlayer.togglePlayPause';
    statusBarPlayPause.text = '$(play)';
    statusBarPlayPause.tooltip = 'Play';
    statusBarPlayPause.show();

    statusBarNext = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        97
    );
    statusBarNext.command = 'coverMusicPlayer.next';
    statusBarNext.text = '$(chevron-right)';
    statusBarNext.tooltip = 'Next Track';
    statusBarNext.show();
    
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(statusBarPrevious);
    context.subscriptions.push(statusBarPlayPause);
    context.subscriptions.push(statusBarNext);

    const commands = [
        vscode.commands.registerCommand('coverMusicPlayer.play', async () => {
            await music.play();
            await updateAllStatusBars();
            await updatePanel();
        }),
        vscode.commands.registerCommand('coverMusicPlayer.pause', async () => {
            await music.pause();
            await updateAllStatusBars();
            await updatePanel();
        }),
        vscode.commands.registerCommand('coverMusicPlayer.togglePlayPause', async () => {
            await music.togglePlayPause();
            await updateAllStatusBars();
            await updatePanel();
        }),
        vscode.commands.registerCommand('coverMusicPlayer.next', async () => {
            await music.nextTrack();
            await updateAllStatusBars();
            await updatePanel();
        }),
        vscode.commands.registerCommand('coverMusicPlayer.previous', async () => {
            await music.previousTrack();
            await updateAllStatusBars();
            await updatePanel();
        }),
        vscode.commands.registerCommand('coverMusicPlayer.showPanel', async () => {
            const viewColumn = vscode.ViewColumn.Two;

            if (panel) {
                try {
                    panel.reveal(viewColumn);
                    return;
                } catch (e) {
                    console.error('Failed to reveal panel, likely disposed:', e);
                    panel = undefined;
                }
            }
            
            if (!panel) {
                try {
                    const newPanel = vscode.window.createWebviewPanel(
                        'coverMusicPlayerPanel',
                        'Cover Music Player',
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
                    
                    newPanel.webview.html = getPanelHtml(newPanel.webview, context);
                    
                    newPanel.webview.onDidReceiveMessage((msg) => {
                        handlePanelMessage(msg);
                    });
                    
                    newPanel.onDidDispose(() => {
                        if (panel === newPanel) {
                            panel = undefined;
                        }
                    });
                    
                    panel = newPanel;
                    context.subscriptions.push(panel);
                } catch (e) {
                    console.error('Failed to create webview panel:', e);
                    vscode.window.showErrorMessage('Failed to open Cover Music Player panel.');
                }
            }
        }),
        vscode.commands.registerCommand('coverMusicPlayer.volumeUp', async () => {
            await music.volumeUp();
        }),
        vscode.commands.registerCommand('coverMusicPlayer.volumeDown', async () => {
            await music.volumeDown();
        }),
        vscode.commands.registerCommand('coverMusicPlayer.toggleShuffle', async () => {
            await music.toggleShuffle();
        }),
        vscode.commands.registerCommand('coverMusicPlayer.toggleRepeat', async () => {
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
        const artwork = track ? await music.getArtwork() : null;
        
        await panel.webview.postMessage({
            type: 'trackUpdate',
            track: track ? { 
                ...track, 
                artworkBase64: artwork?.base64 || null,
                artworkMimeType: artwork?.mimeType || 'image/jpeg'
            } : null,
            prevTrack: null,
            nextTrack: null,
            isPlaying: isPlaying,
            shuffleEnabled: false,
            repeatMode: 'off',
            volume: 50
        });
    } catch (error) {
        console.error('Failed to update panel:', error);
        if (error instanceof Error && error.message.includes('disposed')) {
            panel = undefined;
        }
    }
}

async function handlePanelMessage(msg: { command: string; value?: any }): Promise<void> {
    switch (msg.command) {
        case 'togglePlayPause':
            await music.togglePlayPause();
            break;
        case 'next':
            await music.nextTrack();
            break;
        case 'previous':
            await music.previousTrack();
            break;
        case 'getTrack':
            await updatePanel();
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
    if (updateInterval) {
        clearInterval(updateInterval);
    }
}