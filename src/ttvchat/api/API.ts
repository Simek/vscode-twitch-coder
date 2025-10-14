import { TwitchKeys } from '../../enums';

const fetch = global.fetch;

export class API {
  /**
   * Returns true if userId is following channel.
   */
  public static async isUserFollowingChannel(userId: string, channel: string): Promise<boolean> {
    const url =
      `https://api.twitch.tv/helix/users/followers` +
      `?from_id=${encodeURIComponent(userId)}` +
      `&to_name=${encodeURIComponent(channel)}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (res.status !== 200) {
        return false;
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Validates an OAuth token; returns { valid, login }.
   */
  public static async validateToken(token: string): Promise<{ valid: boolean; login: string }> {
    const url = `https://id.twitch.tv/oauth2/validate`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `OAuth ${token}` },
      });
      if (res.status !== 200) {
        return { valid: false, login: '' };
      }
      const json = (await res.json()) as { login: string };
      return { valid: true, login: json.login };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Revokes an OAuth token; returns true on HTTP 200.
   */
  public static async revokeToken(token: string): Promise<boolean> {
    const url =
      `https://id.twitch.tv/oauth2/revoke` +
      `?client_id=${encodeURIComponent(TwitchKeys.clientId)}` +
      `&token=${encodeURIComponent(token)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
      });
      return res.status === 200;
    } catch (err) {
      throw err;
    }
  }
}
