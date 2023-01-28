#!/usr/bin/env bash

set -e
source .env.dev

cd backend
[ -d node_modules ] || npm i
npm run dev &

cd ../frontend
[ -d node_modules ] || npm i
npm run dev &

wait
