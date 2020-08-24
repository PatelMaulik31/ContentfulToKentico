# ContentfulTokentico

Node.js package for Migrating Files/Folders from Contentful to Kentico

v1.0.3

## Installation

```
npm install contentfultokenticoassetmigrate --save
```


## Getting started

### 1. Usage



| Environment Variable   | Required? | Value                            |
| ---------------------- | --------- | -----------------------------------      |
| `PROXY`            | **No**   | It requires if you have proxy set up  |  
| `CONTENTFUL_SPACE_ID`            | **Yes**   | Contentful Space Id |             
| `CONTENTFUL_TOKEN`            | **Yes**   | Contentful Token |             
| `KENTICO_PROJECT_ID`            | **Yes**   | Kentico Project Id|          
| `KENTICO_APP_KEY`            | **Yes**   | Kentico App Key |     

### 3. Usage

***Method Name : migrate*** - Used to migrate data from Contentful to Kentico

```javascript
var migrateObj = require('contentfultokenticoassetmigrate');

let config = {
    CONTENTFUL_SPACE_ID :'Contentful Space Id',
    CONTENTFUL_TOKEN : 'Contentful Token',
    KENTICO_PROJECT_ID :'Kentico Project Id',
    KENTICO_APP_KEY :'Kentico App Key',
    PROXY:'Proxy Url if you required',
}
migrateObj.migrate(config).then((res) =>{
    console.log(res)
});


```

### 4. Usage Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

### 5. Usage Contributing
[MIT](https://choosealicense.com/licenses/mit/)