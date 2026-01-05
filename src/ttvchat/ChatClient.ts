import { type Badges, type ChatUserstate, Client, type Options } from 'tmi.js';
import {
  type ConfigurationChangeEvent,
  type Disposable,
  type Event,
  EventEmitter,
  type ExtensionContext,
  type WorkspaceConfiguration,
  commands,
  window,
  workspace,
} from 'vscode';

import { API } from './api/API';
import CredentialManager from '../credentialManager';
import { Configuration, LogLevel, SecretKeys, Settings } from '../enums';
import { type log } from '../logger';

type BadgesType = Badges & {
  follower: string;
} & Record<string, string | undefined>;

export type ChatClientMessageReceivedEvent = {
  userState: ChatUserstate;
  message: string;
};

export class ChatClient implements Disposable {
  private readonly _onChatClientConnected: EventEmitter<boolean> = new EventEmitter();
  private readonly _onChatClientMessageReceived: EventEmitter<ChatClientMessageReceivedEvent> = new EventEmitter();

  public readonly onChatClientConnected: Event<boolean> = this._onChatClientConnected.event;
  public readonly onChatClientMessageReceived: Event<ChatClientMessageReceivedEvent> =
    this._onChatClientMessageReceived.event;

  private config?: WorkspaceConfiguration;
  private client?: Client;
  private channel: string = '';
  private autoConnect: boolean = false;
  private announceBot: boolean = true;
  private joinMessage: string = '';
  private leaveMessage: string = '';
  private usageTip: string = '';
  private requiredBadges: string[] = [];

  constructor(private log: log) {}

  public async initialize(context: ExtensionContext) {
    this.updateConfig();

    if (this.autoConnect) {
      await this.connect();
    }

    context.subscriptions.push(workspace.onDidChangeConfiguration(this.onDidChangeConfigurationHandler, this));
  }

  public updateConfig() {
    this.config = workspace.getConfiguration(Configuration.sectionIdentifier);
    this.autoConnect = this.config.get<boolean>(Settings.autoConnect) || false;
    this.announceBot = this.config.get<boolean>(Settings.announceBot) || true;
    this.joinMessage = this.config.get<string>(Settings.joinMessage) || '';
    this.leaveMessage = this.config.get<string>(Settings.leaveMessage) || '';
    this.usageTip = this.config.get<string>(Settings.usageTip) || '';
    this.requiredBadges = this.config.get<string[]>(Settings.requiredBadges) || [];
  }

  public async connect(silent: boolean = false) {
    this.updateConfig();

    if (this.config && !this.isConnected) {
      const accessToken = await CredentialManager.getSecret(SecretKeys.account);
      const login = await CredentialManager.getSecret(SecretKeys.userLogin);
      if (accessToken && login) {
        const channel = this.config.get<string>(Settings.channels);

        if (!channel || channel.length === 0) {
          window.showWarningMessage('Twitch Coder: No channels configured, please add at least one channel.');
          await commands.executeCommand('workbench.action.openSettings', Configuration.sectionIdentifier);
          return undefined;
        }

        this.channel = channel;

        const opts: Options = {
          identity: {
            username: login,
            password: accessToken,
          },
          channels: this.channel.split(', ').map((c) => c.trim()),
        };

        this.client = Client(opts);
        this.client.on('connected', this.onConnectedHandler.bind(this));
        this.client.on('message', this.onMessageHandler.bind(this));
        if (!silent) {
          this.client.on('join', this.onJoinHandler.bind(this));
        }

        const status = await this.client.connect();
        this._onChatClientConnected.fire(true);
        return status;
      }
    }
    return undefined;
  }

  public async disconnect(silent: boolean = false) {
    if (this.isConnected) {
      if (!silent && this.announceBot && this.leaveMessage.length > 0) {
        await this.sendMessage(this.leaveMessage);
      }
      if (this.client) {
        await this.client.disconnect();
        this.client = undefined;
      }
      this._onChatClientConnected.fire(false);
    }
  }

  public async dispose() {
    await this.disconnect();
  }

  private get isConnected(): boolean {
    return this.client ? this.client.readyState() === 'OPEN' : false;
  }

  private async sendMessage(message: string) {
    if (this.isConnected && this.client) {
      await this.client.say(this.channel, message);
    }
  }

  private async onJoinHandler(channel: string, username: string, self: boolean) {
    if (self && this.client && this.announceBot && this.joinMessage.length > 0) {
      this.log(`Joined channel: ${channel} as ${username}`);
      await this.sendMessage(this.joinMessage);
    }
  }

  private onConnectedHandler(address: string, port: number) {
    this.log(`Connected chat client to ${address} port ${port}`);
  }

  private async onMessageHandler(channel: string, userState: ChatUserstate, message: string, self: boolean) {
    this.log(`Received '${message}' from ${userState['display-name']}`);

    if (self) {
      return;
    }

    if (!message) {
      return;
    }

    const badges = (userState.badges as BadgesType) || {};
    badges.follower = (await API.isUserFollowingChannel(userState.id!, channel)) ? '1' : '0';

    if (this.requiredBadges.length > 0 && !badges.broadcaster) {
      // Check to ensure the user has a required badge
      const canContinue = this.requiredBadges.some((badge) => badges[badge] === '1');
      if (!canContinue) {
        this.log(
          LogLevel.Warning,
          `${userState['display-name']} does not have any of the required badges to use the highlight command.`
        );
        return;
      }
    }

    message = message.toLocaleLowerCase().trim();

    if (message.startsWith('!line') || message.startsWith('!highlight')) {
      const messageContent = message.split(' ').slice(1).join(' ').trim();
      if (messageContent.length === 0) {
        await this.sendMessage(this.usageTip);
        return;
      }
      this._onChatClientMessageReceived.fire({
        userState,
        message,
      });
    }
  }

  private async onDidChangeConfigurationHandler(event: ConfigurationChangeEvent) {
    this.updateConfig();

    if (event.affectsConfiguration(Configuration.sectionIdentifier) && this.isConnected) {
      await this.disconnect(true);
      await this.connect(true);
    }
  }
}
