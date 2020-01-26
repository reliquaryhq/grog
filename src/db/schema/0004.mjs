const up = async (connection, sql) => {
  return connection.query(sql`
    INSERT INTO asset_types
      (name, slug)
    VALUES
      ('Depot File', 'depot-file'),
      ('Depot File Chunk', 'depot-file-chunk');
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    DELETE FROM asset_types
      WHERE slug = 'depot-file'
      OR slug = 'depot-file-chunk';
  `);
}

export { up, down };
