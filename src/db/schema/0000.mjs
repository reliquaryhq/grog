const up = async (connection, sql) => {
  return connection.query(sql`
    CREATE TABLE schema (
      version INT NOT NULL
    );

    CREATE TABLE api_products (
      id BIGSERIAL,
      product_id BIGINT NOT NULL,
      title TEXT,
      slug TEXT,
      data JSONB,
      revision BIGINT,
      revision_hash TEXT,
      revision_first_seen_at TIMESTAMP,
      revision_last_seen_at TIMESTAMP
    );

    CREATE TABLE api_product_builds (
      id BIGSERIAL,
      product_id BIGINT NOT NULL,
      os TEXT,
      data JSONB,
      revision BIGINT,
      revision_hash TEXT,
      revision_first_seen_at TIMESTAMP,
      revision_last_seen_at TIMESTAMP
    );

    CREATE TABLE assets (
      id BIGSERIAL,
      product_id BIGINT,
      host TEXT NOT NULL,
      path TEXT NOT NULL,
      hash_algorithm TEXT,
      hash_encoding TEXT,
      hash_value TEXT,
      size BIGINT,
      verify_hash_algorithm TEXT,
      verify_hash_encoding TEXT,
      verify_hash_value TEXT,
      verify_size BIGINT,
      is_downloaded BOOLEAN,
      is_verified BOOLEAN,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    );
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    DROP TABLE schema;
    DROP TABLE api_products;
    DROP TABLE api_product_builds;
    DROP TABLE assets;
  `);
}

export { up, down };
