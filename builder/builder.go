package builder

type Builder struct {
	selects  []*Expression
	wheres   []*Expression
	groupBys []*Expression
}

type Expression struct {
	joiner string
	sql    string
	params []interface{}
}

func New() *Builder {
	return &Builder{}
}

func (b *Builder) Where(exp string, params ...interface{}) *Builder {
	if b.wheres == nil {
		b.wheres = []*Expression{}
	}
	b.wheres = append(b.wheres, &Expression{
		joiner: " and ",
		sql:    exp,
		params: params,
	})
	return b
}

func (b *Builder) Select(columns ...string) *Builder {
	if b.selects == nil {
		b.selects = []*Expression{}
	}
	for _, col := range columns {
		b.selects = append(b.selects, &Expression{
			joiner: ", ",
			sql:    col,
			params: []interface{}{},
		})
	}
	return b
}

func (b *Builder) ToSQL() (string, []interface{}, error) {
	result := ""
	args := []interface{}{}

	if b.selects != nil {
		result += "select " + joinExpressions(b.selects, &args)
	}
	if b.wheres != nil {
		result += "where " + joinExpressions(b.wheres, &args)
	}

	return result, args, nil
}

func joinExpressions(exprs []*Expression, args *[]interface{}) string {
	result := ""

	for i, where := range exprs {
		if i != 0 {
			result += where.joiner
		}
		result += where.sql
		*args = append(*args, where.params...)
	}
	return result
}
