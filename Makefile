GC=go

all: ui/dist/app.js
	$(GC) build -o bin/comicbox

ui/dist/app.js: ui/src/models.ts
	cd ui && \
		npm install && \
		npm run build

ui/src/models.ts: helpers/generate-ts-models.go models/*.go
	$(GC) run helpers/generate-ts-models.go

dev:
	$(GC) run -tags dev main.go