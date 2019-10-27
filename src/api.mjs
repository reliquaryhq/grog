import fetch from 'node-fetch';
import { getJson, handleError } from './util/http.mjs';

const GOG_GALAXY_USER_AGENT = 'GOGGalaxyClient/1.2.59.21 (win10 x64)';

const GOG_API_URL = 'https://api.gog.com';

const GOG_API_HEADERS = {
  'User-Agent': GOG_GALAXY_USER_AGENT,
};

const getProduct = (productId, expand = []) =>
  fetch(
    `${GOG_API_URL}/products/${productId}?expand=${expand.join(',')}`,
    { headers: GOG_API_HEADERS }
  )
  .then(handleError)
  .then(getJson);

export {
  getProduct,
};
