#!/bin/sh

node tests/build/tests/dojot-mock.js &

export DATA_BROKER_URL=http://localhost:80
export AUTH_URL=http://localhost:5002

./node_modules/.bin/dredd
