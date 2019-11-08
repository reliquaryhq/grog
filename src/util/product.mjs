import _ from 'lodash';
import { hashObject, sortObject } from './common.mjs';
import * as db from '../db.mjs';

const createOrUpdateApiProduct = async (productId, data, fetchedAt) => {
  const revisionHash = getApiProductRevisionHash(data);
  const existingApiProduct = await db.product.getApiProduct({ productId });

  if (existingApiProduct) {
    if (existingApiProduct['revision_hash'] === revisionHash) {
      console.log(`Updating api product revision last seen at; product: ${productId}; revision: ${existingApiProduct['revision']}`);

      return db.product.observeApiProductRevision({
        productId,
        revision: existingApiProduct['revision'],
        revisionLastSeenAt: fetchedAt,
      });
    } else {
      console.log(`Creating new api product revision; product: ${productId}; revision: ${existingApiProduct['revision'] + 1}`);

      return db.product.createApiProductRevision({
        productId,
        title: data['title'],
        slug: data['slug'],
        data,
        revision: existingApiProduct['revision'] + 1,
        revisionHash,
        revisionFirstSeenAt: fetchedAt,
        revisionLastSeenAt: fetchedAt,
      });
    }
  } else {
    console.log(`Creating new api product; product: ${productId}`);

    return db.product.createApiProductRevision({
      productId,
      title: data['title'],
      slug: data['slug'],
      data,
      revision: 1,
      revisionHash,
      revisionFirstSeenAt: fetchedAt,
      revisionLastSeenAt: fetchedAt,
    });
  }
};

const createOrUpdateApiProductBuilds = async (productId, os, data, fetchedAt) => {
  const revisionHash = getApiProductBuildsRevisionHash(data);
  const existingApiProductBuilds = await db.product.getApiProductBuilds({ productId, os });

  if (existingApiProductBuilds) {
    if (existingApiProductBuilds['revision_hash'] === revisionHash) {
      console.log(`Updating api product builds revision last seen at; product: ${productId}; os: ${os}; revision: ${existingApiProductBuilds['revision']}`);

      return db.product.observeApiProductBuildsRevision({
        productId,
        os,
        revision: existingApiProductBuilds['revision'],
        revisionLastSeenAt: fetchedAt,
      });
    } else {
      console.log(`Creating new api product builds revision; product: ${productId}; os: ${os}; revision: ${existingApiProductBuilds['revision'] + 1}`);

      return db.product.createApiProductBuildsRevision({
        productId,
        os,
        data,
        revision: existingApiProductBuilds['revision'] + 1,
        revisionHash,
        revisionFirstSeenAt: fetchedAt,
        revisionLastSeenAt: fetchedAt,
      });
    }
  } else {
    console.log(`Creating new api product builds; product: ${productId}; os: ${os}`);

    return db.product.createApiProductBuildsRevision({
      productId,
      os,
      data,
      revision: 1,
      revisionHash,
      revisionFirstSeenAt: fetchedAt,
      revisionLastSeenAt: fetchedAt,
    });
  }
};

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
  createOrUpdateApiProduct,
  createOrUpdateApiProductBuilds,
};
