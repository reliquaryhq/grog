const up = async (connection, sql) => {
  return connection.query(sql`
    CREATE TABLE schema (
      version INT NOT NULL
    );

    CREATE TABLE api_products (
      id BIGSERIAL,
      product_id BIGINT,
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
      product_id BIGINT,
      os TEXT,
      data JSONB,
      revision BIGINT,
      revision_hash TEXT,
      revision_first_seen_at TIMESTAMP,
      revision_last_seen_at TIMESTAMP
    );

    CREATE TABLE cdn_files (
      id BIGSERIAL,
      path TEXT NOT NULL UNIQUE,
      expected_md5 TEXT,
      actual_md5 TEXT,
      expected_size BIGINT,
      actual_size BIGINT,
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
    DROP TABLE cdn_files;
  `);
}

export { up, down };
