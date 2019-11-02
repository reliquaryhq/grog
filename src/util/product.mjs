import _ from 'lodash';
import { hashObject, sortObject } from './common.mjs';

const getProductRevisionHash = (productData) => {
  const normalized = sortObject(productData);

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

  return hashObject(normalized);
};

const getApiProductBuildsRevisionHash = (buildsData) => {
  const normalized = sortObject(buildsData);

  if (_.has(normalized, 'items')) {
    for (const item of normalized['items']) {
      if (_.has(item, 'urls')) {
        // Treat urls as pathname only
        item['urls'] = _.uniq(item['urls'].map((url) => new URL(url['url']).pathname));
      }
    }

    // Sort item properties
    normalized['items'] = normalized['items'].map((item) => sortObject(item));
  }

  return hashObject(normalized);
};

export {
  getApiProductBuildsRevisionHash,
  getProductRevisionHash,
};
