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
  if (_.has(normalized, 'dlcs')) {
    normalized['dlcs'] = {
      'products': _.get(normalized, 'dlcs.products', [])
        .map((product) => ({ 'id': product['id'] })),
    };
  }

  // Drop expanded_dlcs
  if (_.has(normalized, 'expanded_dlcs')) {
    delete normalized['expanded_dlcs'];
  }

  return hashObject(normalized);
};

export {
  getProductRevisionHash,
};
