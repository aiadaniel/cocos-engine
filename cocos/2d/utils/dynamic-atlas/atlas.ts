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

import { PixelFormat } from '../../../asset/assets/asset-enum';
import { ImageAsset } from '../../../asset/assets/image-asset';
import { Texture2D } from '../../../asset/assets/texture-2d';
import { BufferTextureCopy } from '../../../gfx';
import { cclegacy, js, warnID } from '../../../core';
import { SpriteFrame } from '../../assets/sprite-frame';

const space = 2;

function drawTextureAt (texture: DynamicAtlasTexture, image: ImageAsset, x: number, y: number): void {
    texture.drawTextureAt(image, x, y);
}

export class Atlas {
    public declare _texture: DynamicAtlasTexture;// lxm public
    // private declare _width: number; // lxm delete
    // private declare _height: number;
    // private declare _x: number;
    // private declare _y: number;
    // private declare _nextY: number;
    private _innerTextureInfos: Record<string, {
            x: number,
            y: number,
            texture: Texture2D,
        }> = {};
    private _innerSpriteFrames: SpriteFrame[] = [];
    private _count: number = 0;
    // lxm add
    atlasPacker: AtlasPacker | null = null;

    constructor (width: number, height: number) {
        const texture = new DynamicAtlasTexture();
        texture.initWithSize(width, height);
        this._texture = texture;

        // this._width = width;
        // this._height = height;

        // this._x = space;
        // this._y = space;
        // this._nextY = space;

        this.atlasPacker = new AtlasPacker(width, height);// lxm add
        this._innerSpriteFrames = [];
        this._innerTextureInfos = {};
        this._count = 0;
    }

    //======================================================================================lxm add
    checkSpriteFrame (frame: SpriteFrame): boolean { //增加的方法
        const info = this._innerTextureInfos[frame.texture.getId()];
        if (info) {
            this._innerSpriteFrames.push(frame);
            frame._setDynamicAtlasFrame(
                {
                    x: frame.rect.x + info.x,
                    y: frame.rect.y + info.y,
                    texture: this._texture,
                },
            );
            return true;
        }
        return false;
    }
    //======================================================================================lxm end

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
    // public insertSpriteFrame (spriteFrame: SpriteFrame): {
    //     x: number;
    //     y: number;
    //     texture: DynamicAtlasTexture;
    // } | null {
    //     const rect = spriteFrame.rect;
    //     // Todo:No renderTexture
    //     const texture = spriteFrame.texture as Texture2D;
    //     const info = this._innerTextureInfos[texture.getId()];

    //     let sx = rect.x;
    //     let sy = rect.y;

    //     if (info) {
    //         sx += info.x;
    //         sy += info.y;
    //     } else {
    //         const width = texture.width;
    //         const height = texture.height;

    //         if ((this._x + width + space) > this._width) {
    //             this._x = space;
    //             this._y = this._nextY;
    //         }

    //         if ((this._y + height + space) > this._nextY) {
    //             this._nextY = this._y + height + space;
    //         }

    //         if (this._nextY > this._height) {
    //             return null;
    //         }

    //         const thisTexture = this._texture;
    //         const image = texture.image!;

    //         if (cclegacy.internal.dynamicAtlasManager.textureBleeding) {
    //             // Smaller frame is more likely to be affected by linear filter
    //             if (width <= 8 || height <= 8) {
    //                 drawTextureAt(thisTexture, image, this._x - 1, this._y - 1);
    //                 drawTextureAt(thisTexture, image, this._x - 1, this._y + 1);
    //                 drawTextureAt(thisTexture, image, this._x + 1, this._y - 1);
    //                 drawTextureAt(thisTexture, image, this._x + 1, this._y + 1);
    //             }

    //             drawTextureAt(thisTexture, image, this._x - 1, this._y);
    //             drawTextureAt(thisTexture, image, this._x + 1, this._y);
    //             drawTextureAt(thisTexture, image, this._x, this._y - 1);
    //             drawTextureAt(thisTexture, image, this._x, this._y + 1);
    //         }

    //         drawTextureAt(thisTexture, image, this._x, this._y);

    //         this._innerTextureInfos[texture.getId()] = {
    //             x: this._x,
    //             y: this._y,
    //             texture,
    //         };

    //         this._count++;

    //         sx += this._x;
    //         sy += this._y;

    //         this._x += width + space;
    //     }

    //     const frame = {
    //         x: sx,
    //         y: sy,
    //         texture: this._texture,
    //     };

    //     this._innerSpriteFrames.push(spriteFrame);

    //     return frame;
    // }

    public insertSpriteFrame (spriteFrame: SpriteFrame): boolean {
        const texture = spriteFrame.texture as Texture2D;
        const width = texture.width;
        const height = texture.height;

        // 尝试在图集中找到合适的位置
        const position = this.atlasPacker!.Merge(width, height);
        if (!position) {
            return false;
        }

        // 记录绘制时间
        // TGr.Instance.recordTime('drawTextureAt');

        // 将纹理绘制到图集中
        this._texture.drawTextureAt(texture.image!, position.x, position.y);

        // 打印绘制时间
        // TGr.Instance.printTime('drawTextureAt');

        // 保存纹理信息
        this._innerTextureInfos[texture.getId()] = {
            x: position.x,
            y: position.y,
            texture,
        };

        // 更新计数和帧列表
        this._count++;
        this._innerSpriteFrames.push(spriteFrame);

        // 设置精灵帧的动态图集信息
        spriteFrame._setDynamicAtlasFrame({
            x: spriteFrame.rect.x + position.x,
            y: spriteFrame.rect.y + position.y,
            texture: this._texture,
        });

        return true;
    }

    public removeSpriteFrame (spriteFrame: SpriteFrame): void {
        js.array.fastRemove(this._innerSpriteFrames, spriteFrame);
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
    public deleteInnerTexture (texture: Texture2D): void {
        if (texture && this._innerTextureInfos[texture.getId()]) {
            delete this._innerTextureInfos[texture.getId()];
            this._count--;
        }
    }

    /**
     * @en
     * Whether the atlas is empty.
     *
     * @zh
     * 图集是否为空图集。
     *
     * @method isEmpty
     */
    public isEmpty (): boolean {
        return this._count <= 0;
    }

    /**
     * @en
     * Reset the dynamic atlas.
     *
     * @zh
     * 重置该动态图集。
     *
     * @method reset
    */
    public reset (): void {
        this.atlasPacker?.reset();// lxm add

        // this._x = space;
        // this._y = space;
        // this._nextY = space;

        const frames = this._innerSpriteFrames;
        for (let i = 0, l = frames.length; i < l; i++) {
            const frame = frames[i];
            if (!frame.isValid) {
                continue;
            }
            frame._resetDynamicAtlasFrame();
        }
        this._innerSpriteFrames.length = 0;
        this._innerTextureInfos = {};
        this._count = 0;// lxm add
    }

    /**
     * @en
     * Reset the dynamic atlas, and destroy the texture of the atlas.
     *
     * @zh
     * 重置该动态图集，并销毁该图集的纹理。
     *
     * @method destroy
    */
    public destroy (): void {
        this.reset();
        this._texture.destroy();
    }
}

export class DynamicAtlasTexture extends Texture2D {
    /**
     * @en
     * Initialize the render texture.
     *
     * @zh
     * 初始化 render texture。
     *
     * @method initWithSize
     */
    public initWithSize (width: number, height: number, format: number = PixelFormat.RGBA8888): void {
        this.reset({
            width,
            height,
            format,
        });
    }

    /**
     * @en
     * Draw a texture to the specified position.
     *
     * @zh
     * 将指定的图片渲染到指定的位置上。
     *
     * @method drawTextureAt
     * @param {Texture2D} image
     * @param {Number} x
     * @param {Number} y
     */
    public drawTextureAt (image: ImageAsset, x: number, y: number): void {
        const gfxTexture = this.getGFXTexture();
        if (!image || !gfxTexture) {
            return;
        }

        const gfxDevice = this._getGFXDevice();
        if (!gfxDevice) {
            warnID(16363);
            return;
        }

        const region = new BufferTextureCopy();
        region.texOffset.x = x;
        region.texOffset.y = y;
        region.texExtent.width = image.width;
        region.texExtent.height = image.height;
        gfxDevice.copyTexImagesToTexture([image.data as HTMLCanvasElement], gfxTexture, [region]);
    }
}

//======================================================================================lxm add

class PackItem {
    x = 0;
    y = 0;
    w = 0;
    h = 0;
    nx = 0;
    ny = 0;
    area = 0;
    next: PackItem = null!;

    resetA (t: PackItem): PackItem {
        this.x += this.nx;
        this.w -= this.nx;
        this.h = this.ny;
        this.nx = 0;
        this.ny = 0;
        this.next = t;
        this.area = this.w * this.h;
        return this;
    }
    resetB (t: PackItem): PackItem {
        this.y += this.ny;
        this.w = this.nx;
        this.h -= this.ny;
        this.nx = 0;
        this.ny = 0;
        this.next = t;
        this.area = this.w * this.h;
        return this;
    }
    merge (width: number, height: number, requiredArea: number): {x: number, y: number} | null {
        // 检查当前区域是否足够大
        if (this.area >= requiredArea) {
            // 处理未分割的区域
            if (this.nx === 0) {
                // 检查是否能容纳新纹理（包括2像素间隔）
                if (this.w >= width + 2 && this.h >= height + 2) {
                    const position = {
                        x: this.x,
                        y: this.y,
                    };
                    if (this.w - width - 2 < 12) { // 处理剩余空间过小的情况（小于12像素）
                        // 垂直分割剩余空间
                        this.y = this.y + height + 2;
                        this.h = this.h - height - 2;
                        this.area = this.w * this.h;// 更新剩余面积
                    } else if (this.h - height - 2 < 12) {
                        // 水平分割剩余空间
                        this.x = this.x + width + 2;
                        this.w = this.w - width - 2;
                        this.area = this.w * this.h;// 更新剩余面积
                    } else {
                        // 同时进行水平和垂直分割
                        this.nx = width + 2;
                        this.ny = height + 2;
                        this.area = Math.max(
                            this.w * (this.h - this.ny),
                            (this.w - this.nx) * this.h,
                        );// 更新剩余面积
                    }
                    return position;
                } else {
                    // 处理已分割区域的合并
                    if (this.ny >= this.nx && height + 2 <= Math.max(this.h - this.ny, this.ny)) {
                        return this.resetA(
                            AtlasPacker.createItem(
                                this.x,
                                this.y + this.ny,
                                this.w,
                                this.h - this.ny,
                                this.next,
                            ),
                        ).merge(width, height, requiredArea);
                    }
                    if (width + 2 <= Math.max(this.w - this.nx, this.nx)) {
                        return this.resetB(
                            AtlasPacker.createItem(
                                this.x + this.nx,
                                this.y,
                                this.w - this.nx,
                                this.h,
                                this.next,
                            ),
                        ).merge(width, height, requiredArea);
                    }
                }
            }
            // 处理链表中的下一个节点
            let e;
            if (this.next) {
                // // 清理过小的节点 如果下一个节点的宽度或高度小于12，则删除该节点
                if (this.next.w < 12 || this.next.h < 12) {
                    this.next = AtlasPacker.deleteItem(this.next);
                } else { // 否则检查是否需要交换节点顺序（按面积排序）
                    e = this.next.next;
                    if (e && e.area < this.next.area) {
                        this.next.next = e.next;
                        e.next = this.next;
                        this.next = e;
                    }
                }
            }
            // 递归处理下一个节点
            if (this.next) this.next.merge(width, height, requiredArea);
        }
        return null;
    }
}

let _packItemPool: PackItem[] = [];
let _poolIdx = 0;
export class AtlasPacker {
    _width = null;
    _height = null;
    _mergeItem: PackItem = null!;
    _area = 0;

    constructor (width, height) {
        this._width = width;
        this._height = height;
        this.reset();
    }

    reset (): void {
        this._area = this._width! * this._height!;
        for (let i = this._mergeItem; i;) i = AtlasPacker.deleteItem(i);
        this._mergeItem = AtlasPacker.createItem(0, 0, this._width, this._height, null);
    }
    Merge (width: number, height: number): {x: number, y: number} | null {
        // 计算需要占用的区域面积（包括2像素的间隔）
        const requiredArea = (2 + width) * (2 + height);
        // 检查是否有足够的空间
        if (requiredArea > this._area) {
            return null;
        }
        // 尝试合并到图集中
        const result = this._mergeItem.merge(width, height, requiredArea);
        // 如果合并成功，更新剩余可用面积
        if (result) {
            this._area -= requiredArea;
        }
        return result;
    }
    static deleteItem (item: PackItem): PackItem {
        // 重置节点属性
        item.nx = 0;
        item.ny = 0;
        item.area = 0;
        // 检查是否需要扩展数组
        if (_packItemPool.length === _poolIdx) {
            // 扩展数组大小（默认增加350个位置）
            const newSize = _poolIdx + 350;
            const newArray = new Array(newSize);
            // 复制原有元素
            for (let i = 0; i < _poolIdx; i++) {
                newArray[i] = _packItemPool[i];
            }
            _packItemPool = newArray;
        }
        // 将节点放入回收池
        _packItemPool[_poolIdx++] = item;
        return item.next;
    }
    static createItem (t, i, n, r, s): PackItem {
        const item = _poolIdx > 0 ? _packItemPool[--_poolIdx] : new PackItem();
        item.x = t;
        item.y = i;
        item.w = n;
        item.h = r;
        item.next = s;
        item.area = n * r;
        return item;
    }
}
