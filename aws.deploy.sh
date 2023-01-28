#!/bin/bash

set -e

dir=$(pwd)
export AWS_DEFAULT_REGION=eu-central-1
export STACK_NAME="${STACK_NAME:-current-weather}"

[ -z "$LAMBDA_BUCKET" ] && echo "Error: LAMBDA_BUCKET must be set." && exit 1


# prepare build env
[ -d $dir/build ] && rm -r $dir/build
mkdir -p $dir/build/frontend $dir/build/backend

# build backend
cd $dir/build/backend
cp -r $dir/backend/src/*.mjs $dir/backend/package* $dir/build/backend/
npm ci --omit=dev --omit=optional --no-bin-links --no-audit
zip -r lambda.zip lambda.mjs runtime.mjs prerender.mjs data.mjs package.json node_modules

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
    lambdaBucket=$LAMBDA_BUCKET \
    lambdaFile=$LAMBDA_FILE

# get Cloudformation outputs
cmd="aws cloudformation describe-stacks --stack-name $STACK_NAME --output text"
apiUrl=$($cmd --query 'Stacks[0].Outputs[?OutputKey==`apiGatewayUrl`].OutputValue')
cdnUrl="https://$($cmd --query 'Stacks[0].Outputs[?OutputKey==`cloudfrontDomainName`].OutputValue')"
cdnId=$($cmd --query 'Stacks[0].Outputs[?OutputKey==`cloudfrontDistributionId`].OutputValue')
bucketName=$($cmd --query 'Stacks[0].Outputs[?OutputKey==`bucketName`].OutputValue')

# build frontend
cp -r $dir/frontend/src $dir/frontend/l10n $dir/frontend/package* $dir/frontend/api $dir/frontend/rollup.config.js $dir/build/frontend/
cd $dir/build/frontend
npm ci --only=production --no-audit
MFE_BACKEND_URL=$apiUrl MFE_FRONTEND_URL=$cdnUrl npm run build

# deploy frontend
aws s3 sync $dir/build/frontend/dist s3://$bucketName/
aws cloudfront create-invalidation --distribution-id $cdnId --paths "/*"

echo "Done! MFE deployed at $cdnUrl/main.js"
