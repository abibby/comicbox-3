CREATE TABLE series (
    name TEXT NOT NULL PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    first_book_id BLOB,
    update_map TEXT NOT NULL
);
