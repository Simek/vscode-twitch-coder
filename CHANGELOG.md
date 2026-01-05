# Changelog

All notable changes to this project will be documented in this file.

## 🚧 Unreleased

- Add ability to persist highlight between VS Code restarts and an option to control the bechaviour.
- Add ability to set the custom badge for file with highlight or remove it entirely.
- Use the correctly cased Twitch username in tooltips and debug logs.
- Fix highlight of not-active tabs for files with multiple dots in the name.

## Released

### 0.4.1 - 2025.12.16

- Correctly handle expired Twitch token cleanup when bootstraping the extension.

### 0.4.0 - 2025.11.20

- Decorate tabs and files in the File Explorer tree view when they contain active highlights.

### 0.3.5 - 2025.11.06

- Fix README promo asset scaling and sizing issues in stores.

### 0.3.4 - 2025.11.06

- Improve the tooltip content over highlighted line.
- Fix integration usage tip for viewers not being sent to chat.

### 0.3.3 - 2025.10.20

- Improve Twitch OAuth App callback page.
- Re-connect silently when user changes settings while bot is connected and active.

### 0.3.2 - 2025.10.15

- Fix error when clicking a highlight for an inactive tab in the TreeView panel.
- Display the correctly formatted file name in incoming highlight notifications.

### 0.3.1 - 2025.10.15

- Add setting to control whether highlighting a non-active file should switch the editor to that file's tab.

### 0.3.0 - 2025.10.14

- Remove `node-fetch` in favor of the native fetch API to reduce extension size by ~75%.
- Show highlight author and comment in the tree view panel.

### 0.2.1 - 2025.10.14

- Add "Auto Connect" setting to enable the chat bot to connect to Twitch chat automatically when VS Code starts.

### 0.2.0 - 2025.10.13

- Add an option to highlight a line in one of the currently opened tabs.
- Add a "Clear All" button to the Highlight tree view panel.
- Show a hint and open the Settings panel when the status bar button is clicked, when the extension is not fully configured.

### 0.1.1 - 2025.10.13

- Fix parsing of OAuth authentication URLs.

### 0.1.0 - 2025.10.12

- Initial release.
