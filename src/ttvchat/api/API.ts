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

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    return res.status === 200;
  }

  /**
   * Validates an OAuth token; returns { valid, login }.
   */
  public static async validateToken(token: string): Promise<{ valid: boolean; login: string }> {
    const url = `https://id.twitch.tv/oauth2/validate`;

    const res = await fetch(url, {
      headers: { Authorization: `OAuth ${token}` },
    });
    if (res.status !== 200) {
      return { valid: false, login: '' };
    }
    const json = (await res.json()) as { login: string };
    return { valid: true, login: json.login };
  }

  /**
   * Revokes an OAuth token; returns true on HTTP 200.
   */
  public static async revokeToken(token: string): Promise<boolean> {
    const url =
      `https://id.twitch.tv/oauth2/revoke` +
      `?client_id=${encodeURIComponent(TwitchKeys.clientId)}` +
      `&token=${encodeURIComponent(token)}`;

    const res = await fetch(url, {
      method: 'POST',
    });
    return res.status === 200;
  }
}
