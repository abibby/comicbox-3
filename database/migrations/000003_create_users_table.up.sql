CREATE TABLE users (
    id BLOB NOT NULL PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    username TEXT NOT NULL,
    password TEXT NOT NULL
);