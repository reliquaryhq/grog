const up = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE assets
    ADD COLUMN content_type TEXT;
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE assets DROP COLUMN content_type;
  `);
}

export { up, down };
