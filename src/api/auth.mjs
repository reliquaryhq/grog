import fetch from 'node-fetch';
import { GOG_AUTH_HEADERS, GOG_AUTH_URL, GOG_CLIENT_ID, GOG_CLIENT_SECRET } from '../util/api.mjs';
import { getJson, getQuery, handleError } from '../util/http.mjs';

const getAuthorizationCode = (code, redirectUri) =>
  fetch(
    `${GOG_AUTH_URL}/token?${getQuery({ client_id: GOG_CLIENT_ID, client_secret: GOG_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: redirectUri })}`,
    { headers: { ...GOG_AUTH_HEADERS } },
  )
  .then(handleError)
  .then(getJson);

const getRefreshToken = (refreshToken) =>
  fetch(
    `${GOG_AUTH_URL}/token?${getQuery({ client_id: GOG_CLIENT_ID, client_secret: GOG_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: refreshToken })}`,
    { headers: { ...GOG_AUTH_HEADERS } },
  )
  .then(handleError)
  .then(getJson);

export {
  getAuthorizationCode,
  getRefreshToken,
};
