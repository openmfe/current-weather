#!/bin/bash

for varname in MFE_FRONTEND_PORT MFE_BACKEND_PORT MFE_BACKEND_URL MFE_FRONTEND_URL; do
    [ -z "${!varname}" ] && echo "Error: The environment variable $varname is not set." && exit 1
done

export BACKEND_IMAGE=current-weather-backend:latest
export FRONTEND_IMAGE=current-weather-frontend:latest

docker build -f Dockerfile.backend -t $BACKEND_IMAGE .
docker build -f Dockerfile.frontend -t $FRONTEND_IMAGE .

# passing all arguments to docker-compose
docker-compose up --remove-orphans --force-recreate $@

