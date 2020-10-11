const up = async (connection, sql) => {
  return connection.query(sql`
    CREATE TABLE depots (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      manifest TEXT NOT NULL,
      size BIGINT,
      compressed_size BIGINT,
      languages JSONB,
      bitness JSONB,
      is_gog_depot BOOLEAN DEFAULT FALSE,
      is_offline_depot BOOLEAN DEFAULT FALSE,
      is_mirrored BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );

    CREATE TABLE build_depots (
      build_id BIGINT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
      depot_id BIGINT NOT NULL REFERENCES depots(id) ON DELETE CASCADE
    );
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    DROP TABLE depots;
    DROP TABLE build_depots;
  `);
}

export { up, down };
