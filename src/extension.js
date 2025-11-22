"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
var vscode = require("vscode");
var fs = require("fs");
var path = require("path");
var os = require("os");
// discord-rpc doesn't have official types in the main package, so we use require
var RPC = require('discord-rpc');
var clientId = '1440730997460172810';
var brainDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
var client;
var statusBarItem;
var agentStatus = '';
var agentTaskName = '';
var currentConversationId = null;
var watchedTaskFile = null;
var fileWatcher = false;
var activityStartTime = Date.now();
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
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(function () { return updateActivity(); }), vscode.workspace.onDidChangeTextDocument(function () { return updateActivity(); }));
    // Watch for agent status changes
    watchAgentStatus();
}
function watchAgentStatus() {
    // Initial check
    findActiveConversation();
    // Poll for conversation changes every 3.33 seconds
    setInterval(function () {
        findActiveConversation();
    }, 3330);
}
function findActiveConversation() {
    fs.readdir(brainDir, function (err, items) {
        if (err) {
            console.error('Error reading brain directory:', err);
            return;
        }
        // Filter for conversation directories (UUID format)
        var conversationDirs = items.filter(function (item) {
            var fullPath = path.join(brainDir, item);
            try {
                return fs.statSync(fullPath).isDirectory() &&
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item);
            }
            catch (e) {
                return false;
            }
        });
        if (conversationDirs.length === 0) {
            return;
        }
        // Find the most recently modified task.md
        var mostRecentTime = 0;
        var mostRecentConversation = null;
        var STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
        conversationDirs.forEach(function (dir) {
            var taskFile = path.join(brainDir, dir, 'task.md');
            try {
                var stats = fs.statSync(taskFile);
                if (stats.mtimeMs > mostRecentTime) {
                    mostRecentTime = stats.mtimeMs;
                    mostRecentConversation = dir;
                }
            }
            catch (e) {
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
            var newTaskFile = path.join(brainDir, mostRecentConversation, 'task.md');
            // Unwatch old file
            if (watchedTaskFile && fileWatcher) {
                fs.unwatchFile(watchedTaskFile);
            }
            // Watch new file
            watchedTaskFile = newTaskFile;
            checkStatusFile();
            fs.watchFile(watchedTaskFile, { interval: 1000 }, function (curr, prev) {
                if (curr.mtimeMs !== prev.mtimeMs) {
                    checkStatusFile();
                }
            });
            fileWatcher = true;
        }
    });
}
function checkStatusFile() {
    if (!watchedTaskFile)
        return;
    fs.readFile(watchedTaskFile, 'utf8', function (err, data) {
        if (err) {
            // File might not exist yet
            return;
        }
        // Parse task.md sequentially to find the context of the active task
        var lines = data.split('\n');
        var activeTask = '';
        var taskName = '';
        var currentMainHeader = '';
        var currentSectionHeader = '';
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            var trimmedLine = line.trim();
            if (trimmedLine.startsWith('# ')) {
                currentMainHeader = trimmedLine.substring(2).trim();
                // Reset section header when a new main header is found
                currentSectionHeader = '';
            }
            else if (trimmedLine.startsWith('## ')) {
                currentSectionHeader = trimmedLine.substring(3).trim();
            }
            else if (trimmedLine.includes('[/]')) {
                // Found the active task
                var match = trimmedLine.match(/\[\/\]\s*(.*?)(?:<!--|$)/);
                if (match && match[1]) {
                    activeTask = match[1].trim();
                    // Use the most specific header available: Section > Main
                    taskName = currentSectionHeader || currentMainHeader;
                    break; // Stop after finding the first active task
                }
            }
        }
        var statusChanged = false;
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
    client.on('ready', function () {
        console.log('Discord RPC connected');
        statusBarItem.text = "$(check) RPC: Active";
        updateActivity();
    });
    client.on('disconnected', function () {
        statusBarItem.text = "$(error) RPC: Disconnected";
        setTimeout(initRPC, 10000); // Auto-reconnect
    });
    client.login({ clientId: clientId }).catch(console.error);
}
function updateActivity() {
    if (!client)
        return;
    var details = 'Idle';
    var state = 'In Antigravity';
    var smallImageKey = undefined;
    var smallImageText = undefined;
    // Priority: Agent Status > Editor Activity
    if (agentStatus || agentTaskName) {
        // Show the active task item as details
        if (agentStatus) {
            details = agentStatus;
        }
        else if (agentTaskName) {
            details = agentTaskName;
        }
        // Show the task name as state if we have both
        if (agentTaskName && agentStatus) {
            state = agentTaskName;
        }
        else {
            // Try to get the current workspace folder name
            var editor = vscode.window.activeTextEditor;
            if (editor) {
                var folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
                if (folder) {
                    state = "Project: ".concat(folder.name);
                }
            }
            else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                // Fallback if no active editor
                state = "Project: ".concat(vscode.workspace.workspaceFolders[0].name);
            }
            else {
                state = 'Agent Active';
            }
        }
        smallImageKey = 'robot';
        smallImageText = 'Agent Working';
    }
    else {
        var editor = vscode.window.activeTextEditor;
        if (editor) {
            var fileName = editor.document.fileName.split(/[\\\/]/).pop();
            details = "Editing ".concat(fileName);
            var folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
            if (folder) {
                state = "Project: ".concat(folder.name);
            }
        }
    }
    client.setActivity({
        details: details,
        state: state,
        startTimestamp: activityStartTime,
        largeImageKey: 'antigravity_logo',
        largeImageText: 'Antigravity',
        smallImageKey: smallImageKey,
        smallImageText: smallImageText,
        instance: false,
    }).catch(function (err) { return console.error(err); });
}
function deactivate() {
    if (client) {
        client.destroy();
    }
    if (watchedTaskFile) {
        fs.unwatchFile(watchedTaskFile);
    }
}
