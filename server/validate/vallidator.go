package validate

type Validator interface {
	Validate(i interface{}, value string) error
}

type ValidatorFunc func(i interface{}, value string) error

func (fv ValidatorFunc) Validate(i interface{}, value string) error {
	return fv(i, value)
}

var typeValidators = []Validator{}

func AddValidator(validator Validator) {
	typeValidators = append(typeValidators, validator)
}
func AddValidatorFunc(validator ValidatorFunc) {
	typeValidators = append(typeValidators, validator)
}
