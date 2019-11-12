import fetch from 'node-fetch';
import { GOG_API_HEADERS, GOG_API_URL, GOG_WWW_HEADERS, GOG_WWW_URL } from '../util/api.mjs';
import { getJson, handleError, getQuery } from '../util/http.mjs';

const PRODUCT_EXPAND = [
  'downloads',
  'expanded_dlcs',
  'description',
  'screenshots',
  'videos',
  'related_products',
  'changelog',
];

const getCatalogProducts = (page, sort, mediaType = null) =>
  fetch(
    `${GOG_WWW_URL}/games/ajax/filtered?${getQuery({ mediaType, page, sort })}`,
    { headers: GOG_WWW_HEADERS },
  )
  .then(handleError)
  .then(getJson);

const getProduct = (productId) =>
  fetch(
    `${GOG_API_URL}/products/${productId}?expand=${PRODUCT_EXPAND.join(',')}`,
    { headers: GOG_API_HEADERS },
  )
  .then(handleError)
  .then(getJson);

export {
  getCatalogProducts,
  getProduct,
};
