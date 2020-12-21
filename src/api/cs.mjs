import fetch from 'node-fetch';
import { GOG_CS_HEADERS, GOG_CS_URL } from '../util/api.mjs';
import { getJson, getQuery, handleError } from '../util/http.mjs';

const getBuilds = (productId, os, generation = 2, version = 2, password = null) =>
  fetch(
    `${GOG_CS_URL}/products/${productId}/os/${os}/builds?${getQuery({ generation, _version: version, password })}`,
    { headers: GOG_CS_HEADERS },
  )
  .then(handleError)
  .then(getJson);

const getPatch = (productId, fromBuildId, toBuildId, version = 4) =>
  fetch(
    `${GOG_CS_URL}/products/${productId}/patches?${getQuery({ from_build_id: fromBuildId, to_build_id: toBuildId, _version: version })}`,
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

const resolveRedirect = (url) =>
  fetch(
    url,
    { headers: { ...GOG_CS_HEADERS }, redirect: 'manual', follow: 0 },
  )
  .then(handleError)
  .then((response) => response.headers.get('location'));

export {
  getBuilds,
  getPatch,
  getSecureLink,
  resolveRedirect,
};
