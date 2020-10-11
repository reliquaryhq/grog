import * as db from '../db.mjs';

const createBuildsFromApiProductBuilds = async (product, apiProductBuilds) => {
  if (!apiProductBuilds) {
    return;
  }

  const apiBuildItems = (apiProductBuilds.data || {}).items || [];

  for (const apiBuildItem of apiBuildItems) {
    const build = await db.build.getBuild({ gogId: apiBuildItem.build_id });

    if (!build) {
      const repositoryUrl = ((apiBuildItem.urls || [])[0] || {}).url;
      const repositoryPath = repositoryUrl ? new URL(repositoryUrl).pathname : null;

      await db.build.createBuild({
        productId: product.id,
        gogId: apiBuildItem.build_id,
        gogLegacyId: apiBuildItem.legacy_build_id,
        repositoryPath: repositoryPath,
        os: apiBuildItem.os,
        generation: apiBuildItem.generation,
        versionName: apiBuildItem.version_name,
        publishedAt: new Date(apiBuildItem.date_published),
      });
    }
  }
};

const syncBuildRepositoryGen2 = async (repository) => {
  const build = await db.build.getBuild({ gogId: repository.buildId });

  if (!build) {
    throw new Error(`Missing build: ${repository.buildId}`);
  }

  for (const repositoryDepot of repository.depots || []) {
    const product = await db.product.getProduct({
      gogId: repositoryDepot.productId,
    });

    let depot = await db.depot.getDepot({
      productId: product.id,
      manifest: repositoryDepot.manifest,
    });

    if (!depot) {
      depot = await db.depot.createDepot({
        productId: product.id,
        manifest: repositoryDepot.manifest,
        size: repositoryDepot.size,
        compressedSize: repositoryDepot.compressedSize,
        languages: repositoryDepot.languages,
        bitness: repositoryDepot.osBitness,
        isGogDepot: repositoryDepot.isGogDepot,
        isOfflineDepot: false,
      });
    }

    let buildDepot = await db.build.getBuildDepot({
      buildId: build.id,
      depotId: depot.id,
    });

    if (!buildDepot) {
      buildDepot = await db.build.createBuildDepot({
        buildId: build.id,
        depotId: depot.id,
      });
    }
  }

  if (repository.offlineDepot) {
    const repositoryDepot = repository.offlineDepot;

    const product = await db.product.getProduct({
      gogId: repositoryDepot.productId,
    });

    let depot = await db.depot.getDepot({
      productId: product.id,
      manifest: repositoryDepot.manifest,
    });

    if (!depot) {
      depot = await db.depot.createDepot({
        productId: product.id,
        manifest: repositoryDepot.manifest,
        size: repositoryDepot.size,
        compressedSize: repositoryDepot.compressedSize,
        languages: repositoryDepot.languages,
        bitness: repositoryDepot.osBitness,
        isGogDepot: repositoryDepot.isGogDepot,
        isOfflineDepot: true,
      });
    }

    let buildDepot = await db.build.getBuildDepot({
      buildId: build.id,
      depotId: depot.id,
    });

    if (!buildDepot) {
      buildDepot = await db.build.createBuildDepot({
        buildId: build.id,
        depotId: depot.id,
      });
    }
  }
};

export {
  createBuildsFromApiProductBuilds,
  syncBuildRepositoryGen2,
};
