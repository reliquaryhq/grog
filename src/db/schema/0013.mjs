const up = async (connection, sql) => {
  return connection.query(sql`
    CREATE TABLE api_product_patches (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      from_build_id BIGINT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
      to_build_id BIGINT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
      data JSONB,
      revision BIGINT,
      revision_hash TEXT,
      revision_first_seen_at TIMESTAMP,
      revision_last_seen_at TIMESTAMP
    );

    CREATE TABLE patches (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      from_build_id BIGINT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
      to_build_id BIGINT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
      gog_id TEXT NOT NULL UNIQUE,
      repository_path TEXT,
      is_mirrored BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    INSERT INTO asset_types
      (name, slug)
    VALUES
      ('Depot Diff Chunk', 'depot-diff-chunk');
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    DROP TABLE api_product_patches;
    DROP TABLE patches;
    DELETE FROM asset_types WHERE slug = 'depot-diff-chunk';
  `);
}

export { up, down };
