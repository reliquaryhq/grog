const up = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE assets
    ADD COLUMN last_modified TIMESTAMP;
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE assets DROP COLUMN last_modified;
  `);
}

export { up, down };
