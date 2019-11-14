const up = async (connection, sql) => {
  return connection.query(sql`
    CREATE TABLE asset_types (
      id SERIAL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL
    );

    INSERT INTO asset_types
      (name, slug)
    VALUES
      ('Depot Manifest', 'depot-manifest'),
      ('Product Image', 'product-image'),
      ('Repository Manifest', 'repository-manifest'),
      ('Screenshot', 'screenshot');

    ALTER TABLE assets
    ADD COLUMN asset_type_id INTEGER;
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE assets DROP COLUMN asset_type_id;
    DROP TABLE asset_types;
  `);
}

export { up, down };
