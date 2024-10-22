/*
 Copyright (c) 2020-2023 Xiamen Yaji Software Co., Ltd.

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


import { ccclass, displayOrder, executeInEditMode, help, menu, requireComponent, type, serializable, editable, string } from 'cc.decorator';
import { EDITOR, JSB } from 'internal:constants';
import { Component } from '../scene-graph/component';
import { UITransform } from '../2d/framework';
import { GID, PropertiesInfo, Property, TiledAnimationType, TiledGrid, TiledTextureGrids, TileFlag,
    TMXImageLayerInfo, TMXLayerInfo, TMXObjectGroupInfo, TMXObjectType, TMXTilesetInfo } from './xtiled-types';
import { TMXMapInfo } from './xtmx-xml-parser';
import { TiledLayer } from './xtiled-layer';
import { TiledObjectGroup } from './xtiled-object-group';
import { TiledMapAsset } from './tiled-map-asset';
import { fillTextureGrids } from './xtiled-utils';
import { Size, Vec2, logID, Color, sys, isValid, Rect } from '../core';
import { SpriteFrame } from '../2d/assets';
import { NodeEventType } from '../scene-graph/node-event';
import { Node } from '../scene-graph';
import { bmap } from './BTile';
import { BufferAsset } from '../asset/assets';
import { assetManager } from '../asset/asset-manager';

interface ImageExtendedNode extends Node {
    layerInfo: TMXImageLayerInfo;
    _offset: Vec2;
}

/**
 * @en Renders a TMX Tile Map in the scene.
 * @zh 在场景中渲染一个 tmx 格式的 Tile Map。
 * @class TiledMap
 * @extends Component
 */
@ccclass('cc.TiledMap')
@help('i18n:cc.TiledMap')
@menu('TiledMap/TiledMap')
@requireComponent(UITransform)
@executeInEditMode
export class TiledMap extends Component {
    // store all layer gid corresponding texture info, index is gid, format likes '[gid0]=tex-info,[gid1]=tex-info, ...'
    _texGrids: TiledTextureGrids = new Map();
    // store all tileset texture, index is tileset index, format likes '[0]=texture0, [1]=texture1, ...'
    // _textures: SpriteFrame[] = [];
    _tilesets: TMXTilesetInfo[] = [];

    // _animations: TiledAnimationType = new Map();
    // _imageLayers: TMXImageLayerInfo[] = [];
    _layers: TiledLayer[] = [];

    _layerMap;
    // _groups: TiledObjectGroup[] = [];
    // _images: ImageExtendedNode[] = [];
    _properties: PropertiesInfo = {} as any;
    _tileProperties: Map<GID, PropertiesInfo> = new Map();

    _mapInfo: TMXMapInfo | null = null;
    _mapSize: Size = new Size(0, 0);
    _tileSize: Size = new Size(0, 0);

    // 图集支持跨图复用 filename,ts
    // static readonly tss: Map<string, bmap.TileSet> = new Map();

    _mapOrientation = bmap.Orientation.Orthogonal;

    // 我们以offset.x+offset.y为key来存储复用结果 计算culling时使用
    // _sharedCullingRect: Map<number, {
    //     cullingDirty: boolean;
    //     leftDown: {
    //         row: number;
    //         col: number;
    //     };
    //     rightTop: {
    //         row: number;
    //         col: number;
    //     };
    // } > = new Map();

    static Orientation = bmap.Orientation;
    static Property = Property;
    static TileFlag = TileFlag;
    static StaggerAxis = bmap.StaggerAxis;
    static StaggerIndex = bmap.StaggerIndex;
    static TMXObjectType = TMXObjectType;
    static RenderOrder = bmap.RenderOrder;
    
    // _bMap: bmap.BMap | undefined;

    private _isApplied = false;

    
    @serializable
    _tmxFile: TiledMapAsset | null = null;
    
    /**
     * @en The TiledMap Asset.
     * @zh TiledMap 资源。
     * @property {TiledMapAsset} tmxAsset
     * @default ""
     */
    @type(TiledMapAsset)
    @displayOrder(7)
    get tmxAsset (): TiledMapAsset {
        return this._tmxFile!;
    }

    set tmxAsset (value: TiledMapAsset) {
        if (this._tmxFile !== value || EDITOR) {
            this._tmxFile = value;
            this._applyFile();
            this._isApplied = true;
        }
    }

    // @serializable
    // _btile: BufferAsset | null = null;
    // @type(BufferAsset)
    // @displayOrder(7)
    // get btileAsset (): BufferAsset {
    //     return this._btile!;
    // }

    // set btileAsset (value: BufferAsset) {
    //     if (this._btile !== value || EDITOR) {
    //         this._btile = value;
    //         this._applyFile();
    //         this._isApplied = true;
    //     }
    // }

    // @type([SpriteFrame])
    // sfs: SpriteFrame[] = []

    // @serializable
    // @displayOrder(8)
    // ab: string="resources";
    // get ab(): string { return this._ab; }
    // set ab(v) { this._ab = v; }

    // @serializable
    // @displayOrder(9)
    // tsxPath: string="";

    // @type([BufferAsset])
    // tsxs: BufferAsset[] = [];

    // _tsxMap: Map<string, BufferAsset> = new Map();

    // _atlasMap: Map<string, SpriteAtlas> = new Map();

    // 使用指定图集（实测使用自动图集时，preload时还是空的）
    // @type([SpriteAtlas])
    // atlass: SpriteAtlas[] = [];

    /**
     * @en
     * Whether or not enabled tiled map auto culling. If you set the TiledMap skew or rotation, then need to manually
     *  disable this, otherwise, the rendering will be wrong.
     * @zh
     * 是否开启瓦片地图的自动裁减功能。瓦片地图如果设置了 skew, rotation 或者采用了摄像机的话，需要手动关闭，否则渲染会出错。
     */

    @serializable
    protected _enableCulling = true;
    @editable
    get enableCulling (): boolean {
        return this._enableCulling;
    }
    set enableCulling (value) {
        this._enableCulling = value;
        const layers = this._layers;
        for (let i = 0; i < layers.length; ++i) {
            layers[i].enableCulling = value;
        }
    }

    @serializable
    protected cleanupImageCache = true;

    _gameCameraView;
    ratio = 0;
    _isUpdateCulling = !1;

    /**
     * @en Gets the map size.
     * @zh 获取地图大小。
     * @method getMapSize
     * @return {Size}
     * @example
     * let mapSize = tiledMap.getMapSize();
     * cc.log("Map Size: " + mapSize);
     */
    getMapSize (): Size {
        return this._mapSize;
    }

    /**
     * @en Gets the tile size.
     * @zh 获取地图背景中 tile 元素的大小。
     * @method getTileSize
     * @return {Size}
     * @example
     * let tileSize = tiledMap.getTileSize();
     * cc.log("Tile Size: " + tileSize);
     */
    getTileSize (): Size {
        return this._tileSize;
    }

    /**
     * @en map orientation.
     * @zh 获取地图方向。
     * @method getMapOrientation
     * @return {Number}
     * @example
     * let mapOrientation = tiledMap.getMapOrientation();
     * cc.log("Map Orientation: " + mapOrientation);
     */
    getMapOrientation (): bmap.Orientation {
        return this._mapOrientation;
    }

    /**
     * @en object groups.
     * @zh 获取所有的对象层。
     * @method getObjectGroups
     * @return {TiledObjectGroup[]}
     * @example
     * let objGroups = titledMap.getObjectGroups();
     * for (let i = 0; i < objGroups.length; ++i) {
     *     cc.log("obj: " + objGroups[i]);
     * }
     */
    // getObjectGroups (): TiledObjectGroup[] {
    //     return this._groups;
    // }

    /**
     * @en Return the TMXObjectGroup for the specific group.
     * @zh 获取指定的 TMXObjectGroup。
     * @method getObjectGroup
     * @param {String} groupName
     * @return {TiledObjectGroup}
     * @example
     * let group = titledMap.getObjectGroup("Players");
     * cc.log("ObjectGroup: " + group);
     */
    // getObjectGroup (groupName: string): TiledObjectGroup | null {
    //     const groups = this._groups;
    //     for (let i = 0, l = groups.length; i < l; i++) {
    //         const group = groups[i];
    //         if (group && group.getGroupName() === groupName) {
    //             return group;
    //         }
    //     }

    //     return null;
    // }

    /**
     * @en Gets the map properties.
     * @zh 获取地图的属性。
     * @method getProperties
     * @return {Object[]}
     * @example
     * let properties = titledMap.getProperties();
     * for (let i = 0; i < properties.length; ++i) {
     *     cc.log("Properties: " + properties[i]);
     * }
     */
    getProperties (): PropertiesInfo {
        return this._properties;
    }

    /**
     * @en Return All layers array.
     * @zh 返回包含所有 layer 的数组。
     * @method getLayers
     * @returns {TiledLayer[]}
     * @example
     * let layers = titledMap.getLayers();
     * for (let i = 0; i < layers.length; ++i) {
     *     cc.log("Layers: " + layers[i]);
     * }
     */
    getLayers (): TiledLayer[] {
        return this._layers;
    }

    /**
     * @en return the cc.TiledLayer for the specific layer.
     * @zh 获取指定名称的 layer。
     * @method getLayer
     * @param {String} layerName
     * @return {TiledLayer}
     * @example
     * let layer = titledMap.getLayer("Player");
     * cc.log(layer);
     */
    getLayer (layerName): TiledLayer | null {
        // const layers = this._layers;
        // for (let i = 0, l = layers.length; i < l; i++) {
        //     const layer = layers[i];
        //     if (layer && layer.getLayerName() === layerName) {
        //         return layer;
        //     }
        // }
        // return null;
        return this._layerMap[layerName];
    }

    // protected _changeLayer (layerName, replaceLayer): void {
    //     const layers = this._layers;
    //     for (let i = 0, l = layers.length; i < l; i++) {
    //         const layer = layers[i];
    //         if (layer && layer.getLayerName() === layerName) {
    //             layers[i] = replaceLayer;
    //             return;
    //         }
    //     }
    // }

    /**
     * @en Return the value for the specific property name.
     * @zh 通过属性名称，获取指定的属性。
     * @method getProperty
     * @param {String} propertyName
     * @return {String}
     * @example
     * let property = titledMap.getProperty("info");
     * cc.log("Property: " + property);
     */
    getProperty (propertyName: string): string | number {
        return this._properties[propertyName.toString()];
    }

    /**
     * @en Return properties dictionary for tile GID.
     * @zh 通过 GID ，获取指定的属性。
     * @method getPropertiesForGID
     * @param {Number} GID
     * @return {Object}
     * @example
     * let properties = titledMap.getPropertiesForGID(GID);
     * cc.log("Properties: " + properties);
     */
    getPropertiesForGID (gid: GID): PropertiesInfo | undefined {
        return this._tileProperties.get(gid);
    }

    __preload (): void {
        console.log("__preload xtilemap");
        if (!this._tmxFile) {
            return;
        }
        if (this._isApplied === false) {
            this._applyFile();
            this._isApplied = true;
        }
    }

    onEnable (): void {
        this.node.on(NodeEventType.ANCHOR_CHANGED, this._syncAnchorPoint, this);
        this.node.parent?.on( NodeEventType.TRANSFORM_CHANGED, this.updateCulling, this );
    }

    onDisable (): void {
        this.node.off(NodeEventType.ANCHOR_CHANGED, this._syncAnchorPoint, this);
        this.node.parent?.off( NodeEventType.TRANSFORM_CHANGED, this.updateCulling, this )
    }

    _applyFile (): void {
        // const spriteFrames: SpriteFrame[] = [];
        // const spriteFramesCache = {};

        // const file = this._tmxFile;

        // if (file) {
        //     // let texValues = file.textures;
        //     let spfNames: string[] = file.spriteFrameNames;
        //     const spfSizes: Size[] = file.spriteFrameSizes;
        //     const fSpriteFrames: SpriteFrame[] = file.spriteFrames;
        //     const spfTexturesMap: { [key: string]: SpriteFrame } = {};
        //     const spfTextureSizeMap: { [key: string]: Size } = {};

        //     for (let i = 0; i < spfNames.length; ++i) {
        //         const texName = spfNames[i];
        //         // console.log("--" + texName); 
        //         // textures[texName] = texValues[i];
        //         spfTextureSizeMap[texName] = spfSizes[i];
        //         spriteFrames[i] = fSpriteFrames[i];
        //         const frame = spriteFrames[i];
        //         if (frame) {
        //             spriteFramesCache[frame.name] = frame;
        //             spfTexturesMap[texName] = frame;
        //         }
        //     }

        //     const imageLayerTextures: { [key: string]: SpriteFrame } = {};
        //     const texValues = file.imageLayerSpriteFrame;
        //     spfNames = file.imageLayerSpriteFrameNames;
        //     for (let i = 0; i < texValues.length; ++i) {
        //         imageLayerTextures[spfNames[i]] = texValues[i];
        //     }

        //     const tsxFileNames = file.tsxFileNames;
        //     const tsxFiles = file.tsxFiles;
        //     const tsxContentMap: { [key: string]: BufferAsset } = {};
        //     for (let i = 0; i < tsxFileNames.length; ++i) {
        //         if (tsxFileNames[i].length > 0) {
        //             tsxContentMap[tsxFileNames[i]] = tsxFiles[i];
        //             // console.log("--" + tsxFileNames[i] + "---" + tsxFiles[i]); 
        //         }
        //     }


        //     const cb = (mapInfo: XTMXMapInfo)=> {
        //         const tilesets = mapInfo.getTilesets();
        //         if (!tilesets || tilesets.length === 0) {
        //             logID(7241);
        //         }
    
        //         this._buildWithMapInfo(mapInfo);
        //     }

        //     const mapInfo = new XTMXMapInfo(file._bm!, TiledMap.tss, tsxContentMap, spfTexturesMap, spfTextureSizeMap, imageLayerTextures, cb);

        // } else {
        //     this._releaseMapInfo();
        // }

        var t = this._tmxFile;
        if (t) {
            for (
                var i = t.tsxFileNames,
                    n = t.tsxFiles,
                    r = {},
                    s = 0;
                s < i.length;
                ++s
            )
                0 < i[s].length && (r[ i[s] ] = n[ s ]);
            var e = new TMXMapInfo( t.tmxXmlStr, r, {}, {}, {} ),
                h = e.getTilesets();
            (h && 0 !== h.length) || logID(7241),
                this._buildWithMapInfo( e ),
                (t.tmxXmlStr = ""),
                t.tsxFiles.forEach( function ( t ) {
                        return assetManager.releaseAsset( t );
                    }
                );
        } else this._releaseMapInfo();
    }

    onDestroy () {
        this._releaseMapInfo();
    }

    _releaseMapInfo (): void {
        // // remove the layers & object groups added before
        // const layers = this._layers;
        // for (let i = 0, l = layers.length; i < l; i++) {
        //     layers[i].node.parent?.off(NodeEventType.SIZE_CHANGED, layers[i].updateCulling, layers[i]);
        //     layers[i].node.parent?.off(NodeEventType.TRANSFORM_CHANGED, layers[i].updateCulling, layers[i]);
        //     layers[i].node.removeFromParent();
        //     layers[i].node.destroy();
        // }
        // layers.length = 0;

        // const groups = this._groups;
        // for (let i = 0, l = groups.length; i < l; i++) {
        //     groups[i].node.removeFromParent();
        //     groups[i].node.destroy();
        // }
        // groups.length = 0;

        // // const images = this._images;
        // // for (let i = 0, l = images.length; i < l; i++) {
        // //     images[i].removeFromParent();
        // //     images[i].destroy();
        // // }
        // // images.length = 0;
        for (
            var t = this._tilesets,
                i = 0,
                n = t.length;
            i < n;
            ++i
        ) {
            var r = t[i];
            null != r &&
                r.sourceImage && assetManager.releaseAsset( r.sourceImage );
        }
        for (
            var s = this._layers,
                e = 0,
                h = s.length;
            e < h;
            e++
        ) {
            var o = s[e].node;
            if (!isValid(o))
                break;
            o.removeFromParent(),
                o.destroy();
        }
        s.length = 0;
    }

    _syncAnchorPoint (): void {
        // const anchor = this.node._uiProps.uiTransformComp!.anchorPoint;
        // const leftTopX = this.node._uiProps.uiTransformComp!.width * anchor.x;
        // const leftTopY = this.node._uiProps.uiTransformComp!.height * (1 - anchor.y);
        // let i: number;
        // let l: number;
        // for (i = 0, l = this._layers.length; i < l; i++) {
        //     const layerInfo = this._layers[i];
        //     const layerNode = layerInfo.node;
        //     // Tiled layer sync anchor to map because it's old behavior,
        //     // do not change the behavior avoid influence user's existed logic.
        //     layerNode._uiProps.uiTransformComp!.setAnchorPoint(anchor);
        // }

        // for (i = 0, l = this._groups.length; i < l; i++) {
        //     const groupInfo = this._groups[i];
        //     const groupNode = groupInfo.node._uiProps.uiTransformComp!;
        //     // Group layer not sync anchor to map because it's old behavior,
        //     // do not change the behavior avoid influence user's existing logic.
        //     groupNode.anchorX = 0.5;
        //     groupNode.anchorY = 0.5;
        //     const x = groupInfo.offset.x - leftTopX + groupNode.width * groupNode.anchorX;
        //     const y = groupInfo.offset.y + leftTopY - groupNode.height * groupNode.anchorY;
        //     groupInfo.node.setPosition(x, y);
        // }

        // // for (i = 0, l = this._images.length; i < l; i++) {
        // //     const image = this._images[i]._uiProps.uiTransformComp!;
        // //     image.anchorX = 0.5;
        // //     image.anchorY = 0.5;
        // //     const x = this._images[i]._offset.x - leftTopX + image.width * image.anchorX;
        // //     const y = this._images[i]._offset.y + leftTopY - image.height * image.anchorY;
        // //     this._images[i].setPosition(x, y);
        // // }
        for (
            var t = this.node._uiProps.uiTransformComp!.anchorPoint,
                i = 0,
                n = this._layers.length;
            i < n;
            i++
        )
            this._layers[i].node._uiProps.uiTransformComp!.setAnchorPoint( t );
    }

    // _fillAniGrids (texGrids: TiledTextureGrids, animations: TiledAnimationType): void {
    //     for (const i of animations.keys()) {
    //         const animation = animations.get(i);
    //         if (!animation) continue;
    //         const frames = animation.frames;
    //         for (let j = 0; j < frames.length; j++) {
    //             const frame = frames[j];
    //             frame.grid = texGrids.get(frame.tileid)!;
    //         }
    //     }
    // }

    _buildLayerAndGroup (): void {
        // const tilesets = this._tilesets;
        // const texGrids = this._texGrids;
        // const animations = this._animations;
        // texGrids.clear();

        // for (let i = 0, l = tilesets.length; i < l; ++i) {
        //     const tilesetInfo = tilesets[i];
        //     if (!tilesetInfo) continue;
        //     if (!tilesetInfo.sourceImage) {
        //         console.warn(`Can't find the spriteFrame of tilesets ${tilesetInfo.name}`);
        //         continue;
        //     }
        //     fillTextureGrids(tilesetInfo, texGrids, tilesetInfo.sourceImage);
        // }
        // this._fillAniGrids(texGrids, animations);

        // let layers = this._layers;
        // let groups = this._groups;
        // // let images = this._images;
        // const oldNodeNames: { [key: string]: boolean } = {};
        // for (let i = 0, n = layers.length; i < n; i++) {
        //     oldNodeNames[layers[i].node.name] = true;
        // }
        // for (let i = 0, n = groups.length; i < n; i++) {
        //     oldNodeNames[groups[i].node.name] = true;
        // }
        // // for (let i = 0, n = images.length; i < n; i++) {
        // //     oldNodeNames[images[i].name] = true;
        // // }

        // layers = this._layers = [];
        // groups = this._groups = [];
        // // images = this._images = [];

        // const mapInfo = this._mapInfo!;
        // const node = this.node;
        // const layerInfos = mapInfo.getAllChildren();
        // const textures = this._textures;
        // let maxWidth = 0;
        // let maxHeight = 0;

        // if (layerInfos && layerInfos.length > 0) {
        //     for (let i = 0, len = layerInfos.length; i < len; i++) {
        //         const layerInfo = layerInfos[i];
        //         const name = layerInfo.name;

        //         let child: ImageExtendedNode = this.node.getChildByName(name) as any;
        //         oldNodeNames[name] = false;

        //         if (!child) {
        //             child = (new Node()) as unknown as any;
        //             child.name = name;
        //             child.layer = node.layer;
        //             node.addChild(child);
        //         }

        //         child.setSiblingIndex(i);
        //         child.active = layerInfo.visible;

        //         if (layerInfo instanceof TMXLayerInfo) {
        //             let layer = child.getComponent(TiledLayer);
        //             if (!layer) {
        //                 layer = child.addComponent(TiledLayer);
        //             }

        //             layer.init(layerInfo, mapInfo, tilesets, textures, texGrids, this._sharedCullingRect);
        //             layer.enableCulling = this._enableCulling;

        //             // tell the layerinfo to release the ownership of the tiles map.
        //             layerInfo.ownTiles = false;
        //             layers.push(layer);
        //         } else if (layerInfo instanceof TMXObjectGroupInfo) {
        //             let group = child.getComponent(TiledObjectGroup);
        //             if (!group) {
        //                 group = child.addComponent(TiledObjectGroup);
        //             }
        //             group._init(layerInfo, mapInfo, texGrids);
        //             groups.push(group);
        //         } 
        //         // else if (layerInfo instanceof TMXImageLayerInfo) {
        //         //     const spriteFrame = layerInfo.sourceImage;

        //         //     child.layerInfo = layerInfo;
        //         //     child._offset = new Vec2(layerInfo.offset.x, -layerInfo.offset.y);

        //         //     let image = child.getComponent(Sprite);
        //         //     if (!image) {
        //         //         image = child.addComponent(Sprite);
        //         //     }

        //         //     const color = image.color as Color;
        //         //     color.a *= layerInfo.opacity;

        //         //     image.spriteFrame = spriteFrame!;
        //         //     let width = spriteFrame!.width;
        //         //     let height = spriteFrame!.height;
        //         //     if (spriteFrame!.original) {
        //         //         width = spriteFrame!.originalSize.width;
        //         //         height = spriteFrame!.originalSize.height;
        //         //     }

        //         //     child._uiProps.uiTransformComp!.setContentSize(width, height);
        //         //     images.push(child);
        //         // }

        //         maxWidth = Math.max(maxWidth, child._uiProps.uiTransformComp!.width);
        //         maxHeight = Math.max(maxHeight, child._uiProps.uiTransformComp!.height);
        //     }
        // }

        // const children = node.children;
        // for (let i = 0, n = children.length; i < n; i++) {
        //     const c = children[i];
        //     if (oldNodeNames[c.name]) {
        //         c.destroy();
        //     }
        // }

        // this.node._uiProps.uiTransformComp!.setContentSize(maxWidth, maxHeight);
        // this._syncAnchorPoint();
        
        var t,
        i = this._tilesets,
        n = this._texGrids;
        n.clear();
        for (
            var r = 0,
                e = i.length;
            r < e;
            ++r
        ) {
            var h = i[r];
            // function fillTextureGrids (tileset: TMXTilesetInfo, texGrids: TiledTextureGrids, spFrame?: SpriteFrame): void
            h && (function ( t: TMXTilesetInfo, i: TiledTextureGrids, n?: SpriteFrame ) {
                    var r,
                        e,
                        h,
                        o = n || t.sourceImage!,
                        u = t.collection,
                        a =
                            ((t.imageSize.width && t.imageSize.height) ||
                                ((r = t.sourceImage),
                                (t.imageSize.width = r.width),
                                (t.imageSize.height = r.height)),
                            t.imageSize.width),
                        c = t.imageSize.height,
                        f = t._tileSize.width,
                        l = t._tileSize.height,
                        v = (null == o ? void 0 : o.width) || a,
                        d = (null == o ? void 0 : o.height) || c,
                        _ = t.spacing,
                        p = t.margin,
                        w = 1;
                    u || ((e = Math.floor( (a - 2 * p + _) / (f + _) )),//s = 2
                        (h = Math.floor( (c - 2 * p + _) / (l + _) )),
                        (w = Math.max( 1, h * e )));
                    for (
                        var A,
                            m,
                            E = t.firstGid,
                            T,
                            g = !!i.get( E ),
                            S = t.firstGid + w,
                            M = E;
                        M < S &&
                            ((g = !( g && !i.get( M ) ) && g) ||
                                !i.get( M ));
                        ++M
                    ) {
                        // var C;
                        T = {
                            tileset: t,
                            x: 0,
                            y: 0,
                            width: f,
                            height: l,
                            t: 0,
                            l: 0,
                            r: 0,
                            b: 0,
                            cx: 0,
                            cy: 0,
                            offsetX: 0,
                            offsetY: 0,
                            rotated: false,
                            gid: M,// gid as unknown as GID,
                            spriteFrame: o
                            // texture: tex,
                        };//TiledGrid
                        t.rectForGID( M, T );
                        !n || 1 < w
                                ? (n
                                    ? ((T._name = n.name),
                                        (A = n.unbiasUV[0]),
                                        (m = n.rotated
                                                ? n.unbiasUV[1]
                                                : n.unbiasUV[ 5 ]),
                                        (T.l = A + (T.x + 0.5) / v),
                                        (T.t = m + (T.y + 0.5) / d),
                                        (T.r = A + (T.x + T.width - 0.5) / v),
                                        (T.b = m + (T.y + T.height - 0.5) / d))
                                    : ((T.l = T.x / v),
                                        (T.t = T.y / d),
                                        (T.r = (T.x + T.width) / v),
                                        (T.b = (T.y + T.height) / d)),
                                (T._rect = new Rect( T.x, T.y, T.width, T.height )))
                                : n.rotated
                                ? ((T._rotated = !0),
                                (T._name = n.name),
                                (T._rect = n.getRect()),
                                (T.l = n.unbiasUV[0]),
                                (T.t = n.unbiasUV[1]),
                                (T.r = n.unbiasUV[ 4 ]),
                                (T.b = n.unbiasUV[ 3 ]))
                                : ((T._name = n.name),
                                (T._rect = n.getRect()),
                                (T.l = n.unbiasUV[0]),
                                (T.t = n.unbiasUV[ 5 ]),
                                (T.r = n.unbiasUV[ 2 ]),
                                (T.b =
                                    n.unbiasUV[1])),
                            (T.cx = (T.l + T.r) / 2),
                            (T.cy = (T.t + T.b) / 2),
                            i.set( M, T );
                    }
                })(
                    h,//tileset
                    n,//texgrid
                    h.sourceImage
                );
        }
        var o =
                null != (t = this._layers)
                    ? t
                    : (this._layers = []),
            u = this._mapInfo,
            c = u!.getAllChildren(),
            f = 0,
            l = 0;
        if (c && 0 < c.length)
            for (
                var v = 0,
                    d = c.length;
                v < d;
                v++
            ) {
                var _,
                    p,
                    w,
                    A,
                    m = c[ v ],
                    E = m.name,
                    T = this.node.getChildByName( E );
                T &&
                    (m instanceof TMXLayerInfo &&
                        ((_ =
                            (_ = T.getComponent( TiledLayer )) ||
                            T.addComponent( TiledLayer )).init( m, u, i, [], n ),
                        (_.enableCulling = this._enableCulling),
                        (_.updateLayers = this.updateLayers.bind( this )),
                        o.push( _ ),
                        (this._layerMap[ E ] = _)),
                    (w = (p = T._uiProps.uiTransformComp!).width),
                    (A = p.height),
                    (f = Math.max( f, w )),
                    (l = Math.max( l, A )));
            }
        this.node._uiProps.uiTransformComp!.setContentSize(f, l),
            this._syncAnchorPoint();
    }

    protected _buildWithMapInfo (mapInfo: TMXMapInfo): void {
        // this._mapInfo = mapInfo;
        // // this._mapSize = mapInfo.getMapSize();
        // // this._tileSize = mapInfo.getTileSize();
        // this._mapOrientation = mapInfo.orientation!;
        // this._properties = mapInfo.properties;
        // this._tileProperties = mapInfo.getTileProperties();
        // this._imageLayers = mapInfo.getImageLayers();
        // this._animations = mapInfo.getTileAnimations();
        // this._tilesets = mapInfo.getTilesets();

        // const tilesets = this._tilesets;
        // this._textures.length = 0;

        // // const totalTextures: SpriteFrame[] = [];
        // for (let i = 0, l = tilesets.length; i < l; ++i) {
        //     const tilesetInfo = tilesets[i];
        //     if (!tilesetInfo || !tilesetInfo.sourceImage) continue;
        //     this._textures[i] = tilesetInfo.sourceImage;
        //     // totalTextures.push(tilesetInfo.sourceImage);
        // }

        // for (let i = 0; i < this._imageLayers.length; i++) {
        //     const imageLayer = this._imageLayers[i];
        //     if (!imageLayer || !imageLayer.sourceImage) continue;
        //     this._textures[i] = imageLayer.sourceImage;
        //     // totalTextures.push(imageLayer.sourceImage);
        // }

        // this._buildLayerAndGroup();
        // if (this.cleanupImageCache) {
        //     this._textures.forEach((tex) => {
        //         this.doCleanupImageCache(tex);
        //     });
        // }
        (this._mapInfo = mapInfo),
        (this._mapSize = mapInfo.getMapSize()),
        (this._tileSize = mapInfo.getTileSize()),
        (this._mapOrientation = mapInfo.orientation!),
        (this._properties = mapInfo.properties),
        (this._tileProperties = mapInfo.getTileProperties()),
        (this._tilesets = mapInfo.getTilesets()),
        this._buildLayerAndGroup();
    }

    setGameCameraView (t) {
        (this._gameCameraView = t),
            this.updateCulling();
    }

    _updateCulling () {
        this.ratio =
            this._gameCameraView!.updateRatio();
        for (
            var t =
                    this._layers,
                i = 0;
            i < t.length;
            i++
        )
            t[i].updateCulling();
        this.upateTileMapCulling();
    }

    updateCulling () {
        var t = this;
        this._gameCameraView &&
            !this._isUpdateCulling &&
            ((this._isUpdateCulling = !0),
            this.scheduleOnce(
                function () {
                    t._updateCulling(),
                        (t._isUpdateCulling = !1);
                }
            ));
    }

    upateTileMapCulling () {
        if (this._gameCameraView) {
            this.ratio = this._gameCameraView.ratioToUI;
            var t = this._layers,
                i = t[0];
            i.updateCullingRect( this.ratio );
            for (
                var n = i.isUserNodeDirty(),
                    r = 1;
                r < t.length;
                r++
            ) {
                var s = t[r];
                (n ||
                    s.hasUserNode) &&
                    ((s.ratio = this.ratio),
                    s.showRect.set( i.showRect ),
                    (s.cullingRect.leftDown = i.cullingRect.leftDown),
                    (s.cullingRect.rightTop = i.cullingRect.rightTop),
                    s.setUserNodeDirty( !0 ));
            }
        }
    }

    updateLayers () {
        for (
            var t = this._layers,
                i = 0;
            i < t.length;
            i++
        ) {
            var n = t[i];
            n.clearCache(),
                n.setUserNodeDirty(!0);
        }
    }

    updateLayerVertices () {
        for (
            var t = this._layers,
                i = 0;
            i < t.length;
            i++
        ) {
            var n = t[i];
            n.node.active &&
                n.updateVertices();
        }
    }

    // doCleanupImageCache (texture): void {
    //     if (texture._image instanceof HTMLImageElement) {
    //         texture._image.src = '';
    //         if (JSB) texture._image.destroy();
    //     } else if (sys.hasFeature(sys.Feature.IMAGE_BITMAP) && texture._image instanceof ImageBitmap) {
    //         if (texture._image.close) texture._image.close();
    //     }
    //     texture._image = null;
    // }

    // lateUpdate (dt: number): void {
    //     const animations = this._animations;
    //     const texGrids = this._texGrids;
    //     for (const aniGID of animations?.keys()) {
    //         const animation = animations.get(aniGID)!;
    //         const frames = animation.frames;
    //         let frame = frames[animation.frameIdx];
    //         animation.dt += dt;
    //         if (frame.duration < animation.dt) {
    //             animation.dt = 0;
    //             animation.frameIdx++;
    //             if (animation.frameIdx >= frames.length) {
    //                 animation.frameIdx = 0;
    //             }
    //             frame = frames[animation.frameIdx];
    //         }
    //         texGrids.set(aniGID, frame.grid!);
    //     }
    //     const layers = this._layers;//this.getLayers();
    //     for (let i = 0, l = layers.length; i < l; i++) {
    //         const layer = layers[i];
    //         if (layer.hasAnimation() || layer.node.hasChangedFlags) {
    //             layer.markForUpdateRenderData();
    //         }
    //     }
    // }
}
