#!/bin/bash

source ./lifecycle/common.sh

checkRegionProvided "$1"

# Deploy website to bucket
function deploySiteToBucket() {
    APP_NAME=$(getGlobalParam "appName")
    aws s3 sync bundle/frontend s3://$APP_NAME-website-$1
}

# invalidate cloudfront cache to get latest version
function invalidateCloudrontCache() {

    APP_NAME=$(getGlobalParam "appName")
    tags=$APP_NAME-Frontend-$1

    for arn in `aws cloudfront list-distributions --query 'DistributionList.Items[].ARN' --output=json | tr -d \" | tr -d \, | tr -d ' ' | tr -d \[ | tr -d \] | grep [0-9A-Z]`; do 
        echo "Analyse distribution $arn"
        foundTag=$(aws cloudfront list-tags-for-resource --resource $arn 2>&1 | grep $tags)

        if [ ! -z "$foundTag" ]; then
            foundDistrib=$(echo $arn | cut -d "/" -f 2)
            break
        fi
    done

    if [ -z "$foundDistrib" ]; then 
        echo "No Distribution found for tag $tags. Are you sure it exists ?"
        exit 1
    fi

    echo "Found Distribution: $foundDistrib. About to invalidate cache"

    aws cloudfront create-invalidation --distribution-id $foundDistrib --paths /
}

./lifecycle/prepare/prepare-deploy-frontend.sh $1

deploySiteToBucket $1
invalidateCloudrontCache $1