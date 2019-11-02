import { sql } from '../../db.mjs';

const up = async (connection) => {
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
      raw_data JSON,
      revision BIGINT,
      revision_hash TEXT,
      revision_first_seen_at TIMESTAMP,
      revision_last_seen_at TIMESTAMP
    );
  `);
};

const down = async (connection) => {
  return connection.query(sql`
    DROP TABLE schema;
    DROP TABLE api_products;
  `);
}

export { up, down };
