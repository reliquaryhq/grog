const up = async (connection, sql) => {
  return connection.query(sql`
    ALTER TABLE assets
    ADD CONSTRAINT assets_pkey
    PRIMARY KEY (id);

    CREATE TABLE asset_responses (
      id BIGSERIAL PRIMARY KEY,
      asset_id BIGINT REFERENCES assets(id) ON DELETE CASCADE,
      headers JSON,
      status_code TEXT,
      status_text TEXT
    );

    INSERT INTO asset_responses
      (asset_id, headers)
    SELECT
      id, headers
    FROM
      assets
    WHERE
      headers IS NOT NULL;
  `);
};

const down = async (connection, sql) => {
  return connection.query(sql`
    DROP TABLE asset_responses;

    ALTER TABLE assets
    DROP CONSTRAINT assets_pkey;
  `);
}

export { up, down };
