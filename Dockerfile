FROM node:20 as ui

WORKDIR /ui

COPY ui/package.json ui/package-lock.json ./
RUN npm install

COPY ui/ ./
RUN npm run build

FROM golang:1.20 as go-build

WORKDIR /go/src/github.com/abibby/comicbox-3

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=ui /ui/dist ui/dist

RUN GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build

# Now copy it into our base image.
FROM alpine

RUN apk update && \
    apk add ca-certificates && \
    update-ca-certificates

# RUN apt-get update && apt-get install -y ca-certificates
# RUN update-ca-certificates

COPY --from=go-build /go/src/github.com/abibby/comicbox-3/comicbox-3 /comicbox

ENV DB_PATH=/db.sqlite
ENV LIBRARY_PATH=/comics
ENV CACHE_PATH=/cache

VOLUME ["/db.sqlite", "/comics", "/cache"]

CMD ["/comicbox"]
