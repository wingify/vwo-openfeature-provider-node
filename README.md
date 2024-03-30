## VWO Openfeature Provider Node

[![npm version](https://badge.fury.io/js/vwo-openfeature-provider-node.svg)](https://www.npmjs.com/package/vwo-openfeature-provider-node)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)

### Requirements

- Node 10+

### Installation

```bash
# via npm
npm install vwo-openfeature-provider-node --save

# via yarn
yarn add vwo-openfeature-provider-node
```

### Example

```javascript
const OpenFeature = require('@openfeature/server-sdk').OpenFeature;
const VWOProvider = require('vwo-openfeature-provider-node').VWOProvider;
const vwo = require('vwo-node');

async function start() {
  const vwoClient = await vwo.init({
    sdkKey: '<enter-vwo-sdk-key-here>',
    accountId: '<vwo-account-id>',
    // If Using Web Service, enter URL
    webService: {
      url: 'localhost:8000',
    },
    // If using any storage connector
    // storage: storageConnector
  });
  const context = {
    user: {
      id: 'unique-user-id',
    },
  };

  const provider = new VWOProvider(vwoClient);
  OpenFeature.setProvider(provider);

  const newClient = OpenFeature.getClient();
  newClient.setContext(context);

  console.log(
    'BOOLEAN',
    await newClient.getBooleanValue(
      'unique-feature-key',
      false,
      Object.assign({}, context, { key: 'boolean_variable' }),
    ),
  ); //pass 'key' if you want to fetch value of a specific variable. Otherwise it will return feature on/off
  console.log(
    'STRING',
    await newClient.getStringValue('unique-feature-key', '', Object.assign({}, context, { key: 'string-variable' })),
  ); //will return undefined without key
  console.log(
    'NUMERIC',
    await newClient.getNumberValue('unique-feature-key', 10, Object.assign({}, context, { key: 'number-variable' })),
  ); //will return undefined without key
  console.log(
    'FLOAT',
    await newClient.getNumberValue('unique-feature-key', 10.0, Object.assign({}, context, { key: 'float-variable' })),
  ); //will return undefined without key
  console.log(
    'JSON',
    await newClient.getObjectValue('unique-feature-key', {}, Object.assign({}, context, { key: 'json-variable' })),
  ); //pass 'key' if you want to fetch value of a specific variable of type JSON. Otherwise it will return all the variables.
}

start();
```

### Scripts

1. Build - it will compile typescript and create minified version too
```
yarn run build
```

2. Compile - convert typescript into javascript
```
yarn run tsc
```

3. Prettier - beautify code
```
yarn run prettier
```

4. Uglify - minify javascript code after compilation
```
yarn run uglify
```

### Contributing

Please go through our [contributing guidelines](https://github.com/wingify/vwo-openfeature-provider-node/blob/master/CONTRIBUTING.md)

### Code of Conduct

[Code of Conduct](https://github.com/wingify/vwo-openfeature-provider-node/blob/master/CODE_OF_CONDUCT.md)

### License

[Apache License, Version 2.0](https://github.com/wingify/vwo-openfeature-provider-node/blob/master/LICENSE)

Copyright 2024 Wingify Software Pvt. Ltd.
