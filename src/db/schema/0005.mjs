const up = async (connection, sql) => {
  return connection.query(sql`
    INSERT INTO asset_types
      (name, slug)
    VALUES
      ('Bonus Content File', 'bonus-content-file'),
      ('Installer File', 'installer-file'),
      ('Language Pack File', 'language-pack-file'),
      ('Patch File', 'patch-file'),
      ('Checksum File', 'checksum-file');

    CREATE TABLE downlinks (
      id BIGSERIAL,
      product_id BIGINT NOT NULL,
      asset_id BIGINT NOT NULL,
      file_id TEXT NOT NULL,
      downlink_path TEXT NOT NULL,
      size BIGINT NOT NULL
    );
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    DELETE FROM asset_types
      WHERE slug = 'bonus-content-file'
      OR slug = 'installer-file'
      OR slug = 'language-pack-file'
      OR slug = 'patch-file'
      OR slug = 'checksum-file';

    DROP TABLE downlinks;
  `);
}

export { up, down };
