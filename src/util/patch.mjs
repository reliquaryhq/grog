import * as db from '../db.mjs';

const createPatchFromApiProductPatch = async (product, apiProductPatch) => {
  if (!product || !apiProductPatch || !apiProductPatch.data) {
    return;
  }

  let patch = await db.patch.getPatch({
    productId: product.id,
    gogId: apiProductPatch.data.id,
  });

  if (!patch) {
    const fromBuild = await db.build.getBuild({
      gogId: apiProductPatch.data.from_build_id,
    });
    const toBuild = await db.build.getBuild({
      gogId: apiProductPatch.data.to_build_id,
    });
    const repositoryUrl = apiProductPatch.data.link;
    const repositoryPath = repositoryUrl ? new URL(repositoryUrl).pathname : null;

    patch = await db.patch.createPatch({
      productId: product.id,
      fromBuildId: fromBuild.id,
      toBuildId: toBuild.id,
      gogId: apiProductPatch.data.id,
      repositoryPath,
    });
  }

  return patch;
};

const getPatchableBuilds = (builds) => {
  const patchableBuilds = {};
  const gen2Builds = builds.filter((build) => build.generation === 2);
  const sortedBuilds = gen2Builds.sort((a, b) => a.gog_id - b.gog_id);

  for (const build of sortedBuilds) {
    const os = build.os;
    const branch = build.branch || 'master';

    if (!patchableBuilds[os]) {
      patchableBuilds[os] = {};
    }

    if (!patchableBuilds[os][branch]) {
      patchableBuilds[os][branch] = [];
    }

    patchableBuilds[os][branch].push(build);
  }

  return patchableBuilds;
};

export {
  createPatchFromApiProductPatch,
  getPatchableBuilds,
};
