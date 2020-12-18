const up = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE builds
    ADD COLUMN branch TEXT;
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE builds DROP COLUMN branch;
  `);
}

export { up, down };
