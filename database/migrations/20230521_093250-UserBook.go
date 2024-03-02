package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230521_093250-UserBook",
		Up: schema.Create("user_books", func(table *schema.Blueprint) {
			table.DateTime("created_at")
			table.DateTime("updated_at")
			table.DateTime("deleted_at").Nullable()
			table.JSON("update_map")
			table.Blob("book_id")
			table.Blob("user_id")
			table.Int("current_page")
			table.ForeignKey("book_id", "books", "id")
			table.ForeignKey("user_id", "users", "id")
			table.PrimaryKey("book_id", "user_id")
		}),
		Down: schema.DropIfExists("user_books"),
	})
}
