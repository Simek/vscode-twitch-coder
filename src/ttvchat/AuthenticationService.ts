import { readFile, readFileSync } from 'node:fs';
import * as http from 'node:http';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { type Event, EventEmitter, Uri, env, extensions, window } from 'vscode';

import { API } from './api/API';
import CredentialManager from '../credentialManager';
import { extensionId } from '../constants';
import { LogLevel, SecretKeys, TwitchKeys } from '../enums';
import { type log } from '../logger';

export class AuthenticationService {
  private readonly _onAuthStatusChanged: EventEmitter<boolean> = new EventEmitter();
  public readonly onAuthStatusChanged: Event<boolean> = this._onAuthStatusChanged.event;
  private port: number = 5001;

  constructor(private log: log) {}

  public async initialize() {
    const accessToken = await CredentialManager.getSecret(SecretKeys.account);
    const userLogin = await CredentialManager.getSecret(SecretKeys.userLogin);

    if (accessToken && userLogin) {
      await this.validateToken(accessToken);
      return;
    }
    this._onAuthStatusChanged.fire(false);
  }

  // https://dev.twitch.tv/docs/authentication#validating-requests
  public async validateToken(accessToken: string) {
    await API.validateToken(accessToken);
    this._onAuthStatusChanged.fire(true);
    this.log('Twitch access token has been validated.');
    const hour = 1000 * 60 * 60;
    setInterval(this.validateToken, hour, accessToken); // Validate the token each hour
  }

  public async signInHandler() {
    const accessToken = await CredentialManager.getSecret(SecretKeys.account);
    if (!accessToken) {
      const state = randomUUID();
      this.createServer(state);

      env.openExternal(
        Uri.parse(
          `https://id.twitch.tv/oauth2/authorize?client_id=${TwitchKeys.clientId}` +
            `&redirect_uri=http://localhost:${this.port}` +
            `&response_type=token&scope=${TwitchKeys.scope}` +
            `&force_verify=true` +
            `&state=${state}`
        )
      );
    } else {
      const validResult = await API.validateToken(accessToken);
      if (validResult.valid) {
        this._onAuthStatusChanged.fire(true);
      }
    }
  }

  public async signOutHandler() {
    const token = await CredentialManager.getSecret(SecretKeys.account);
    if (token) {
      const revoked = await API.revokeToken(token);
      if (revoked) {
        window.showInformationMessage('Twitch token revoked successfully');
      }
    }
    await CredentialManager.deleteSecret(SecretKeys.account);
    await CredentialManager.deleteSecret(SecretKeys.userLogin);
    this._onAuthStatusChanged.fire(false);
  }

  private createServer(state: string) {
    const filePath = join(extensions.getExtension(extensionId)!.extensionPath, 'out', 'ttvchat', 'login', 'index.html');

    this.log(LogLevel.Debug, `Starting login server using filePath: ${filePath}.`);

    const file = readFileSync(filePath);
    if (file) {
      const server = http.createServer(async (req: any, res: any) => {
        const url = new URL(req.url, `http://localhost:${this.port}`);

        const { path, query } = Uri.parse(url.toString(), true);
        const queryParams = new URLSearchParams(query);

        if (req.url === '/') {
          res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
          res.end(file);
          return;
        } else if (path === '/oauth') {
          const accessToken = queryParams.get('access_token');

          if (!accessToken) {
            res.writeHead(500, 'Error while logging in. Access token missing.');
            res.end();
            return;
          }

          if (queryParams.get('state') !== state) {
            window.showErrorMessage('Error while logging in. State mismatch error.');
            await API.revokeToken(accessToken);
            this._onAuthStatusChanged.fire(false);
            res.writeHead(500, 'Error while logging in. State mismatch error.');
            res.end();
            return;
          }

          const validationResult = await API.validateToken(accessToken);
          if (validationResult.valid) {
            await CredentialManager.setSecret(SecretKeys.account, accessToken);
            await CredentialManager.setSecret(SecretKeys.userLogin, validationResult.login);
            this._onAuthStatusChanged.fire(true);
          }

          res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
          res.end(file);
        } else if (path === '/complete') {
          res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
          res.end(file);
          setTimeout(() => server.close(), 3000);
        } else if (path === '/twitch-coder-icon.png') {
          const imagePath = join(
            extensions.getExtension(extensionId)!.extensionPath,
            'resources',
            'twitch-coder-icon.png'
          );

          readFile(imagePath, (err, data) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Image not found');
              return;
            }

            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(data);
          });
        }
      });

      server.listen(this.port);

      server.on('error', (err: any) => {
        this.log(LogLevel.Error, err);
      });
    }
  }
}
