FROM node:16 as ui

COPY ui/package.json ui/package-lock.json ./
RUN npm install
COPY ui/ ./
RUN npm run build

FROM golang:1.17 as go-build

WORKDIR /go/src/github.com/abibby/comicbox-3

# Download go dependencies and compile
# TODO: Figure out a way to cache the go dependencies like we do the JS ones to speed up build
COPY . .

COPY --from=ui /dist ui/dist

RUN go build -o bin/comicbox

# Now copy it into our base image.
FROM alpine:3.15

# RUN apt-get update && apt-get install -y ca-certificates
# RUN update-ca-certificates

COPY --from=go-build /go/src/github.com/abibby/comicbox-3/bin/comicbox /usr/bin/comicbox

ENV DB_PATH=/db.sqlite
ENV LIBRARY_PATH=/comics
ENV CACHE_PATH=/cache

VOLUME ["/db.sqlite", "/comics", "/cache"]

CMD ["/usr/bin/comicbox"]
