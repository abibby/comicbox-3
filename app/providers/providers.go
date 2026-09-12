package providers

import (
	"context"
)

// var ModelRegistrar = modeldi.NewModelRegistrar()
var registrar = []func(context.Context){}

func Add(register func(context.Context)) {
	registrar = append(registrar, register)
}

// Register registers any custom di providers
func Register(ctx context.Context) {
	for _, register := range registrar {
		register(ctx)
	}
}
