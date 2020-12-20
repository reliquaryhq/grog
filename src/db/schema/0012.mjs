const up = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE api_product_builds
    ADD COLUMN password TEXT;
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE api_product_builds DROP COLUMN password;
  `);
}

export { up, down };
