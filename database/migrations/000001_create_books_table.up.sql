CREATE TABLE books (
    id BLOB NOT NULL PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    title TEXT NOT NULL,
    chapter REAL,
    volume REAL,
    series TEXT,
    authors TEXT NOT NULL,
    pages TEXT NOT NULL,
    page_count INT NOT NULL,
    rtl BOOLEAN NOT NULL CHECK (rtl in (0, 1)),
    sort TEXT NOT NULL,
    file TEXT NOT NULL,
    update_map TEXT NOT NULL
);

CREATE INDEX books_sort ON books (sort);
CREATE INDEX books_series_sort ON books (series, sort);
