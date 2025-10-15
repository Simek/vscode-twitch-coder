import * as vscode from 'vscode';

import { App } from './app';
import CredentialManager from './credentialManager';
import { SecretKeys } from './enums';
import { TwitchChatService } from './ttvchat';

let app: App;
let ttvchat: TwitchChatService;

export async function activate(context: vscode.ExtensionContext) {
  CredentialManager.setup(context);
  await CredentialManager.deleteSecret(SecretKeys.twitchToken);

  const outputChannel = vscode.window.createOutputChannel('Twitch Coder');

  app = new App(outputChannel);
  ttvchat = new TwitchChatService(context, app.API, outputChannel);

  app.intialize(context);
  await ttvchat.initialize(context);

  return app.API;
}

export async function deactivate() {
  await ttvchat.dispose();
}

export function editorHasDecorations() {
  return true;
}
