#!/bin/bash

# must be actively sourced, because docker-compose can’t do interpolation
source .env

export BACKEND_IMAGE=current-weather-backend:latest
export FRONTEND_IMAGE=current-weather-frontend:latest

docker build -f Dockerfile.backend -t $BACKEND_IMAGE .
docker build -f Dockerfile.frontend -t $FRONTEND_IMAGE .

docker-compose up --remove-orphans --force-recreate

