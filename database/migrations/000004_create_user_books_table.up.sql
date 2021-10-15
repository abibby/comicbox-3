CREATE TABLE user_books (
    book_id BLOB NOT NULL,
    user_id BLOB NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    current_page INT,
    PRIMARY KEY (book_id, user_id)
);