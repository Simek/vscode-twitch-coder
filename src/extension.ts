import * as vscode from 'vscode';

import CredentialManager from './credentialManager';

import { App } from './app';
import { TwitchChatService } from './ttvchat';
import { SecretKeys } from './enums';

let app: App;
let ttvchat: TwitchChatService;

export function activate(context: vscode.ExtensionContext) {
  CredentialManager.setup(context);
  CredentialManager.deleteSecret(SecretKeys.twitchToken);

  const outputChannel = vscode.window.createOutputChannel('Twitch Coder');

  app = new App(outputChannel);
  ttvchat = new TwitchChatService(context, app.API, outputChannel);

  app.intialize(context);
  ttvchat.initialize(context);

  return app.API;
}

export function deactivate() {
  ttvchat.dispose();
}

export function editorHasDecorations() {
  return true;
}
