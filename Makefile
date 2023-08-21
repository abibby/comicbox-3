GC=go

all: ui/dist/app.js
	$(GC) build -o bin/comicbox

ui/dist/app.js: ui/src/models.ts
	cd ui && \
		npm install && \
		npm run build

ui/src/models.ts: helpers/generate-ts-models.go models/*.go
	$(GC) run helpers/generate-ts-models.go

dev: ui/src/models.ts
	$(GC) run -tags dev main.go

test: ui/src/models.ts ui/dist/app.js
	$(GC) run -tags test main.go