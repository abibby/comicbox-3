GC=go

all: ui/dist/app.js
	$(GC) build -o bin/comicbox

ui/dist/app.js:
	cd ui && \
		npm install && \
		npm run build

dev:
	$(GC) run -tags dev main.go