import _ from 'lodash';
import { hashObject, sortObject } from './common.mjs';

const normalizeApiProduct = (product) => {
  const normalized = sortObject(product);

  // Ignore nested related product data
  if (_.has(normalized, 'related_products')) {
    normalized['related_products'] = _.get(normalized, 'related_products')
      .map((product) => ({ 'id': product['id'] }));
  }

  // Ignore nested dlc product data
  if (_.has(normalized, 'dlcs.products')) {
    normalized['dlcs'] = {
      'products': _.get(normalized, 'dlcs.products')
        .map((product) => ({ 'id': product['id'] })),
    };
  }

  // Drop expanded_dlcs
  if (_.has(normalized, 'expanded_dlcs')) {
    delete normalized['expanded_dlcs'];
  }

  return normalized;
};

const getApiProductRevisionHash = (product) => {
  return hashObject(normalizeApiProduct(product));
};

const normalizeApiProductBuildItem = (item) => {
  const normalized = sortObject(item);

  if (_.has(normalized, 'urls')) {
    // Treat urls as pathname only
    normalized['urls'] = _.uniq(normalized['urls'].map((url) => new URL(url['url']).pathname))
  }

  return normalized;
};

const normalizeApiProductBuilds = (builds) => {
  const normalized = sortObject(builds);

  if (_.has(normalized, 'items')) {
    normalized['items'] = normalized['items'].map((item) => normalizeApiProductBuildItem(item));
  }

  return normalized;
};

const getApiProductBuildsRevisionHash = (builds) => {
  return hashObject(normalizeApiProductBuilds(builds));
};

export {
  getApiProductBuildsRevisionHash,
  getApiProductRevisionHash,
};
