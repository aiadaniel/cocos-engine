/*
 Copyright (c) 2022-2023 Xiamen Yaji Software Co., Ltd.

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

import { EDITOR_NOT_IN_PREVIEW } from 'internal:constants';
import { System, macro, cclegacy, log } from '../../../core';
import { Atlas, DynamicAtlasTexture } from './atlas';
import { director, DirectorEvent } from '../../../game';
import { SpriteFrame } from '../../assets';
import { Filter } from '../../../gfx/base/define';
import { TextureBase } from '../../../asset/assets/texture-base';
import { Material, Texture2D } from '../../../asset/assets';
import { resources } from '../../../asset/asset-manager';
import dependUtil from '../../../asset/asset-manager/depend-util';
import { fastRemoveAt } from '../../../core/utils/array';

/**
 * @en The dynamic atlas manager which manages all runtime dynamic packed atlas texture for UI rendering.
 * It generates a maximum of [[maxAtlasCount]] atlas texture, all atlas texture have the size of [[textureSize]].
 * Normally the [[Root.batcher2D]] is in charge of submitting sprite frames to the dynamic atlas manager, the process is transparent to user.
 * Note that the first committed sprite frame will define the filter settings of the atlas textures,
 * only sprite frame with the same setting will be accepted afterward.
 * @zh 动态合图的管理器，管理所有运行时动态合成的图集，主要用于 UI 渲染。
 * 该管理器支持生成 [[maxAtlasCount]] 张动态合图，并且所有合图都有同样的 [[textureSize]] 像素尺寸。
 * 一般来说 [[Root.batcher2D]] 负责提交 [[SpriteFrame]] 到动态合图管理器中，这个过程对于开发者是透明的。
 * 需要注意的是，第一个提交的 [[SpriteFrame]] 会决定图集的过滤器参数，在此之后只有同样参数的贴图才会被管理器接受。
 */
export class DynamicAtlasManager extends System {
    public static instance: DynamicAtlasManager;

    private _atlases: Atlas[] = [];
    private _atlasIndex = -1;

    private _maxAtlasCount = 5;// todo lxm 2
    private _textureSize = 2048;
    private _maxFrameSize = 512;
    private _textureBleeding = false;// lxm true;

    private _enabled = false;

    // lxm add
    isInit = false;
    _resetIndex = 0;
    _unitMaterial: Material = null!;
    _multMaterial: Material = null!;
    _staticAtlas: Atlas|null = null;
    _materialList: Material[] = [];
    // end lxm

    constructor () {
        super();
    }

    /**
     * @en
     * Enable or disable the dynamic atlas.
     *
     * @zh
     * 开启或关闭动态图集。
     */
    get enabled (): boolean {
        return this._enabled;
    }
    // lxm delete
    // set enabled (value) {
    //     if (this._enabled === value) return;

    //     if (value) {
    //         this.reset();
    //         director.on(DirectorEvent.BEFORE_SCENE_LAUNCH, this.beforeSceneLoad, this);
    //     } else {
    //         this.reset();
    //         director.off(DirectorEvent.BEFORE_SCENE_LAUNCH, this.beforeSceneLoad, this);
    //     }

    //     this._enabled = value;
    // }

    /**
     * @en
     * The maximum number of atlases that can be created.
     *
     * @zh
     * 可以创建的最大图集数量。
     */
    get maxAtlasCount (): number {
        return this._maxAtlasCount;
    }
    set maxAtlasCount (value) {
        this._maxAtlasCount = value;
    }

    /**
     * @en
     * Get the current created atlas count.
     *
     * @zh
     * 获取当前已经创建的图集数量。
     */
    get atlasCount (): number {
        return this._atlases.length;
    }

    /**
     * @en
     * Whether to enable textureBleeding.
     *
     * @zh
     * 是否开启 textureBleeding。
     */
    get textureBleeding (): boolean {
        return this._textureBleeding;
    }
    set textureBleeding (enable) {
        this._textureBleeding = enable;
    }

    /**
     * @en
     * The size of the created atlas.
     *
     * @zh
     * 创建的图集的宽高。
     */
    get textureSize (): number {
        return this._textureSize;
    }
    set textureSize (value) {
        this._textureSize = value;
    }

    /**
     * @en
     * The maximum size of the picture that can be added to the atlas.
     *
     * @zh
     * 可以添加进图集的图片的最大尺寸。
     */
    get maxFrameSize (): number {
        return this._maxFrameSize;
    }
    set maxFrameSize (value) {
        this._maxFrameSize = value;
    }

    //======================================================================================lxm add
    public init (t = true): void {
        // todo lxm 原本使能 this.enabled = !macro.CLEANUP_IMAGE_CACHE;
        const self = this;
        // void 0 === t && (t = !0),//TNr: resources
        resources.load('Shader/unitMaterial', (err1, asset) => {
            self._unitMaterial = asset as Material;
            resources.load(
                'Shader/multMaterial',
                (err2, asset2) => {
                    self.isInit = true;
                    self._enabled = t;
                    self._materialList[0] = asset2 as Material;
                    self._multMaterial = self.createMaterial();
                },
            );
        });
    }
    setTexture (index: number, tex: TextureBase, n?: boolean): void {
        let r;
        n = undefined !== n && n;
        if (n || !this._unitMaterial[index]) {
            this._unitMaterial[index] = tex;
            tex[0] = this._unitMaterial;
            tex.atlasIndex = index;
            r = tex.getGFXTexture();
            if (index > 0) this._unitMaterial.setTexture(index, r);
            log(`setTexture ${index}, w=${tex.width}, h=${tex.height}`);
        }
    }
    createMaterial (): Material {
        const mat = new Material();
        mat.copy(this._materialList[0]);
        mat[8] = 0;
        this._materialList.push(mat);
        return mat;
    }
    packToMultMaterial (t: SpriteFrame): void {
        const _multMat = this._multMaterial;
        if (_multMat[8] === 8) {
            log('multMaterial is full');
            this.resetMultMaterial(this._multMaterial, true);
            this.packToMultMaterial(t);
            return;
        }
        const n = _multMat[8]++;
        _multMat[n] = t;
        t[0] = _multMat;
        t.atlasIndex = n;
        const tex = t.getGFXTexture();
        if (n > 0) _multMat.setTexture(n, tex);
        log(`packToMultMaterial ${n}, w=${t.width}, h=${t.height}`);
    }
    //======================================================================================end lxm

    private newAtlas (): Atlas | null {
        let atlas = this._atlases[++this._atlasIndex];
        if (!atlas && this._atlasIndex < this.maxAtlasCount) {
            atlas = new Atlas(this._textureSize, this._textureSize);
            this._atlases.push(atlas);
            this.setTexture(this._atlasIndex, atlas._texture);// lxm add
        }
        return atlas;
    }

    //======================================================================================lxm add
    newStaticAtlas (): Atlas {
        this._staticAtlas = new Atlas(this._textureSize, this._textureSize);
        this.setTexture(7, this._staticAtlas._texture, true);
        return this._staticAtlas;
    }
    //======================================================================================end lxm

    // lxm delete
    // private beforeSceneLoad (): void {
    //     this.reset();
    // }

    /**
     * @internal lxm
     */
    // public init (): void {
    //     this.enabled = !macro.CLEANUP_IMAGE_CACHE;
    // }

    /**
     * @en
     * Append a sprite frame into the dynamic atlas.
     *
     * @zh
     * 添加碎图进入动态图集。
     *
     * @method insertSpriteFrame
     * @param spriteFrame  the sprite frame that will be inserted in the atlas.
     */
    public insertSpriteFrame (spriteFrame: SpriteFrame): boolean {
        if (EDITOR_NOT_IN_PREVIEW) return false;// lxm 需要去掉吗
        // if (!this._enabled || this._atlasIndex >= this._maxAtlasCount
        //     || !spriteFrame || spriteFrame.original) return null;

        // if (!spriteFrame.packable) return null;

        // // hack for pixel game,should pack to different sampler atlas
        // const sampler = spriteFrame.texture.getSamplerInfo();
        // if (sampler.minFilter !== Filter.LINEAR || sampler.magFilter !== Filter.LINEAR || sampler.mipFilter !== Filter.NONE) {
        //     return null;
        // }

        // let atlas: Atlas | null = this._atlases[this._atlasIndex];
        // if (!atlas) {
        //     atlas = this.newAtlas();
        // }

        // const frame = atlas ? atlas.insertSpriteFrame(spriteFrame) : null;
        // if (!frame && this._atlasIndex < this._maxAtlasCount) {
        //     atlas = this.newAtlas();
        //     return atlas ? atlas.insertSpriteFrame(spriteFrame) : null;
        // }
        // return frame;

        for (let n = 0; n <= this._atlasIndex; ++n) {
            if (this._atlases[n].checkSpriteFrame(spriteFrame)) {
                return true;
            }
        }
        for (let r = 0; r <= this._atlasIndex; ++r) {
            if (this._atlases[r].insertSpriteFrame(spriteFrame)) {
                return true;
            }
        }
        const i: Atlas = this.newAtlas()!;
        return i.insertSpriteFrame(spriteFrame);
    }

    /**
     * @en
     * Reset all dynamic atlases, and all existing ones will be destroyed.
     *
     * @zh
     * 重置所有动态图集，已有的动态图集会被销毁。
     *
     * @method reset
    */
    public reset (): void {
        // for (let i = 0, l = this._atlases.length; i < l; i++) {
        //     this._atlases[i].destroy();
        // }
        // this._atlases.length = 0;
        // this._atlasIndex = -1;

        // lxm
        this.resetMultMaterial(this._unitMaterial);
        this.resetMultMaterial(this._multMaterial);
        if (this._staticAtlas != null) {
            this._staticAtlas.destroy();
        }
        this._staticAtlas = null;
        for (let i = 0; i < this._atlases.length; i++) {
            this._atlases[i].destroy();
        }
        this._atlases.length = 0;
        this._atlasIndex = -1;
        this._resetIndex = 0;
    }

    //======================================================================================lxm add
    resetMultMaterial (mat: Material, i?): void {
        if (mat) {
            for (let n = 0; n < 8; n++) {
                const r = mat[n];
                if (r) {
                    r.atlasIndex = -2;
                    r[0] = null;
                }
                (mat[n] = null);
            }
            if (!i) {
                mat.resetUniforms();
            }
            if (mat[8]) {
                mat[8] = 0;
            }
        }
    }
    //======================================================================================end lxm

    /**
     * @en
     * Delete a sprite from the atlas.
     *
     * @zh
     * 从动态图集中删除某张碎图。
     *
     * @method deleteAtlasSpriteFrame
     * @param spriteFrame  the sprite frame that will be removed from the atlas.
     */
    public deleteAtlasSpriteFrame (spriteFrame: SpriteFrame): void {
        if (!spriteFrame.original) return;

        let atlas: Atlas;
        for (let i = this._atlases.length - 1; i >= 0; i--) {
            atlas = this._atlases[i];
            atlas.removeSpriteFrame(spriteFrame);
        }
        const texture = spriteFrame.original._texture;
        this.deleteAtlasTexture(texture);
    }

    /**
     * @en
     * Delete a texture from the atlas.
     *
     * @zh
     * 从动态图集中删除某张纹理。
     *
     * @method deleteAtlasTexture
     * @param texture  the texture that will be removed from the atlas.
     */
    public deleteAtlasTexture (texture: TextureBase): void {
        if (texture) {
            for (let i = this._atlases.length - 1; i >= 0; i--) {
                this._atlases[i].deleteInnerTexture(texture as Texture2D);

                if (this._atlases[i].isEmpty()) {
                    this._atlases[i].destroy();
                    this._atlases.splice(i, 1);
                    this._atlasIndex--;
                }
            }
        }
    }

    /**
     * @en
     * Pack the sprite in the dynamic atlas and update the atlas information of the sprite frame.
     *
     * @zh
     * 将图片打入动态图集，并更新该图片的图集信息。
     *
     * @method packToDynamicAtlas
     * @param frame  the sprite frame that will be packed in the dynamic atlas.
     */
    // lxm 改变参数
    public packToDynamicAtlas (frame: SpriteFrame | null, i: boolean = false): void {
        if (EDITOR_NOT_IN_PREVIEW || !this._enabled) return;

        // lxm delete
        // if (frame && !frame.original && frame.packable && frame.texture && frame.texture.width > 0 && frame.texture.height > 0) {
        //     const packedFrame = this.insertSpriteFrame(frame);
        //     if (packedFrame) {
        //         frame._setDynamicAtlasFrame(packedFrame);
        //     }
        // }

        let n: Atlas;
        if (frame != null && frame.packable && !frame.original && this._enabled) {
            if (!this.insertSpriteFrame(frame)) {
                if (!i) {
                    log('DynamicAtlas full to reset');
                    this._atlases[this._resetIndex].destroy();
                    n = new Atlas(
                        this._textureSize,
                        this._textureSize,
                    );
                    this._atlases[this._resetIndex] = n;
                    this.setTexture(
                        this._resetIndex,
                        n._texture,
                        !0,
                    );
                    this._resetIndex = this.maxAtlasCount - this._resetIndex;
                    this.packToDynamicAtlas(frame);
                }
            }
        }
    }

    //======================================================================================lxm add
    packToStaticAtlas (t: SpriteFrame, i, n = false): boolean {
        if (this._enabled) {
            if (globalThis.wx) {
                if (i === -1) {
                    const r = t.texture;
                    if (!this._unitMaterial[7] && (r.width > t.originalSize.width || r.height > t.originalSize.height)) {
                        this.setTexture(7, r);
                    }
                }
            } else if (!t.original && t.packable) {
                if (!this._staticAtlas) {
                    this._staticAtlas = this.newStaticAtlas();
                }
                if (!this._staticAtlas.insertSpriteFrame(t) && !n) {
                    this._staticAtlas.destroy();
                    this.newStaticAtlas().insertSpriteFrame(t);
                    return false;
                }
            }
        }
        return !0;
    }

    CleanImage (t: Texture2D): void {
        let deps: string[];
        let index: number;
        const r = t.image;
        if (r) {
            deps = dependUtil.getDeps(t._uuid);
            index = deps.indexOf(r._uuid);
            if (index !== -1) {
                fastRemoveAt(deps, index);
                r.decRef(true);
            }
        }
    }
    //======================================================================================end lxm
}

/**
 * @en The singleton instance of [[DynamicAtlasManager]], please use [[DynamicAtlasManager.instance]] instead.
 * @zh [[DynamicAtlasManager]] 的单例对象，请直接使用 [[DynamicAtlasManager.instance]]。
 * @deprecated since v3.7
 */
export const dynamicAtlasManager: DynamicAtlasManager = DynamicAtlasManager.instance = new DynamicAtlasManager();

director.registerSystem('dynamicAtlasManager', dynamicAtlasManager, 0);

cclegacy.internal.dynamicAtlasManager = dynamicAtlasManager;
