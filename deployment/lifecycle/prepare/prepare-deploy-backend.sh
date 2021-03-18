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
    
    stepHeader "Build Backend project"
    echo "Switch to folder backend-js"

    cd ../backend

    npm run build

    stepHeader "Copy src to deployment"
    echo "Switch to folder deployment"
    cd ../deployment
    rm -rf bundle/backend
    mkdir -p bundle/backend
    cp -r ../backend/lib/* bundle/backend
    echo "Copy ok"
}

buildProject "$1"