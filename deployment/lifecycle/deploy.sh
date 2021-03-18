#!/bin/bash

set -e

source ./lifecycle/common.sh

checkRegionProvided "$1"

./lifecycle/prepare/prepare-deploy-backend.sh "$1"
./lifecycle/prepare/prepare-deploy-frontend.sh "$1"

APP_NAME=$(getGlobalParam "appName")

cdk deploy $APP_NAME-$1