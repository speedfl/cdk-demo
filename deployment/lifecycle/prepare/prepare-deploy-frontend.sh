#!/bin/bash

####################################################################################
#
# This script is used to prepare frontend before deployment
#
#####################################################################################

source ./lifecycle/common.sh

checkRegionProvided "$1"

function buildProject() {

    REGION=$1
    
    stepHeader "Build Frontend project"
    echo "Switch to folder frontend"

    cd ../frontend

    npm run build-prod

    stepHeader "Copy bundle to deployment"
    echo "Switch to folder deployment"
    cd ../deployment
    rm -rf bundle/frontend
    mkdir -p bundle/frontend
    cp -r ../frontend/www/* bundle/frontend
    echo "Copy ok"
}

buildProject "$1"