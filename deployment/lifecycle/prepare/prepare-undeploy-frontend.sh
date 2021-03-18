#!/bin/bash

####################################################################################
#
# This script is used to prepare frontend before undeployment.
# Bucket needs to be cleaned
#
#####################################################################################

set -e

source ./lifecycle/common.sh

checkRegionProvided "$1"

# Clean the website bucket otherwise the undeploy will fail
function cleanBucket() {
    APP_NAME=$(getGlobalParam "appName")
    stepHeader "Pre Frontend undeployment: Clean bucket $APP_NAME-website-$1"
    aws s3 rm --recursive s3://$APP_NAME-website-$1
}

cleanBucket $1