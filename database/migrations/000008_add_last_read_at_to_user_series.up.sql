ALTER TABLE user_series ADD last_read_at TEXT NOT NULL DEFAULT '0001-01-01T00:00:00Z';

update user_series set deleted_at = null where deleted_at = '0001-01-01T00:00:00Z';
update user_books set deleted_at = null where deleted_at = '0001-01-01T00:00:00Z';