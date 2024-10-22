/*
 Copyright (c) 2013-2016 Chukong Technologies Inc.
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import { ccclass, type, serializable } from 'cc.decorator';
import { Asset } from '../asset/assets/asset';
import { ByteBuf, CCString, Size } from '../core';
import { SpriteFrame } from '../2d/assets';
import { BufferAsset, TextAsset } from '../asset/assets';
import { bmap } from './BTile';

/**
 * @en
 * Class for tiled map asset handling.
 * @zh
 * 用于获取 tiled map 资源类
 * @class TiledMapAsset
 * @extends Asset
 *
 */
@ccclass('cc.TiledMapAsset')
export class TiledMapAsset extends Asset {

    _bm: bmap.BMap|null = null;

    // @serializable
    // tmxXmlStr = '';
    // @type(BufferAsset)
    _data: Uint8Array|null = null;

    @serializable
    @type([BufferAsset])
    tsxFiles: BufferAsset[] = [];

    @serializable
    @type([CCString])
    tsxFileNames: string[] = [];

    /**
     * @en
     * SpriteFrame array
     * @zh
     * SpriteFrame 数组
     */
    // @serializable
    // @type([SpriteFrame])
    // spriteFrames: SpriteFrame[] = [];

    /**
     * @en
     * ImageLayerSpriteFrame array
     * @zh
     * ImageLayerSpriteFrame 数组
     * @property {SpriteFrame[]} imageLayerSpriteFrame
     */
    // @serializable
    // @type([SpriteFrame])
    // imageLayerSpriteFrame: SpriteFrame[] = []

    /**
     * @en
     * Name of each object in imageLayerSpriteFrame
     * @zh
     * 每个 imageLayerSpriteFrame 名称
     * @property {String[]} imageLayerTextureNames
     */
    @serializable
    @type([CCString])
    imageLayerSpriteFrameNames: string[] = [];

    /**
     * @en
     * Name of each object in spriteFrames
     * @zh
     * 每个 SpriteFrame 名称
     * @property {String[]} spriteFrameNames
     */
    @serializable
    @type([CCString])
    spriteFrameNames: string[] = [];

    /**
     * @en
     * Size of each object in spriteFrames
     * @zh
     * 每个 SpriteFrame 的大小
     * @property {Size[]} spriteFrameSizes
     */
    @serializable
    @type([Size])
    spriteFrameSizes: Size[] = [];

    /**
     * editor-》assetManager.loadAny-》factory.create ?
     */
    get _nativeAsset (): ArrayBuffer {
        console.log("22222 " + this._data);
        return this._data!.buffer;
    }
    set _nativeAsset (value: ArrayBuffer) {
        console.log("11111 " + value);


        this._loadNativeData(value);
    }

    _loadNativeData (value: ArrayBuffer) {
        if (this._data && this._data.byteLength === value.byteLength) {
            this._data.set(new Uint8Array(value));
        } else {
            this._data = new Uint8Array(value);
        }
        const bb = new ByteBuf(this._data);
        this._bm = new bmap.BMap(bb);
        return true;
    }
}
