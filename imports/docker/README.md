# Instructions for Running our Docker

## To Build
(from this directory)

```
docker build -t clowdcontrol/mindcontrol .
```

## To Run
(from anywhere, after building/pulling)

Note: the `-v` mount is **very important** as it contains the backup of the MongoDB.
```
docker run -it --rm -v ${PWD}/.mindcontrol/:/home/mindcontrol/.meteor/local -p 3000:3000 clowdcontrol/mindcontrol
```
