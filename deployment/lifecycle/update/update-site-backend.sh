#!/bin/bash

source ./lifecycle/common.sh

checkRegionProvided "$1"

# Deploy website to bucket
# Region
function deploySiteToFunction() {
    cd bundle/functions/
    APP_NAME=$(getGlobalParam "appName")
    aws lambda update-function-code --function-name $APP_NAME-$1-options-http --zip-file fileb://function.zip
    aws lambda update-function-code --function-name $APP_NAME-$1-create --zip-file fileb://function.zip
    aws lambda update-function-code --function-name $APP_NAME-$1-list --zip-file fileb://function.zip
    aws lambda update-function-code --function-name $APP_NAME-$1-get-one --zip-file fileb://function.zip
    aws lambda update-function-code --function-name $APP_NAME-$1-delete-one --zip-file fileb://function.zip
}

function zipFunctions() {
    APP_NAME=$(getGlobalParam "appName")
    rm -rf bundle/functions
    mkdir -p bundle/functions
    zip -r bundle/functions/function.zip bundle/backend/
}

./lifecycle/prepare/prepare-deploy-backend.sh $1

zipFunctions

deploySiteToFunction $1