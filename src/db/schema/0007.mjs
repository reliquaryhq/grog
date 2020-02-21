const up = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE assets
    ADD COLUMN headers JSON;
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE assets DROP COLUMN headers;
  `);
}

export { up, down };
