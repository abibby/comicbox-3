CREATE TABLE series (
    name TEXT NOT NULL PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    first_book_id BLOB,
    first_book_cover_page INT,
    update_map TEXT NOT NULL
);
