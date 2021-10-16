package builder_test

import (
	"testing"

	"github.com/abibby/comicbox-3/builder"
	"github.com/stretchr/testify/assert"
)

func TestSelect(t *testing.T) {
	sql, args, err := builder.New().
		Select("a", "b").
		ToSQL()
	assert.Nil(t, err)
	assert.Len(t, args, 0)
	assert.Equal(t, "select a, b", sql)
}
func TestWhere(t *testing.T) {
	sql, args, err := builder.New().
		Where("a = ?", "test").
		Where("c = ?", 7).
		ToSQL()
	assert.Nil(t, err)
	assert.Equal(t, []interface{}{"test", 7}, args)
	assert.Equal(t, "where a = ? and c = ?", sql)
}

func TestToSQL(t *testing.T) {
	sql, args, err := builder.New().ToSQL()
	assert.Nil(t, err)
	assert.Len(t, args, 0)
	assert.Equal(t, "", sql)
}
