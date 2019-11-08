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

    CREATE TABLE cdn_files (
      id BIGSERIAL,
      product_id BIGINT,
      path TEXT NOT NULL UNIQUE,
      md5 TEXT,
      size BIGINT,
      verify_md5 TEXT,
      verify_size BIGINT,
      is_downloaded BOOLEAN,
      is_verified BOOLEAN,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    );

    CREATE TABLE image_files (
      id BIGSERIAL,
      product_id BIGINT,
      path TEXT NOT NULL UNIQUE,
      md5 TEXT,
      size BIGINT,
      is_downloaded BOOLEAN,
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
    DROP TABLE image_files;
  `);
}

export { up, down };
