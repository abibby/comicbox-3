FROM node:20 AS ui

WORKDIR /ui

COPY ui/package.json ui/package-lock.json ./
RUN npm ci

COPY ui/ ./
RUN npm run prod

FROM golang:1.22 AS go-build

WORKDIR /go/src/github.com/abibby/comicbox-3

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=ui /ui/dist ui/dist

RUN GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build

# Now copy it into our base image.
FROM alpine:latest AS certs
RUN apk add --no-cache ca-certificates && \
    update-ca-certificates

FROM scratch

COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

COPY --from=go-build /go/src/github.com/abibby/comicbox-3/comicbox-3 /comicbox

ENV DB_PATH=/db.sqlite
ENV LIBRARY_PATH=/comics
ENV CACHE_PATH=/cache

VOLUME ["/db.sqlite", "/comics", "/cache"]

CMD ["/comicbox"]
