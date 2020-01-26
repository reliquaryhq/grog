import fetch from 'node-fetch';
import { GOG_EMBED_HEADERS, GOG_EMBED_URL } from '../util/api.mjs';
import { getJson, handleError } from '../util/http.mjs';

const getUserGames = (authorization) =>
  fetch(
    `${GOG_EMBED_URL}/user/data/games`,
    { headers: { ...GOG_EMBED_HEADERS, 'Authorization': authorization } },
  )
  .then(handleError)
  .then(getJson);

export {
  getUserGames,
};
