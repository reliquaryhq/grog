import path from 'path';
import zlib from 'zlib';
import fs from 'fs-extra';
import _ from 'lodash';
import { GOG_CDN_URL } from './api.mjs';
import { readAsset } from './asset.mjs';
import { hashObject, sortObject } from './common.mjs';
import { env, shutdown } from './process.mjs';
import { formatBytes, formatPath22 } from './string.mjs';
import * as db from '../db.mjs';

const createProductFromApiProduct = async (apiProduct) => {
  if (!apiProduct || !apiProduct.data) {
    return;
  }

  let productRecord = await db.product.getProduct({ gogId: apiProduct.data.id });

  if (productRecord) {
    const updates = {};

    if (!productRecord.title && apiProduct.title) {
      updates.title = apiProduct.title;
    }

    if (!productRecord.slug && apiProduct.slug) {
      updates.slug = apiProduct.slug;
    }

    await db.product.updateProduct({ ...updates, id: productRecord.id });

    return await db.product.getProduct({ id: productRecord.id });
  }

  productRecord = await db.product.createProduct({
    gogId: apiProduct.data.id,
    title: apiProduct.data.title,
    slug: apiProduct.data.slug,
  });

  return productRecord;
};

const createOrUpdateApiProduct = async (productId, data, fetchedAt) => {
  const revisionHash = getApiProductRevisionHash(data);
  const existingApiProduct = await db.product.getApiProduct({ productId });

  if (existingApiProduct) {
    if (existingApiProduct['revision_hash'] === revisionHash) {
      console.log(`Updating api product revision last seen at; product: ${productId}; revision: ${existingApiProduct['revision']}`);

      await db.product.observeApiProductRevision({
        productId,
        revision: existingApiProduct['revision'],
        revisionLastSeenAt: fetchedAt,
      });

      return db.product.getApiProduct({ productId });
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

const createOrUpdateApiProductBuilds = async (productId, os, data, fetchedAt, password) => {
  const revisionHash = getApiProductBuildsRevisionHash(data);
  const existingApiProductBuilds = await db.product.getApiProductBuilds({ productId, os, password });

  if (existingApiProductBuilds) {
    if (existingApiProductBuilds['revision_hash'] === revisionHash) {
      console.log(`Updating api product builds revision last seen at; product: ${productId}; os: ${os}; password: ${password}; revision: ${existingApiProductBuilds['revision']}`);

      await db.product.observeApiProductBuildsRevision({
        productId,
        os,
        password,
        revision: existingApiProductBuilds['revision'],
        revisionLastSeenAt: fetchedAt,
      });

      return db.product.getApiProductBuilds({ productId, os, password });
    } else {
      console.log(`Creating new api product builds revision; product: ${productId}; os: ${os}; password: ${password}; revision: ${existingApiProductBuilds['revision'] + 1}`);

      return db.product.createApiProductBuildsRevision({
        productId,
        os,
        password,
        data,
        revision: existingApiProductBuilds['revision'] + 1,
        revisionHash,
        revisionFirstSeenAt: fetchedAt,
        revisionLastSeenAt: fetchedAt,
      });
    }
  } else {
    console.log(`Creating new api product builds; product: ${productId}; os: ${os}; password: ${password}`);

    return db.product.createApiProductBuildsRevision({
      productId,
      os,
      password,
      data,
      revision: 1,
      revisionHash,
      revisionFirstSeenAt: fetchedAt,
      revisionLastSeenAt: fetchedAt,
    });
  }
};

const createOrUpdateApiProductPatch = async (product, fromBuild, toBuild, data, fetchedAt) => {
  const revisionHash = getApiProductPatchRevisionHash(data);
  const existingApiProductPatch = await db.product.getApiProductPatch({
    productId: product.id,
    fromBuildId: fromBuild.id,
    toBuildId: toBuild.id,
  });

  if (existingApiProductPatch) {
    if (existingApiProductPatch['revision_hash'] === revisionHash) {
      console.log(`Updating api product patch revision last seen at; product: ${product.gog_id}; from build: ${fromBuild.gog_id}; to build: ${toBuild.gog_id}; revision: ${existingApiProductPatch.revision}`);

      await db.product.observeApiProductPatchRevision({
        productId: product.id,
        fromBuildId: fromBuild.id,
        toBuildId: toBuild.id,
        revision: existingApiProductPatch.revision,
        revisionLastSeenAt: fetchedAt,
      });

      return db.product.getApiProductPatch({
        productId: product.id,
        fromBuildId: fromBuild.id,
        toBuildId: toBuild.id,
      });
    } else {
      console.log(`Creating new api product patch revision; product: ${product.gog_id}; from build: ${fromBuild.gog_id}; to build: ${toBuild.gog_id}; revision: ${existingApiProductPatch.revision + 1}`);

      return db.product.createApiProductPatchRevision({
        productId: product.id,
        fromBuildId: fromBuild.id,
        toBuildId: toBuild.id,
        data,
        revision: existingApiProductPatch.revision + 1,
        revisionHash,
        revisionFirstSeenAt: fetchedAt,
        revisionLastSeenAt: fetchedAt,
      });
    }
  } else {
    console.log(`Creating new api product patch; product: ${product.gog_id}; from build: ${fromBuild.gog_id}; to build: ${toBuild.gog_id}; revision: 1`);

    return db.product.createApiProductPatchRevision({
      productId: product.id,
      fromBuildId: fromBuild.id,
      toBuildId: toBuild.id,
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

const getApiProductPatchRevisionHash = (patch) => {
  return hashObject(sortObject(patch));
};

const getProductBuilds = async (productId, os = null) => {
  const apiProductBuilds = await db.product.getAllApiProductBuilds({ productId });

  const productBuilds = {};

  for (const { data } of apiProductBuilds) {
    for (const item of data.items || []) {
      if (os && item.os !== os) {
        continue;
      }

      const manifestUrl = item.urls[0].url;
      const manifestPath = `/${manifestUrl.split('/').slice(3).join('/')}`;

      productBuilds[item.build_id] = {
        branch: item.branch,
        build_id: item.build_id,
        generation: item.generation,
        version_name: item.version_name,
        product_id: item.product_id,
        os: item.os,
        manifest_path: manifestPath,
      };
    }
  }

  return Object.values(productBuilds);
}

const installV2Item = async (productId, item, installDirectory) => {
  let itemPathParts = item.path.split(/[/\\]/);

  if ((item.flags || []).includes('support')) {
    if (itemPathParts[0].trim().toLowerCase() === 'app') {
      itemPathParts = itemPathParts.slice(1);
    }
  }

  const outputPath = path.join(installDirectory, ...itemPathParts);
  const size = (item.chunks || []).reduce((s, chunk) => s + (chunk.size || 0), 0);

  if (item.type === 'DepotFile') {
    await fs.mkdirp(path.dirname(outputPath));
  } else if (item.type === 'DepotDirectory') {
    await fs.mkdirp(outputPath);
  }

  if (item.type === 'DepotDirectory') {
    // Nothing left to do
    return;
  }

  if (await fs.exists(outputPath)) {
    const stat = await fs.stat(outputPath);

    if (stat.size === size) {
      // Nothing to do: item is already present and has the right size
      return;
    }

    // Remove incomplete file
    console.log(`Removing incomplete file: ${itemPathParts.join('/')}`);
    await fs.unlink(outputPath);
  }

  console.log(`Installing ${itemPathParts.join('/')} (${formatBytes(size)})`);

  if (item.chunks.length === 0) {
    await fs.writeFile(outputPath, '');

    // Nothing to do: the file contains no content
    return;
  }

  for (const chunk of item.chunks) {
    if (shutdown.shuttingDown) {
      return;
    }

    const chunkUrl = `${GOG_CDN_URL}/content-system/v2/store/${productId}/${formatPath22(chunk.compressedMd5)}`;
    const chunkData = await readAsset({ url: chunkUrl }, env.GROG_DATA_DIR);
    const chunkContent = zlib.inflateSync(chunkData);

    if (chunkContent.length !== chunk.size) {
      throw new Error(`Chunk size mismatch: ${chunkContent.length} !== ${chunk.size}`);
    }

    // TODO compare md5

    await fs.appendFile(outputPath, chunkContent);
  }

  if ((item.flags || []).includes('executable')) {
    await fs.chmod(outputPath, '744');
  }
};

const installV2Product = async (productBuild, destination, language = 'en-US') => {
  const repositoryManifestUrl = `${GOG_CDN_URL}${productBuild.manifest_path}`;
  const repositoryManifestData = await readAsset({ url: repositoryManifestUrl }, env.GROG_DATA_DIR);
  const repositoryManifest = JSON.parse(zlib.inflateSync(repositoryManifestData));

  console.log(`Installing product; product id: ${productBuild.product_id}; build id: ${productBuild.build_id}; generation: 2; os: ${productBuild.os}`);

  const selectedDepots = repositoryManifest.depots.filter((depot) => depot.languages.includes('*') || depot.languages.includes(language));

  console.log(`Selected ${selectedDepots.length} depots`);

  const installDirectory = path.join(destination, repositoryManifest.installDirectory);

  console.log(`Installing to ${installDirectory}`);

  for (const depot of selectedDepots) {
    const depotManifestUrl = `${GOG_CDN_URL}/content-system/v2/meta/${formatPath22(depot.manifest)}`;
    const depotManifestData = await readAsset({ url: depotManifestUrl }, env.GROG_DATA_DIR);
    const depotManifest = JSON.parse(zlib.inflateSync(depotManifestData));

    const { items } = depotManifest.depot;

    console.log(`Installing ${items.length} items from depot ${depot.manifest}`);

    for (const item of items) {
      if (shutdown.shuttingDown) {
        return;
      }

      await installV2Item(depot.productId, item, installDirectory);
    }
  }
};

const installProduct = async (productId, buildId, destination, language = 'en-US') => {
  const productBuilds = await getProductBuilds(productId);
  const productBuild = productBuilds.find((productBuild) => productBuild.build_id === buildId);

  if (!productBuild) {
    throw new Error('Product build not found');
  }

  if (productBuild.generation === 2) {
    await installV2Product(productBuild, destination, language);
  } else {
    throw new Error(`Unsupported generation: ${productBuild.generation}`);
  }
};

export {
  createProductFromApiProduct,
  createOrUpdateApiProduct,
  createOrUpdateApiProductBuilds,
  createOrUpdateApiProductPatch,
  getProductBuilds,
  installProduct,
};
