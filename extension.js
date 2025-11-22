const vscode = require('vscode');
const RPC = require('discord-rpc');

const fs = require('fs');
const path = require('path');

const clientId = '1440730997460172810';
const brainDir = 'C:/Users/Mauro/.gemini/antigravity/brain';
let client;
let statusBarItem;
let agentStatus = '';
let agentTaskName = '';
let currentConversationId = null;
let watchedTaskFile = null;
let fileWatcher = null;
let activityStartTime = Date.now();

function activate(context) {
    console.log('Antigravity RPC is now active!');

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(broadcast) RPC: Connecting...";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Initialize RPC
    initRPC();

    // Register event listeners for activity updates
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(updateActivity),
        vscode.workspace.onDidChangeTextDocument(updateActivity)
    );

    // Watch for agent status changes
    watchAgentStatus();
}

function watchAgentStatus() {
    // Initial check
    findActiveConversation();

    // Poll for conversation changes every 2 seconds
    setInterval(() => {
        findActiveConversation();
    }, 3330);
}

function findActiveConversation() {
    fs.readdir(brainDir, (err, items) => {
        if (err) {
            console.error('Error reading brain directory:', err);
            return;
        }

        // Filter for conversation directories (UUID format)
        const conversationDirs = items.filter(item => {
            const fullPath = path.join(brainDir, item);
            try {
                return fs.statSync(fullPath).isDirectory() &&
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item);
            } catch (e) {
                return false;
            }
        });

        if (conversationDirs.length === 0) {
            return;
        }

        // Find the most recently modified task.md
        let mostRecentTime = 0;
        let mostRecentConversation = null;
        const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

        conversationDirs.forEach(dir => {
            const taskFile = path.join(brainDir, dir, 'task.md');
            try {
                const stats = fs.statSync(taskFile);
                if (stats.mtimeMs > mostRecentTime) {
                    mostRecentTime = stats.mtimeMs;
                    mostRecentConversation = dir;
                }
            } catch (e) {
                // task.md doesn't exist in this conversation, skip
            }
        });

        // Check if the most recent activity is stale
        if (Date.now() - mostRecentTime > STALE_THRESHOLD) {
            if (currentConversationId !== null) {
                // Clear status if we were tracking something
                currentConversationId = null;
                if (watchedTaskFile) {
                    fs.unwatchFile(watchedTaskFile);
                    watchedTaskFile = null;
                }
                agentStatus = '';
                agentTaskName = '';
                updateActivity();
            }
            return;
        }

        if (mostRecentConversation && mostRecentConversation !== currentConversationId) {
            // Switch to new conversation
            currentConversationId = mostRecentConversation;
            const newTaskFile = path.join(brainDir, mostRecentConversation, 'task.md');

            // Unwatch old file
            if (watchedTaskFile && fileWatcher) {
                fs.unwatchFile(watchedTaskFile);
            }

            // Watch new file
            watchedTaskFile = newTaskFile;
            checkStatusFile();

            fs.watchFile(watchedTaskFile, { interval: 1000 }, (curr, prev) => {
                if (curr.mtimeMs !== prev.mtimeMs) {
                    checkStatusFile();
                }
            });

            fileWatcher = true;
        }
    });
}

function checkStatusFile() {
    if (!watchedTaskFile) return;

    fs.readFile(watchedTaskFile, 'utf8', (err, data) => {
        if (err) {
            // File might not exist yet
            return;
        }

        // Parse task.md for the first "In Progress" item
        const lines = data.split('\n');
        let activeTask = '';
        let taskName = '';

        // Look for the task name (first # heading)
        for (const line of lines) {
            if (line.startsWith('# ')) {
                taskName = line.substring(2).trim();
                break;
            }
        }

        // Look for active task (first [/] item)
        for (const line of lines) {
            if (line.includes('[/]')) {
                // Extract text between ] and <!-- or end of line
                const match = line.match(/\[\/\]\s*(.*?)(?:<!--|$)/);
                if (match && match[1]) {
                    activeTask = match[1].trim();
                    break;
                }
            }
        }

        let statusChanged = false;
        if (activeTask !== agentStatus) {
            agentStatus = activeTask;
            statusChanged = true;
        }
        if (taskName !== agentTaskName) {
            agentTaskName = taskName;
            statusChanged = true;
        }

        if (statusChanged) {
            updateActivity();
        }
    });
}

function initRPC() {
    client = new RPC.Client({ transport: 'ipc' });

    client.on('ready', () => {
        console.log('Discord RPC connected');
        statusBarItem.text = "$(check) RPC: Active";
        updateActivity();
    });

    client.on('disconnected', () => {
        statusBarItem.text = "$(error) RPC: Disconnected";
        setTimeout(initRPC, 10000); // Auto-reconnect
    });

    client.login({ clientId }).catch(console.error);
}

function updateActivity() {
    if (!client) return;

    let details = 'Idle';
    let state = 'In Antigravity';
    let smallImageKey = undefined;
    let smallImageText = undefined;

    // Priority: Agent Status > Editor Activity
    if (agentStatus || agentTaskName) {
        // Show the active task item as details
        if (agentStatus) {
            details = agentStatus;
        } else if (agentTaskName) {
            details = agentTaskName;
        }

        // Show the task name as state if we have both
        if (agentTaskName && agentStatus) {
            state = agentTaskName;
        } else {
            // Try to get the current workspace folder name
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
                if (folder) {
                    state = `Project: ${folder.name}`;
                }
            } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                // Fallback if no active editor
                state = `Project: ${vscode.workspace.workspaceFolders[0].name}`;
            } else {
                state = 'Agent Active';
            }
        }

        smallImageKey = 'robot';
        smallImageText = 'Agent Working';
    } else {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const fileName = editor.document.fileName.split(/[\\\/]/).pop();
            details = `Editing ${fileName}`;

            const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
            if (folder) {
                state = `Project: ${folder.name}`;
            }
        }
    }

    client.setActivity({
        details,
        state,
        startTimestamp: activityStartTime,
        largeImageKey: 'antigravity_logo',
        largeImageText: 'Antigravity',
        smallImageKey,
        smallImageText,
        instance: false,
    }).catch(err => console.error(err));
}

function deactivate() {
    if (client) {
        client.destroy();
    }
    if (watchedTaskFile) {
        fs.unwatchFile(watchedTaskFile);
    }
}

module.exports = {
    activate,
    deactivate
};
