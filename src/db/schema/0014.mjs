const up = async (connection, sql) => {
  return connection.query(sql`
    CREATE INDEX idx_depots_product_id ON depots (product_id);
    CREATE INDEX idx_build_depots_build_id ON build_depots (build_id);
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    DROP INDEX idx_depots_product_id;
    DROP INDEX idx_build_depots_build_id;
  `);
}

export { up, down };
