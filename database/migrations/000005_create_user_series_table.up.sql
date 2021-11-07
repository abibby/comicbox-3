CREATE TABLE user_series (
    series_name TEXT NOT NULL,
    user_id BLOB NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    list TEXT,
    update_map TEXT NOT NULL,
    PRIMARY KEY (series_name, user_id)
);