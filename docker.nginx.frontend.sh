#!/bin/sh

grep -rl __BACKEND_URL__  /srv | xargs -r sed -i -e "s|__BACKEND_URL__|$MFE_BACKEND_URL|g"
grep -rl __FRONTEND_URL__ /srv | xargs -r sed -i -e "s|__FRONTEND_URL__|$MFE_FRONTEND_URL|g"
