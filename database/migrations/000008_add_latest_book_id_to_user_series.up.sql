ALTER TABLE user_series ADD latest_book_id blob;

update user_series
set latest_book_id = (
        select books.id
        from books
            left join user_books user_books on books.id = user_books.book_id and user_books.user_id = user_series.user_id
        WHERE
            books.series = user_series.series_name
            and (
                user_books.current_page < (books.page_count - 1)
                or user_books.current_page is null
            )
            and books.deleted_at is null
        order by sort
        limit 1
    )