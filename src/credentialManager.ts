import { type ExtensionContext } from 'vscode';

const PREFIX: string = 'vscode-twitch-coder';

export default class CredentialManager {
  private static context: ExtensionContext | null = null;

  public static setup(ctx: ExtensionContext) {
    this.context = ctx;
  }

  public static async setSecret(key: string, value: string): Promise<void> {
    if (value !== null) {
      await this.context?.secrets.store(`${PREFIX}.${key}`, value);
    }
  }

  public static async deleteSecret(key: string): Promise<void> {
    await this.context?.secrets.delete(`${PREFIX}.${key}`);
  }

  public static async getSecret(key: string): Promise<string | undefined> {
    return await this.context?.secrets.get(`${PREFIX}.${key}`);
  }
}
