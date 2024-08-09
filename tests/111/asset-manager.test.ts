
import fse from "fs-extra";
import { assetManager, EffectAsset, instantiate, js, JsonAsset, Material, path, Prefab, settings, TextAsset } from "../../exports/base";
import Bundle, { resources } from "../../cocos/asset/asset-manager/bundle";
import { set } from "../../cocos/core/utils/js-typed";

// settings.init(base.path.join(UNPACKED, "src/"),)
// assetManager.init();

describe("111", function(){

    const UNPACKED = "E:/steamLibrary/steamapps/common/iles/resources/app.asar_unpack2024_07_29/web-res/web-mobile";
    const TARGET = "../temp/iles";
    
    // 1 find settings.*.json
    const srcdir = UNPACKED+"/src";
    // console.log("==>" + rootdir);
    const rootFiles = fse.readdirSync(srcdir, null);
    // console.log("==>" + rootFiles);
    const settingFile = rootFiles.filter((f)=>{return f.startsWith("settings.")});
    // base.assertIsTrue(configFile.length == 1);
    // console.log("==>config file:" + configFile);
    
    const contentJson = fse.readJSONSync(path.join(srcdir, settingFile[0]));
    console.log("==>Engine:" + contentJson["CocosEngine"]);
    console.log("==>Layers:" + JSON.stringify(contentJson.engine.customLayers));
    console.log("==>Macros:" + JSON.stringify(contentJson.engine.macros));
    console.log("==>Bundles:" + JSON.stringify(contentJson.assets.projectBundles));
    console.log("==>Plugins:" + JSON.stringify(contentJson.plugins));
    console.log("==>Launch:" + JSON.stringify(contentJson.launch));
    console.log("==>Screen:" + JSON.stringify(contentJson.screen));
    console.log("==>Physics:" + JSON.stringify(contentJson.physics));

    const allbundle = contentJson.assets.projectBundles;

    // settings.init(path.join(srcdir, settingFile[0]));
    settings._settings = contentJson;

    assetManager.init({
        server: "http://127.0.0.1:8000/",//contentJson.assets.server, localhost 本地host是::1
        bundleVers: contentJson.assets.bundleVers,
        remoteBundles: contentJson.assets.remoteBundles,
        downloadMaxConcurrency: 10
    });

    // jest.setTimeout(1000000);
    test("==", async (done)=>{
        console.log("11111 " + allbundle);
        function _onAllBundleLoaded() {
            // const bundle = assetManager.getBundle("main");
            resources.loadDir("", (err,assets)=>{
                console.log("[resources] has " + assets.length);
                done();
            });
        }
        let needCnt = allbundle.length - 1;
        allbundle.forEach(b => {
            if (b != "internal") {
                console.log("22222 " + b);
                // load bundle config
                assetManager.loadBundle(b, null, (err, bundle: Bundle)=>{
                    console.log("==deps:" + bundle.deps);
                    const allasset = bundle.config.assetInfos;
                    const allpaths = bundle.config.paths;
                    allpaths.forEach((iAddressableInfo, key)=>{
                        // console.log(key + " == " + JSON.stringify(iAddressableInfo));
                        /** example: 这个看不到资源类型，在IAddressableInfo[]每一项才有，如下面
                         * sound/sfx_gems == [{"uuid":"04cee040-2583-44d4-a2a1-3dfb6a280c35","path":"sound/sfx_gems","ver":"fa554","nativeVer":"070a7"}]
                         * 
                         * materials/mat_wind == [{"uuid":"f0f65b5e-bf75-49ed-b54c-1549fab6cd73","path":"materials/mat_wind","packs":[{"uuid":"08b31b380","packedUuids":["0734c8dc-64ae-4e07-909c-a16bd93cf3d6","96359886-91a0-47ae-8830-0eca097dd39e@3b089","a66c43af-fced-4471-b1fe-52034892084c","f0f65b5e-bf75-49ed-b54c-1549fab6cd73"],"ext":".json","ver":"625ed"}]}]
                         * 
                         * ui/uilevel == [{"uuid":"dfd0fd09-add7-4428-8b3f-0a4e35723a0d","path":"ui/uilevel","packs":[{"uuid":"0c5cf2f19","packedUuids":["24c419ea-63a8-4ea1-a9d0-7fc469489bbc@f9941","50ffdfb7-483c-4f23-a4f8-985831004eea@f9941","58c97eee-e1ce-4ee1-b71c-5fb82fb93960@f9941","7119fac9-6873-4380-b760-d87d0fd79165@f9941","764644a9-3ba2-4dae-b23a-1b36e5655149@f9941","db7e06d9-91ae-4241-9923-32ae9516c98f@f9941","dfd0fd09-add7-4428-8b3f-0a4e35723a0d","e0fe7418-f452-4e48-9073-5d0ce4b7e0f3@f9941"],"ext":".json","ver":"9e614"}]}]
                         * 
                         * 
                         * 
                         */
                        iAddressableInfo.forEach(ia=>{
                            // console.log(ia.path + " == " + (ia.ctor)); //这个会打印整个文件比如prefab.ts的内容  typeof ia.ctor是function
                            const c = js.getClassId(ia.ctor);
                            // console.log(key+"==" + c);
                            let t ;
                            switch (c) {
                                case undefined:
                                    console.log("todo undefined");
                                    break;
                                case "":
                                    console.log("todo empty");
                                    break;
                                case "function":
                                    console.log("todo function");
                                    break;
                                case "cc.Prefab":
                                    t = Prefab;
                                    break;
                                case "cc.Material":
                                    t = Material;
                                    break;
                                case "cc.JsonAsset":
                                    t = JsonAsset;
                                    break;
                                case "cc.EffectAsset":
                                    t = EffectAsset;
                                    break;
                                case "cc.TextAsset":
                                    t = TextAsset;
                                    break;
                                default:
                                    console.log("todo " + c);
                            }
                            // b.load(key, )
                        });
                        // b.load(key, (err,asset)=>{
                        //     console.log("load asset1:" + js.getClassId(asset));
                        // })
                    })
                    // allasset.forEach((iasset, key)=>{
                        // console.log(key + " == " + JSON.stringify(iasset));
                        /** 如
                         * b8549459-6e21-4ea0-a69c-c23213cfa0b1@078fa == {"uuid":"b8549459-6e21-4ea0-a69c-c23213cfa0b1@078fa","redirect":"resources","extension":".cconb"}
                         * 
                         * 00ca4315-c1a8-4c3a-a54b-8eeacef70c77 == {"uuid":"00ca4315-c1a8-4c3a-a54b-8eeacef70c77","url":"db://assets/test-effect/test-depth.scene","packs":[{"uuid":"0dd215022","packedUuids":["00ca4315-c1a8-4c3a-a54b-8eeacef70c77","1263d74c-8167-4928-91a6-4e2672411f47@801ec","351f14d8-6154-4fe9-955d-4444e5afdc75@0e1fa","8d0f5e54-a0d3-44db-8445-325c7f28346f@34525","d032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0","d032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0@40c10","d032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0@74afd","d032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0@7d38f","d032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0@8fd34","d032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0@bb97f","d032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0@e9a6d","d6ef37b6-b971-4c04-82e9-e27b7526eb31@6d65b"],"ext":".json","ver":"73c18"}]}
                         * 
                         * 0167dae2-b53c-4a07-b86f-b8f6b622e529 == {"uuid":"0167dae2-b53c-4a07-b86f-b8f6b622e529","url":"db://assets/scenes/scene-menu.scene","ver":"4c3fa"}
                         * 
                         * 0cd63d6e-14ba-4038-881d-4ad3aa664599@1a4c3 == {"uuid":"0cd63d6e-14ba-4038-881d-4ad3aa664599@1a4c3","packs":[{"uuid":"0f0003d93","packedUuids":["0cd63d6e-14ba-4038-881d-4ad3aa664599@1a4c3","4b1587f8-a85c-42bf-888c-e8c3e47cf31e","7fb5b4f4-407b-412a-84e6-41e4039bea31"],"ext":".json","ver":"f94ea"}],"nativeVer":"721cb"}
                         * 
                         * 01228964-487d-43ca-87f5-4e84b71ac535 == {"uuid":"01228964-487d-43ca-87f5-4e84b71ac535","redirect":"resources"}
                         * 
                         */

                        // b.load(key, (err, asset)=>{
                        //     console.log("load asset:" + typeof asset);
                        // });
                    // })

                    needCnt--;
                    console.log("-------------------needCnt=" + needCnt);
                    if (needCnt == 0) {
                        _onAllBundleLoaded();
                    }
                });//end loadbundle
            }//end if != internal
        });//end allbundle foreach

        

    })
})