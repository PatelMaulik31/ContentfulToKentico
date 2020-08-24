const contentful = require('contentful');
var fs = require('fs');
const path = require('path');
var { readFileSync } = require('fs');
let request = require('request');

let cf_spaceid, cf_token, kentico_pid, kentico_appkey, proxy
async function migrate(obj) {
    try {
        if(obj == undefined || obj == null){
            return 'Empty Input'
        }
        if(obj.CONTENTFUL_SPACE_ID == undefined || obj.CONTENTFUL_SPACE_ID == null || obj.CONTENTFUL_SPACE_ID.trim() == ''){
            return 'Enter CONTENTFUL_SPACE_ID ';
        }
        if(obj.CONTENTFUL_TOKEN == undefined || obj.CONTENTFUL_TOKEN == null || obj.CONTENTFUL_TOKEN.trim() == ''){
            return 'Enter CONTENTFUL_TOKEN ';
        }
        if(obj.KENTICO_PROJECT_ID == undefined || obj.KENTICO_PROJECT_ID == null || obj.KENTICO_PROJECT_ID.trim() == ''){
            return 'Enter KENTICO_PROJECT_ID ';
        }
        if(obj.KENTICO_APP_KEY == undefined || obj.KENTICO_APP_KEY == null || obj.KENTICO_APP_KEY.trim() == ''){
            return 'Enter KENTICO_APP_KEY';
        }
        cf_spaceid = obj.CONTENTFUL_SPACE_ID;
        cf_token = obj.CONTENTFUL_TOKEN;
        kentico_pid = obj.KENTICO_PROJECT_ID;
        kentico_appkey = obj.KENTICO_APP_KEY;
        proxy = obj.PROXY;

        let cfconfig = {}
        cfconfig.space = cf_spaceid;
        cfconfig.accessToken = cf_token;
        if (!!proxy) {
            cfconfig.httpAgent = createProxyAgent(proxy);
            cfconfig.httpsAgent = createProxyAgent(proxy);
        }
        let cfclient = contentful.createClient(cfconfig);

        cfasset = await cfclient.getAssets();
        let array = cfasset.items;
        var contentArr = []
        for (var i = 0; i < array.length; i++) {
            let fields = array[i].fields;
            let obj = {
                title: fields.title,
                cfurl: fields.file.url,
                fileName: fields.file.fileName,
                contentType: fields.file.contentType
            }
            contentArr.push(obj)
        }
        if (contentArr.length > 0) {
            createMainLocalFolder();
            request = request.defaults({ 'proxy': proxy });
           let chkkentico = await checkKentico();
           if(chkkentico && chkkentico.status){
            let rs = await downloadAllFile(contentArr);
            return rs;
           }else{
               return chkkentico;
           }
           
        }

    } catch (err) {
        console.log('er',err);
        return err
    }
}

async function downloadAllFile(data) {
    try {
        return new Promise((resolve, reject) => {
            const fileDir = path.join(__dirname, './asset/');
            Promise.all(data.map(async (obj, index) => {
                if (obj.cfurl !== null && obj.cfurl !== undefined && obj.cfurl !== '') {
                    data[index].localpath = obj.fileName;;
                    let rs = await download('https:' + obj.cfurl, fileDir + obj.fileName)
                    if (data.length == index + 1) {
                        setTimeout(async function () {
                            //console.log('download completed');
                            let rs = await uploadKentikoAsset(data)
                            resolve(rs)
                        }, 3000)
                    }
                }
            })).then(async function () {
            })
        })

    } catch (e) {
        console.log(e)
    }
}

async function uploadKentikoAsset(data) {
    try {
        return new Promise(async (resolve, reject) => {
            for (let i = 0; i < data.length; i++) {
                let response = await uploadAsset(data[i], i);
                if (response.status) {
                    data[i].kenticourl = response.url;
                    data[i].status = true
                } else {
                    data[i].filesize = response.size;
                    data[i].status = false;
                    if(response.kenticoerr){
                        data[i].kenticoerr=response.kenticoerr;
                    }else{
                        data[i].errmsg = 'file size is greater then 100mb';
                    }
                }
            }
            var newArr = [];
            for(let a = 0; a <data.length; a++){
                let obj = {
                    contentfulUrl:data[a].cfurl,
                    kenticoUrl:data[a].kenticourl ? data[a].kenticourl : null,
                    status:data[a].status,
                    contentType:data[a].contentType
                }
                if(!!data[a].kenticoerr){
                    obj.kenticoErr = data[i].kenticoerr ? data[i].kenticoerr : null
                }
                if(!!data[a].errmsg){
                    obj.errmsg = data[i].errmsg ? data[i].errmsg : null
                }
                newArr.push(obj);
            }
            let output = {
                contentfulAssetCount: data.length,
                kenticoUploadedAssetCount: data.filter(x => x.status == true).length,
                mapping: newArr,
            }
            resolve(output);
        })
    } catch (err) {
        console.log(err)
    }
}

async function uploadAsset(assetObj, index) {
    try {
        const fileDir = path.join(__dirname, './asset/');
        return new Promise(async (resolve, reject) => {
            const data = readFileSync(fileDir + assetObj.localpath);
            if (data.byteLength < 104857600) {
                let url = `https://manage.kontent.ai/v2/projects/${kentico_pid}/files/${assetObj.fileName}`;
                var options = {
                    'method': 'POST',
                    'url': url,
                    'headers': {
                        'Content-length': data.byteLength,
                        'Content-type': assetObj.contentType,
                        'Content-Type': 'application/octet-stream',
                        'Authorization': 'Bearer ' + kentico_appkey,
                    },
                    body: data
                };
                if (!!proxy) {
                    options.proxy = proxy
                }
                request(options, function (error, response) {
                    if (error) {
                        console.log('err', error);
                        return
                    }
                    let res = JSON.parse(response.body);
                    if(res.id == undefined){
                        resolve({ status: false, kenticoerr:'Enter correct credential' })
                        return;
                    }
                    let url2 = `https://manage.kontent.ai/v2/projects/${kentico_pid}/assets/`;
                    var opt2 = {
                        'method': 'POST',
                        "uri": url2,
                        'headers': {
                            'Content-Type': 'application/octet-stream',
                            'Authorization': 'Bearer ' + kentico_appkey,
                            'Content-type': 'application/json',
                        },
                        'body': JSON.stringify({
                            'headers': {
                                'Content-type': assetObj.contentType,
                                'Content-Type': 'application/octet-stream',
                                'Authorization': 'Bearer ' + kentico_appkey,
                            },
                            "file_reference": {
                                "id": res.id,
                                "type": "internal"
                            },
                            "title": assetObj.fileName,
                            "external_id": assetObj.fileName + "_externalid" + new Date().getTime(),
                            "maximum_file_size": Infinity,
                            "allowed_file_types": "any",
                            "descriptions": [
                                {
                                    "language": {
                                        "codename": "en-US"
                                    },
                                    "description": assetObj.fileName
                                }
                            ]
                        })
                    }
                    if (!!proxy) {
                        opt2.proxy = proxy;
                    }
                    request(opt2, function (error, response) {
                        if (error) {
                            console.log('err', error);
                            return
                        }
                        let res = JSON.parse(response.body);
                        resolve({ status: true, url: res.url })
                    })
                });
            } else {
                resolve({ status: false, size: readableBytes(data.byteLength) })
            }
        })
    } catch (err) {
        resolve({ status: false,kenticoerr:err })
        console.log(err)
    }
}
function checkKentico() {
    try{
        return new Promise((resolve, reject) => {

            let url2 = `https://manage.kontent.ai/v2/projects/${kentico_pid}/assets/`;
            var opt2 = {
                'method': 'GET',
                "uri": url2,
                'headers': {
                    'Content-Type': 'application/octet-stream',
                    'Authorization': 'Bearer ' + kentico_appkey,
                    'Content-type': 'application/json',
                },
               
            }
            if (!!proxy) {
                opt2.proxy = proxy;
            }
            request(opt2, function (error, response) {
                if (error) {
                    console.log('err', error);
                    resolve({ status: false,err:error })
                    return
                }
                if(response.statusCode == 200){
                    resolve({ status: true })
                }else{
                    resolve({ status: false ,err:response.body})
                }
               
            })
        });
    }catch(err){
        console.log(err)
    }
}
function createMainLocalFolder() {
    let localFolderName = path.join(__dirname, './asset');
    var create = true;
    try {
        fs.mkdirSync(localFolderName);
        create = true;
    } catch (e) {
        if (e.code === "EEXIST") {
            create = false;
        } else {
            throw e;
        }
    }
    var obj = {};
    obj.create = create;
    obj.localFolderName = localFolderName;
    return obj;
}
function createProxyAgent(proxy) {
    const HttpsProxyAgent = require('https-proxy-agent');
    let proxyAgent = new HttpsProxyAgent(proxy);
    return proxyAgent;
};
function readableBytes(bytes) {
    var i = Math.floor(Math.log(bytes) / Math.log(1024)),
        sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    return (bytes / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + sizes[i];
}
async function download(uri, filename) {
    return new Promise((resolve, reject) => {

        request.head(uri, function (err, res, body) {
            request(uri).pipe(fs.createWriteStream(filename)).on('close', function () {
                resolve(true)
            })
        });
    });

};
module.exports = {
    migrate,
}