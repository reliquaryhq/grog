import fetch from 'node-fetch';
import { GOG_CS_HEADERS, GOG_CS_URL } from '../util/api.mjs';
import { getJson, getQuery, handleError } from '../util/http.mjs';

const getBuilds = (productId, os, generation = 2, version = 2) =>
  fetch(
    `${GOG_CS_URL}/products/${productId}/os/${os}/builds?generation=${generation}&_version=${version}`,
    { headers: GOG_CS_HEADERS },
  )
  .then(handleError)
  .then(getJson);

const getSecureLink = (productId, path, authorization, generation = 2, version = 2, type = null) =>
  fetch(
    `${GOG_CS_URL}/products/${productId}/secure_link?${getQuery({ generation, path, type, _version: version })}`,
    { headers: { ...GOG_CS_HEADERS, 'Authorization': authorization } },
  )
  .then(handleError)
  .then(getJson);

export {
  getBuilds,
  getSecureLink,
};
