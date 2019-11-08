import fetch from 'node-fetch';
import { GOG_API_HEADERS, GOG_API_URL } from '../util/api.mjs';
import { getJson, handleError } from '../util/http.mjs';

const PRODUCT_EXPAND = [
  'downloads',
  'expanded_dlcs',
  'description',
  'screenshots',
  'videos',
  'related_products',
  'changelog',
];

const getProduct = (productId) =>
  fetch(
    `${GOG_API_URL}/products/${productId}?expand=${PRODUCT_EXPAND.join(',')}`,
    { headers: GOG_API_HEADERS },
  )
  .then(handleError)
  .then(getJson);

export {
  getProduct,
};
