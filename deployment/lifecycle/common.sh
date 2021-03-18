#!/bin/bash

function stepHeader() {
    echo "####################################################################"
    echo "#"
    echo "# $1"
    echo "#"
    echo "####################################################################"
}

# $1 the region
function checkRegionProvided() {
    if [ -z "$1" ]; then
        echo "Please specify at least one <region> or * (example france-test)"
        exit 1
    fi
}

# $1 the param
function getGlobalParam() {
    jq -r --arg key "$1" '.[$key]' config/global.json
}

# $1 is the region name
# $2 the param name
function getRegionParam() {
    jq -r --arg region "$1" --arg key "$2" '.[] | select(.id == $region)[$key]'  config/regions.json
}

# Get AWS from region name
# $1 is the region name
function getAWSRegion() {
   getRegionParam $1 'awsRegion' 
}