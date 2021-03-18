#!/bin/bash

set -e

source ./lifecycle/common.sh

checkRegionProvided "$1"

./lifecycle/prepare/prepare-undeploy-frontend.sh "$1"

APP_NAME=$(getGlobalParam "appName")

cdk destroy $APP_NAME-$1