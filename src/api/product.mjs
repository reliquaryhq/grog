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

const getAccountProducts = (page, sortBy, mediaType = 1) =>
  fetch(
    `${GOG_WWW_URL}/account/getFilteredProducts?${getQuery({ hiddenFlag: 0, mediaType, page, sortBy })}`,
    { headers: GOG_WWW_HEADERS },
  )
  .then(handleError)
  .then(getJson);

const getCatalogProducts = (page, sort, mediaType = null) =>
  fetch(
    `${GOG_WWW_URL}/games/ajax/filtered?${getQuery({ mediaType, page, sort })}`,
    { headers: GOG_WWW_HEADERS },
  )
  .then(handleError)
  .then(getJson);

const getDownlink = (path, authorization) =>
  fetch(
    `${GOG_API_URL}${path}`,
    { headers: { ...GOG_API_HEADERS, 'Authorization': authorization } },
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
  getAccountProducts,
  getCatalogProducts,
  getDownlink,
  getProduct,
};
