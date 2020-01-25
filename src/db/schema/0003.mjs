const up = async (connection, sql) => {
  return connection.query(sql`
    CREATE INDEX idx_assets_path ON assets (path);
    CREATE INDEX idx_api_products_product_id on api_products (product_id);
    CREATE INDEX idx_api_product_builds_product_id on api_product_builds (product_id);
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    DROP INDEX idx_assets_path;
    DROP INDEX idx_api_products_product_id;
    DROP INDEX idx_api_product_builds_product_id;
  `);
}

export { up, down };
