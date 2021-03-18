# cdk-demo Deployment

This contains the repository to use for deployment

## Deployment

### Prerquisite

#### Hosted zone

You need a domain and an hosted zone in AWS route 53 and add it in `global.json`.

#### Create key pairs for your destinated region

You need to create two key pairs for your region (if not already done). To do this go to ec2 console / key pair and create the two following keypairs and store them:

- `<appName>-<region.id>`: This will be used to connect in ssh to instances (directly or from the bastion host). Example `cdk-demo-france-test`
- `<appName>-bastion-<region.id>`:  This will be used to connect in ssh to instances. Example `cdk-demo-bastion-france-test`

#### jq

Install jq with 

```
$ sudo apt-get install jq
```

#### Bootsrap in the aws region

If you target to use an aws region that is not configured you need to bootsrap cloudformation

```bash
$ cdk bootstrap aws://<account>/<region> # ie: cdk bootstrap aws://000000000000/eu-west-2
```

#### Add the region in the config

You need then to add the desired region in `config/regions.json` with the following parameters:

- `id`: the name of the region
- `awsRegion`: the aws region on which to deployed (bootstrap must have been run)
- `domain`: the base domain to use. The following domain will be generated:
  - `www.$domain` and `$domain`: the www domain for frontend (ie: `www.test.my-app.com` and `test.my-app.com`)
  - `api.$domain`: the api domain for backend (ie: `api.test.my-app.com`)
- `geoRestrictions`: An array representing the GeoRestriction

Example:

```json
[
    ...
    {
        "id" : "france-test",
        "awsRegion" : "eu-west-2",
        "domain" : "test.my-app.com",
        "geoRestrictions": [ "FR" ]
    }
]
```

### Prepare stacks

To prepare stacks you need to build the package deployment:

```
$ npm run stack:prepare
```

## Stack

### Deploy stack

To deploy a stack simply run:

```bash
$ npm run stack:deploy <region_id> # example: npm run stack:deploy fr
```

### Undeploy stack

To undeploy a stack simply run:

```bash
$ npm run stack:undeploy <region_id> # example: npm run stack:undeploy fr
```

### Update stack

#### Frontend website update

To update frontend website run:

```bash
$ npm run update-site:frontend
```

#### Backend website update

To update backend website run:

```bash
$ npm run update-site:backend fr
```