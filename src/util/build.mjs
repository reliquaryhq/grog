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

export {
  createBuildsFromApiProductBuilds,
};
