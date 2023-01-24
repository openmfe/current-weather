#!/bin/bash

# This file is just to demonstrate the process locally.
# Usually, you would not have such a file in your repo, but rather let Gitlab handle everything.
# See the README.md file for usage.

set -e

dir=$(pwd)
export TARGET_ENV="${TARGET_ENV:-nonprod}"
export STACK_NAME="${STACK_NAME:-osp-mfe-demo-hotel}"
export LAMBDA_BUCKET="${LAMBDA_BUCKET:-osp-te-lambda-deployments}"
export FRONTEND_BUCKET="$STACK_NAME-$TARGET_ENV"
export AWS_DEFAULT_REGION=eu-central-1

# prepare build env
[ -d $dir/build ] && rm -r $dir/build
mkdir -p $dir/build/frontend $dir/build/backend

# build backend
cd $dir/build/backend
cp -r $dir/backend/*.js $dir/backend/package* $dir/build/backend/
npm ci --only=production --no-bin-links --no-audit
zip -r lambda.zip index.js runtime.js prerender.js node_modules

cd $dir
export VERSION="$(date -r $dir/build/backend/lambda.zip +'%d%m%Y-%H%M%S')"
export LAMBDA_FILE=$STACK_NAME-$VERSION.zip
aws s3 cp $dir/build/backend/lambda.zip s3://$LAMBDA_BUCKET/$LAMBDA_FILE

# update the Cloudformation stack
aws cloudformation deploy \
  --stack-name=$STACK_NAME \
  --template-file=cloudformation.yml \
  --no-fail-on-empty-changeset \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    stackName=$STACK_NAME \
    frontendBucketName=$FRONTEND_BUCKET \
    lambdaBucket=$LAMBDA_BUCKET \
    lambdaFile=$LAMBDA_FILE \
    lambdaHandler=index.handler

# get Cloudformation outputs
cmd="aws cloudformation describe-stacks --stack-name $STACK_NAME --output text"
apiUrl=$($cmd --query 'Stacks[0].Outputs[?OutputKey==`lambdaUrl`].OutputValue')
cdnUrl="https://$($cmd --query 'Stacks[0].Outputs[?OutputKey==`cloudfrontDomainName`].OutputValue')"
cdnId=$($cmd --query 'Stacks[0].Outputs[?OutputKey==`cloudfrontDistributionId`].OutputValue')

# build frontend
cp -r $dir/frontend/src $dir/frontend/package* $dir/frontend/rollup.config.js $dir/build/frontend/
cd $dir/build/frontend
npm ci --only=production --no-audit
API=${apiUrl%/} CDN="$cdnUrl" npm run build

# deploy frontend
aws s3 sync $dir/build/frontend/dist s3://$FRONTEND_BUCKET/
aws cloudfront create-invalidation --distribution-id $cdnId --paths "/*"

echo "Done! MFE deployed at $cdnUrl/main.js"
