import * as api from '../api.mjs';

const REFRESH_TTL = 10 * 60 * 1000;

class Session {
  initializeFromJson(json) {
    const parsed = JSON.parse(json);

    this.refreshToken = parsed.refreshToken;
    this.accessToken = parsed.accessToken;
    this.expiresAt = parsed.expiresAt;
    this.userId = parsed.userId;
    this.sessionId = parsed.sessionId;
  }

  async initializeFromUrl(codeUrl) {
    const code = (new URL(codeUrl)).searchParams.get('code');
    const redirectUri = codeUrl.split(/[?&]code=/)[0];

    const response = await api.auth.getAuthorizationCode(code, redirectUri);

    this.refreshToken = response.refresh_token;
    this.accessToken = response.access_token;
    this.expiresAt = (new Date()).getTime() + (response.expires_in * 1000);
    this.userId = response.user_id;
    this.sessionId = response.session_id;
  }

  async getBearer() {
    const refreshAt = this.expiresAt - REFRESH_TTL;

    if ((new Date()).getTime() > refreshAt) {
      await this.refresh();
    }

    return `Bearer ${this.accessToken}`;
  }

  async check() {
    return this.expiresAt > (new Date()).getTime();
  }

  async refresh() {
    const response = await api.auth.getRefreshToken(this.refreshToken);

    this.refreshToken = response.refresh_token;
    this.accessToken = response.access_token;
    this.expiresAt = (new Date()).getTime() + (response.expires_in * 1000);
    this.userId = response.user_id;
    this.sessionId = response.session_id;
  }

  toJson() {
    return JSON.stringify({
      refreshToken: this.refreshToken,
      accessToken: this.accessToken,
      expiresAt: this.expiresAt,
      userId: this.userId,
      sessionId: this.sessionId,
    });
  }
}

export default Session;
