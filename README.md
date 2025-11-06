<div align="center">

<img src="./resources/twitch-coder-icon.png" alt="Twitch Coder" width="96" />

# Twitch Coder VS Code Extension

<p align="center">
  <a aria-label="Latest release" href="https://github.com/Simek/vscode-twitch-coder/blob/main/CHANGELOG.md" target="_blank">
    <img alt="Latest release" src="https://img.shields.io/github/package-json/v/Simek/vscode-twitch-coder?style=flat-square&color=0366D6&labelColor=49505A" />
  </a>
  <a aria-label="Workflow status" href="https://github.com/Simek/vscode-twitch-coder/actions" target="_blank">
    <img alt="Workflow status" src="https://img.shields.io/github/actions/workflow/status/Simek/vscode-twitch-coder/build-and-test.yml?branch=main&style=flat-square&labelColor=49505A" />
  </a>
  <a aria-label="Install from VS Code Marketplace" href="https://marketplace.visualstudio.com/items?itemName=Simek.vscode-twitch-coder" target="_blank">
    <img alt="Install from VS Code Marketplace" src="https://img.shields.io/badge/marketplace-25292E?style=flat-square&label=%20&labelColor=49505A&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iODAwIiB2aWV3Qm94PSIwIDAgMzIgMzIiIGZpbGw9IiNCQ0MzQ0QiPjxwYXRoIGQ9Ik0zMC44NjUgMy40NDggMjQuMjgyLjI4MWExLjk5IDEuOTkgMCAwIDAtMi4yNzYuMzg1TDkuMzk3IDEyLjE3MSAzLjkwMiA4LjAwNGExLjMzIDEuMzMgMCAwIDAtMS43MDMuMDczTC40MzkgOS42ODFhMS4zMyAxLjMzIDAgMCAwLS4wMDUgMS45NjlMNS4yIDE1Ljk5OS40MzQgMjAuMzQ4YTEuMzMgMS4zMyAwIDAgMCAuMDA1IDEuOTY5bDEuNzYgMS42MDRhMS4zMyAxLjMzIDAgMCAwIDEuNzAzLjA3M2w1LjQ5NS00LjE3MiAxMi42MTUgMTEuNTFhMS45OCAxLjk4IDAgMCAwIDIuMjcxLjM4NWw2LjU4OS0zLjE3MmExLjk5IDEuOTkgMCAwIDAgMS4xMy0xLjgwMlY1LjI0OGMwLS43NjYtLjQ0My0xLjQ2OS0xLjEzNS0xLjgwMnptLTYuODYgMTkuODE4TDE0LjQzMiAxNmw5LjU3My03LjI2NnoiLz48L3N2Zz4=" />
  </a>
  <a aria-label="Install from Open VSX" href="https://open-vsx.org/extension/simek/vscode-twitch-coder" target="_blank">
    <img alt="Install from Open VSX" src="https://img.shields.io/badge/vscode-open%20vsx-25292E?style=flat-square&label=%20&logoColor=BCC3CD&labelColor=49505A&logo=Eclipse%20IDE" />
  </a>
</p>

</div>

A VS Code extension to allow your Twitch viewers to help in spotting bugs, typos, etc. by sending a command in chat that will highlight the line of code they want you to check.

<img width="1677" height="641" alt="screenshot" src="https://github.com/user-attachments/assets/b8438410-b8ea-44bb-86ef-e7e2e8de20e3" />

## 🔧 Requirements

In order to use this extension you will need the following things before going to the "Getting Started" section.

- An installed version of [VS Code](https://code.visualstudio.com/)
- A Twitch account for yourself or a separate one to be used as a chat bot ([sign up here](https://www.twitch.tv/signup))

## 🚀 Getting Started

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=Simek.vscode-twitch-coder) or [Open VSX](https://open-vsx.org/extension/simek/vscode-twitch-coder).
2. Open your VS Code Settings

   > You can press `CTRL/CMD + ,` or navigate via menus File -> Perferences -> Settings.

3. Type in "twitch" into the search bar
4. Find the `Twitch Coder: Channels` setting and enter the name of the channel(s) to which you'd like the extension to connect.

   > If you'd like to connect to more than one channel separate them by commas `,`, for example: `simek,dev_spajus`.

5. Find the `Twitch Coder: Nickname` setting. If you are using your own account for the chat bot then enter your account username as the value here. If you created a separate account use that username. Save your changes.
6. Make sure you're logged in to the Twitch account you wish to authorize the highlighter bot to access in your default browser.
7. In the status bar, click the "Twitch" button. After clicking it, you'll see a notification that the extension wants to open a URL.
8. Choose the "Open" option which should open a new tab of your default browser.
9. Read through the permissions that are being requested for use of this bot/extension and choose "Authorize". You will be notified that you can close the browser/tab.
11. Go back to VS Code and you should now see "Disconnected" in the status bar. Click on it to connect the bot to chat and start listening for highlight commands.

## 💬 Twitch Commands

To highlight a line, use:

```
!highlight <LineNumber> OR !line <LineNumber>
```

To unhighlight a line, use:

```
!line !<LineNumber>
```

To highlight multiple lines, use the same syntax as above but include a range of lines to highlight:

```
!line <StartLineNumber>-<EndLineNumber>
```

Additionally, you can also include comments:

```
!line <LineNumber> This is a test comment
```

Or highlight the line in one of opened tabs, which is not in active (it also works with comment and line ranges):

```
!line <LineNumber> <FileName> This is a test comment
```

## ⚙️ Extension Settings

- `twitchCoder.channels`: A comma separated list of channel name(s) to connect to on Twitch. Example: `simek` or for multiple channels: `simek, dev_spajus`.
- `twitchCoder.nickname`: The username the chat bot should use when joining a Twitch channel.

  > Note: this is required if you'd like to have the bot send join/leave messages in your chat. It also needs to match the Twitch username with which you generated the OAuth token.

- `twitchCoder.highlightColor`: Background color of the decoration. Use `rgba()` and define transparent background colors to play well with other decorations. Example: `rgba(169,112,255,0.8)`.
- `twitchCoder.highlightFontColor`: Font color of the decoration. Use `rgba()` and define transparent background colors to play well with other decorations. Example: `white`.
- `twitchCoder.highlightBorder`: CSS border styling property that will be applied to text enclosed by a decoration. Example: `1px solid #d7bdff`.
- `twitchCoder.autoConnect`: Whether or not the chat bot should try connecting automatically when VS Code starts.
- `twitchCoder.announceBot`: Whether or not the chat bot should announce its joining or leaving the chat room.
- `twitchCoder.joinMessage`: The message the chat bot will say when joining a chat room.
- `twitchCoder.leaveMessage`: The message the chat bot will say when leaving a chat room.
- `twitchCoder.usageTip`: A tip shared by the bot when a user chats: `!highlight` or `!line`.
- `twitchCoder.requiredBadges`: A list of badges required to use the highlighter command. The use must have at least one of these badges to use the command. Leave blank for no requirement. Example: `moderator, subscriber, vip`.
- `twitchCoder.switchActiveTab`: Whether or not allow the incoming highlight to switch the currently active editor tab.
- `twitchCoder.showHighlightsInActivityBar`: Show the Highlights icon in the activity bar to display the tree view.
- `twitchCoder.unhighlightOnDisconnect`: Whether or not unhighlight all lines when disconnected from the chat service.

## 👥 Attribution

Part of the code in this extension has been adapted from:

- [Twitch Highligher extension](https://github.com/clarkio/vscode-twitch-highlighter) built by [@clarkio](https://github.com/clarkio)
- [Twitchlint extension](https://github.com/irth/twitchlint) built by [@irth](https://github.com/irth)

## 📝 Release Notes

See [CHANGELOG.md](CHANGELOG.md)

## 🧑‍💻 Contributing

Any contributions are welcome!

### Prerequisites

- [Bun](https://bun.sh/) 1.3+
