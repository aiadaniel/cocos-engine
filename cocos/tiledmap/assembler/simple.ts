/* eslint-disable max-len */
/*
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

import { JSB } from 'internal:constants';
import { Mat4, Size, Vec3 } from '../../core/math';
import { IAssembler } from '../../2d/renderer/base';
import { IBatcher } from '../../2d/renderer/i-batcher';
import { TiledLayer, TiledTile, TiledMap, bmap, TiledUserNodeData } from '..';
import { GID, MixedGID, TiledGrid, TileFlag } from '../tiled-types';
import { director, Director } from '../../game';
import { StaticVBAccessor } from '../../2d/renderer/static-vb-accessor';
import { vfmtPosUvColor } from '../../2d/renderer/vertex-format';
import { BaseRenderData, RenderData } from '../../2d/renderer/render-data';
import { RenderDrawInfoType } from '../../2d/renderer/render-draw-info';
import { Texture2D } from '../../asset/assets';
import { Node } from '../../scene-graph';
import { SpriteFrame } from '../../2d';
import { TextureBase } from '../../asset/assets/texture-base';
import { log } from '../../core';

const MaxGridsLimit = Math.ceil(65535 / 6);

const vec3_temps: Vec3[] = [];
for (let i = 0; i < 4; i++) {
    vec3_temps.push(new Vec3());
}

const _mat4_temp = new Mat4();
const _vec3u_temp = new Vec3();
const _leftDown = { row: 0, col: 0 };
const _uva = { x: 0, y: 0 };
const _uvb = { x: 0, y: 0 };
const _uvc = { x: 0, y: 0 };
const _uvd = { x: 0, y: 0 };

const _vfOffset = 0;
let _moveX = 0;
let _moveY = 0;

let textureEnd = 0;
let textureStart = 0;

const n$r = new Array(300);
let _fillCount = 0;

let _curTexture: TextureBase | undefined;

let maxTexs = 0;
let textureList: any[] = [];

// let _fillCount = 0;
// let _curTexture : Texture2D | null = null;
// let _tempBuffers : Float32Array;
// let _curLayer: TiledLayer;
let _curLayer: TiledLayer|null;

let _tiledGrid: TiledGrid | null;

const textureMat = {
    mat: null,
};

let _texMap: { [key: string]: number };

let flipTexture: (grid: TiledGrid, gid: MixedGID) => void;

let _accessor: StaticVBAccessor = null!;
/**
 * simple 组装器
 * 可通过 `UI.simple` 获取该组装器。
 */
export class Simple implements IAssembler {
    private ensureAccessor (): void {
        if (!_accessor) {
            const device = director.root!.device;
            // const batcher = director.root!.batcher2D;
            _accessor = new StaticVBAccessor(device, vfmtPosUvColor/*, this.vCount*/);
            //batcher.registerBufferAccessor(Number.parseInt('TILED-MAP', 36), _accessor);
            director.on(Director.EVENT_BEFORE_DRAW, () => {
                _accessor.reset();
            });
        }
    }

    createData (layer: TiledLayer): BaseRenderData {
        _tiledGrid = null;//TiledGrid
        maxTexs = globalThis.multMat_maxUnits;
        if (maxTexs && !textureList) {
            textureList = [];
            director.on(Director.EVENT_BEFORE_DRAW, reset);
        }
        if (JSB) {
            log('createData in tileassembler');
            this.ensureAccessor();
        }
        return null as unknown as BaseRenderData;
    }

    //batch2d.ts(commitComp->assembler.fillBiffers) <=组件的_render(此处是tiledlayer) <==ui-renderer.ts/ui-mesh-renderer.ts(fillBuffers) <===batcher-2d.ts(walk) <== root.ts(framemove)
    fillBuffers (layer: TiledLayer /*layer: TiledLayer, renderer: IBatcher*/): void {
        // if (!layer || layer.tiledDataArray.length === 0) return;

        // const dataArray = layer.tiledDataArray;

        // // 当前渲染的数据
        // const data = dataArray[layer._tiledDataArrayIdx] as XTiledRenderData;
        // const renderData = data.renderData!;
        // const iBuf = renderData.chunk.meshBuffer.iData;

        // let indexOffset = renderData.chunk.meshBuffer.indexOffset;
        // let vertexId = renderData.chunk.vertexOffset;
        // const quadCount = renderData.vertexCount / 4;
        // for (let i = 0; i < quadCount; i += 1) {
        //     iBuf[indexOffset] = vertexId;
        //     iBuf[indexOffset + 1] = vertexId + 1;
        //     iBuf[indexOffset + 2] = vertexId + 2;
        //     iBuf[indexOffset + 3] = vertexId + 2;
        //     iBuf[indexOffset + 4] = vertexId + 1;
        //     iBuf[indexOffset + 5] = vertexId + 3;
        //     indexOffset += 6;
        //     vertexId += 4;
        // }
        // renderData.chunk.meshBuffer.indexOffset = indexOffset;
        const renderData = layer.currRenderData;
        const meshBuffer = renderData.chunk.meshBuffer;
        let indexOffset = meshBuffer.indexOffset;
        const r = meshBuffer.indexOffset + 1.5 * renderData.vertexCount;
        const iBuf = meshBuffer.iData;
        let vertexId = renderData.chunk.vertexOffset;
        if (renderData.meshBufferOffset !== indexOffset || renderData.meshFinishOffset !== r || iBuf[indexOffset] !== vertexId) {
            for (renderData.meshBufferOffset = indexOffset, renderData.meshFinishOffset = r; indexOffset < r;) {
                iBuf[indexOffset++] = vertexId;
                iBuf[indexOffset++] = ++vertexId;
                iBuf[indexOffset++] = ++vertexId;
                iBuf[indexOffset++] = vertexId;
                iBuf[indexOffset++] = vertexId++ - 1;
                iBuf[indexOffset++] = vertexId++;
            }
        }
        meshBuffer.indexOffset = r;
    }

    //01 ui-renderer.ts updateRenderer <= ui-renderer-manager.ts
    updateRenderData (layer: TiledLayer): void {
        // comp.updateCulling();
        // _moveX = comp.leftDownToCenterX;
        // _moveY = comp.leftDownToCenterY;
        // if (comp.colorChanged || comp.isCullingDirty() || comp.isUserNodeDirty() || comp.hasAnimation()
        //     || comp.hasTiledNode() || comp.node.hasChangedFlags) {
        //     comp.colorChanged = false;
        //     comp.destroyRenderData();

        //     let leftDown: { col: number, row: number };
        //     let rightTop: { col: number, row: number };
        //     if (comp.enableCulling) {
        //         const cullingRect = comp.cullingRect;
        //         leftDown = cullingRect.leftDown;
        //         rightTop = cullingRect.rightTop;
        //     } else {
        //         leftDown = _leftDown;
        //         rightTop = comp.rightTop;
        //     }

        //     // switch (comp.renderOrder) {
        //     // left top to right down, col add, row sub,
        //     // case bmap.RenderOrder.RightDown:
        //         traverseGrids(leftDown, rightTop, -1, 1, comp);
        //         // break;
        //         // right top to left down, col sub, row sub
        //     // case bmap.RenderOrder.LeftDown:
        //     //     traverseGrids(leftDown, rightTop, -1, -1, comp);
        //     //     break;
        //     //     // left down to right up, col add, row add
        //     // case bmap.RenderOrder.RightUp:
        //     //     traverseGrids(leftDown, rightTop, 1, 1, comp);
        //     //     break;
        //     //     // right down to left up, col sub, row add
        //     // case bmap.RenderOrder.LeftUp:
        //     // default:
        //     //     traverseGrids(leftDown, rightTop, 1, -1, comp);
        //     //     break;
        //     // }
        //     comp.setCullingDirty(false);
        //     comp.setUserNodeDirty(false);
        // }
        // if (JSB) {
        //     comp.prepareDrawData();
        // }
        if (layer.isUserNodeDirty()) {
            const cullingRect = layer.cullingRect;
            _moveX = layer.leftDownToCenterX;
            _moveY = layer.leftDownToCenterY;
            const leftDown = cullingRect.leftDown;
            const rightTop = cullingRect.rightTop;
            layer.destroyRenderData();
            _curLayer = layer;
            switch (_curLayer.renderOrder) {
            case bmap.RenderOrder.RightDown:
                traverseGrids(leftDown, rightTop, -1, 1, layer);
                break;
            case bmap.RenderOrder.LeftDown:
                traverseGrids(leftDown, rightTop, -1, -1, layer);
                break;
            case bmap.RenderOrder.RightUp:
                traverseGrids(leftDown, rightTop, 1, 1, layer);
                break;
            default:
                traverseGrids(leftDown, rightTop, 1, -1, layer);
            }
            _curLayer = null;
            layer.setUserNodeDirty(false);
            if (JSB) {
                layer.prepareDrawData();
            }
        }
    }

    // ui-renderer.ts _updateColor <= setColor
    updateColor (tiled: TiledLayer): void {
        const color = tiled.color;
        const colorV = new Float32Array(4);
        colorV[0] = color.r / 255;
        colorV[1] = color.g / 255;
        colorV[2] = color.b / 255;
        colorV[3] = color.a / 255;
        const rs = tiled.tiledDataArray;
        for (const r of rs) {
            if (!(r as any).renderData) continue;
            const renderData = (r as any).renderData;
            const vs = renderData.vData;
            for (let i = renderData.vertexStart, l = renderData.vertexCount; i < l; i++) {
                vs.set(colorV, i * 9 + 5);
            }
        }
    }
}

export const simple = new Simple();

/*
texture coordinate
a c
b d
*/
// function _flipTexture (inGrid: TiledGrid, gid: MixedGID): void {
//     if (inGrid._rotated) {
//         // 2:b   1:a
//         // 4:d   3:c
//         _uva.x = inGrid.r;
//         _uva.y = inGrid.t;
//         _uvb.x = inGrid.l;
//         _uvb.y = inGrid.t;
//         _uvc.x = inGrid.r;
//         _uvc.y = inGrid.b;
//         _uvd.x = inGrid.l;
//         _uvd.y = inGrid.b;
//     } else {
//         // 1:a  3:c
//         // 2:b  4:d
//         _uva.x = inGrid.l;
//         _uva.y = inGrid.t;
//         _uvb.x = inGrid.l;
//         _uvb.y = inGrid.b;
//         _uvc.x = inGrid.r;
//         _uvc.y = inGrid.t;
//         _uvd.x = inGrid.r;
//         _uvd.y = inGrid.b;
//     }

//     let tempVal;

//     // vice
//     if (((gid as unknown as number) & TileFlag.DIAGONAL) >>> 0) {
//         tempVal = _uvb;
//         _uvb = _uvc;
//         _uvc = tempVal;
//     }

//     // flip x
//     if (((gid as unknown as number) & TileFlag.HORIZONTAL) >>> 0) {
//         tempVal = _uva;
//         _uva = _uvc;
//         _uvc = tempVal;

//         tempVal = _uvb;
//         _uvb = _uvd;
//         _uvd = tempVal;
//     }

//     // flip y
//     if (((gid as unknown as number) & TileFlag.VERTICAL) >>> 0) {
//         tempVal = _uva;
//         _uva = _uvb;
//         _uvb = tempVal;

//         tempVal = _uvc;
//         _uvc = _uvd;
//         _uvd = tempVal;
//     }
// }

/*
texture coordinate
   a
b     c
   d
*/
// function _flipDiamondTileTexture (inGrid: TiledGrid, gid: MixedGID): void {
//     if (inGrid._rotated) {
//         //       2:b
//         // 4:d         1:a
//         //       3:c
//         _uva.x = inGrid.r;
//         _uva.y = inGrid.cy;
//         _uvb.x = inGrid.cx;
//         _uvb.y = inGrid.t;
//         _uvc.x = inGrid.cx;
//         _uvc.y = inGrid.b;
//         _uvd.x = inGrid.l;
//         _uvd.y = inGrid.cy;
//     } else {
//         //       1:a
//         // 2:b         3:c
//         //       4:d
//         _uva.x = inGrid.cx;
//         _uva.y = inGrid.t;
//         _uvb.x = inGrid.l;
//         _uvb.y = inGrid.cy;
//         _uvc.x = inGrid.r;
//         _uvc.y = inGrid.cy;
//         _uvd.x = inGrid.cx;
//         _uvd.y = inGrid.b;
//     }

//     let tempVal;

//     // vice
//     if (((gid as unknown as number) & TileFlag.DIAGONAL) >>> 0) {
//         tempVal = _uva;
//         _uva = _uvb;
//         _uvb = tempVal;

//         tempVal = _uvc;
//         _uvc = _uvd;
//         _uvd = tempVal;
//     }

//     // flip x
//     if (((gid as unknown as number) & TileFlag.HORIZONTAL) >>> 0) {
//         tempVal = _uvb;
//         _uvb = _uvc;
//         _uvc = tempVal;
//     }

//     // flip y
//     if (((gid as unknown as number) & TileFlag.VERTICAL) >>> 0) {
//         tempVal = _uva;
//         _uva = _uvd;
//         _uvd = tempVal;
//     }
// }

// function packRenderData (): void {
//     if (_fillCount < 1 || !_curTexture) return;

//     const vbCount = 4 * _fillCount;
//     const ibCount = 6 * _fillCount;
//     const tiledData = _curLayer.requestTiledRenderData();
//     if (JSB) {
//         tiledData.renderData = RenderData.add(vfmtPosUvColor, _accessor);
//         tiledData.renderData.drawInfoType = RenderDrawInfoType.MIDDLEWARE;
//     } else {
//         tiledData.renderData = RenderData.add(vfmtPosUvColor);
//     }
//     tiledData.texture = _curTexture;
//     // const rd = tiledData.renderData;
//     tiledData.renderData.resize(vbCount, ibCount);
//     // const vb = tiledData.renderData.chunk.vb;
//     tiledData.renderData.chunk.vb.set(_tempBuffers.subarray(0, vbCount * 9), 0);

//     _fillCount = 0;
//     _curTexture = null;
// }

// rowMoveDir is -1 or 1, -1 means decrease, 1 means increase
// colMoveDir is -1 or 1, -1 means decrease, 1 means increase
// function traverseGrids (leftDown: { col: number, row: number }, rightTop: { col: number, row: number },
//     rowMoveDir: number, colMoveDir: number, comp: TiledLayer): void {
//     // show nothing
//     if (rightTop.row < 0 || rightTop.col < 0) return;

//     _curLayer = comp;

//     const matrix = comp.node.worldMatrix;
//     _vfOffset = 0;

//     // const tiledTiles = comp.tiledTiles;

//     // const texGrids = comp.texGrids!;
//     // const tiles = comp.tiles;

//     const vertStep = 9;
//     const vertStep2 = vertStep * 2;
//     const vertStep3 = vertStep * 3;

//     const vertices = comp.vertices;
//     let rowData: { maxCol: number, minCol: number } & SafeRecord<number, { left: number, bottom: number; index: number }>;
//     let col: number;
//     let cols: number;
//     let row: number;
//     let rows: number;
//     let colData: { left: number, bottom: number, index: number };
//     let tileSize: Size;
//     let grid: TiledGrid | undefined;
//     let gid: MixedGID = 0 as unknown as any;
//     let left = 0;
//     let bottom = 0;
//     let right = 0;
//     let top = 0; // x, y
//     let tiledNode: TiledTile | null;
//     let colNodesCount = 0;
//     let isCheckColRange = true;

//     const diamondTile = false; // TODO:comp._diamondTile;

//     flipTexture = diamondTile ? _flipDiamondTileTexture : _flipTexture;

//     const color: Float32Array = new Float32Array(4);
//     color[0] = comp.color.r / 255;
//     color[1] = comp.color.g / 255;
//     color[2] = comp.color.b / 255;
//     color[3] = comp.color.a / 255;

//     if (rowMoveDir === -1) {
//         row = rightTop.row;
//         rows = leftDown.row;
//     } else {
//         row = leftDown.row;
//         rows = rightTop.row;
//     }

//     const _tempRows = Math.abs(leftDown.row - rightTop.row) + 1;
//     const _tempClos = Math.abs(rightTop.col - leftDown.col) + 1;
//     _tempBuffers = new Float32Array(_tempRows * _tempClos * 9 * 4);
//     _fillCount = 0;
//     const vertexBuf = _tempBuffers;
//     // traverse row
//     for (; (rows - row) * rowMoveDir >= 0; row += rowMoveDir) {
//         rowData = vertices[row]!;
//         colNodesCount = comp.getNodesCountByRow(row);
//         isCheckColRange = rowData && colNodesCount === 0;

//         // limit min col and max col
//         if (colMoveDir === 1) {
//             col = isCheckColRange && leftDown.col < rowData.minCol ? rowData.minCol : leftDown.col;
//             cols = isCheckColRange && rightTop.col > rowData.maxCol ? rowData.maxCol : rightTop.col;
//         } else {
//             col = isCheckColRange && rightTop.col > rowData.maxCol ? rowData.maxCol : rightTop.col;
//             cols = isCheckColRange && leftDown.col < rowData.minCol ? rowData.minCol : leftDown.col;
//         }

//         // traverse col
//         for (; (cols - col) * colMoveDir >= 0; col += colMoveDir) {
//             colData = rowData && rowData[col]!;

//             if (colNodesCount > 0) {
//                 packRenderData();
//                 const nodes = comp.requestSubNodesData();
//                 const celData = comp.getNodesByRowCol(row, col);
//                 if (celData && celData.count > 0) {
//                     (nodes as any).subNodes = celData.list as any;
//                 }
//             }

//             if (!colData) {
//                 // only render users nodes because map data is empty
//                 continue;
//             }

//             gid = comp.tiles[colData.index];
//             grid = comp.texGrids!.get((((gid as unknown as number) & TileFlag.FLIPPED_MASK) >>> 0) as unknown as GID);
//             if (!grid) continue;

//             // check init or new material
//             if (_curTexture !== grid.texture) {
//                 packRenderData();
//                 _curTexture = grid.texture;
//             }

//             tileSize = grid.tileset._tileSize;

//             // calc rect vertex
//             left = colData.left - _moveX;
//             bottom = colData.bottom - _moveY;
//             right = left + tileSize.width;
//             top = bottom + tileSize.height;

//             // begin to fill vertex buffer
//             tiledNode = comp.tiledTiles[colData.index];

//             _vfOffset = _fillCount * 4 * 9;

//             if (!tiledNode) {
//                 if (diamondTile) {
//                     const centerX = (left + right) / 2;
//                     const centerY = (top + bottom) / 2;
//                     // ct
//                     vec3_temps[0].x = centerX;
//                     vec3_temps[0].y = top;

//                     // lc
//                     vec3_temps[1].x = left;
//                     vec3_temps[1].y = centerY;

//                     // rc
//                     vec3_temps[2].x = right;
//                     vec3_temps[2].y = centerY;

//                     // cb
//                     vec3_temps[3].x = centerX;
//                     vec3_temps[3].y = bottom;
//                 } else {
//                     // lt
//                     vec3_temps[0].x = left;
//                     vec3_temps[0].y = top;

//                     // lb
//                     vec3_temps[1].x = left;
//                     vec3_temps[1].y = bottom;

//                     // rt
//                     vec3_temps[2].x = right;
//                     vec3_temps[2].y = top;

//                     // rb
//                     vec3_temps[3].x = right;
//                     vec3_temps[3].y = bottom;
//                 }

//                 vec3_temps[0].transformMat4(matrix);
//                 vertexBuf[_vfOffset] = vec3_temps[0].x;
//                 vertexBuf[_vfOffset + 1] = vec3_temps[0].y;
//                 vertexBuf[_vfOffset + 2] = vec3_temps[0].z;

//                 vec3_temps[1].transformMat4(matrix);
//                 vertexBuf[_vfOffset + vertStep] = vec3_temps[1].x;
//                 vertexBuf[_vfOffset + vertStep + 1] = vec3_temps[1].y;
//                 vertexBuf[_vfOffset + vertStep + 2] = vec3_temps[1].z;

//                 vec3_temps[2].transformMat4(matrix);
//                 vertexBuf[_vfOffset + vertStep2] = vec3_temps[2].x;
//                 vertexBuf[_vfOffset + vertStep2 + 1] = vec3_temps[2].y;
//                 vertexBuf[_vfOffset + vertStep2 + 2] = vec3_temps[2].z;

//                 vec3_temps[3].transformMat4(matrix);
//                 vertexBuf[_vfOffset + vertStep3] = vec3_temps[3].x;
//                 vertexBuf[_vfOffset + vertStep3 + 1] = vec3_temps[3].y;
//                 vertexBuf[_vfOffset + vertStep3 + 2] = vec3_temps[3].z;

//                 vertexBuf.set(color, _vfOffset + 5);
//                 vertexBuf.set(color, _vfOffset + vertStep + 5);
//                 vertexBuf.set(color, _vfOffset + vertStep2 + 5);
//                 vertexBuf.set(color, _vfOffset + vertStep3 + 5);
//             } else if (tiledNode.node.active) {
//                 fillByTiledNode(tiledNode.node, color, vertexBuf, left, right, top, bottom, diamondTile);
//             }

//             flipTexture(grid, gid);

//             // lt/ct -> a
//             vertexBuf[_vfOffset + 3] = _uva.x;
//             vertexBuf[_vfOffset + 4] = _uva.y;

//             // lb/lc -> b
//             vertexBuf[_vfOffset + vertStep + 3] = _uvb.x;
//             vertexBuf[_vfOffset + vertStep + 4] = _uvb.y;

//             // rt/rc -> c
//             vertexBuf[_vfOffset + vertStep2 + 3] = _uvc.x;
//             vertexBuf[_vfOffset + vertStep2 + 4] = _uvc.y;

//             // rt/cb -> d
//             vertexBuf[_vfOffset + vertStep3 + 3] = _uvd.x;
//             vertexBuf[_vfOffset + vertStep3 + 4] = _uvd.y;

//             _fillCount++;

//             // vertices count exceed 66635, buffer must be switched
//             if (_fillCount >= MaxGridsLimit) {
//                 packRenderData();
//             }
//         }
//     }
//     packRenderData();
// }

function _Index (tex: TextureBase|undefined): number { //返回 旧值 或 textureEnd自增前的值
    const n = tex!.getId();
    const i: number = _texMap[n];
    if (i != null) {
        return i;
    } else {
        textureList[textureEnd] = tex;
        if (textureEnd % maxTexs === 0) {
            _texMap = {};
        }
        _texMap[n] = textureEnd;
        return textureEnd++;
    }
}
function traverseGrids (leftDown: {col: number, row: number}, rightTop: {col: number, row: number}, rowMoveDir: number, colMoveDir: number, _tiledLayer: TiledLayer): void {
    let col: number; let row: number;
    let bottom = 0; let left = 0; let right = 0; let top = 0;
    let gid: MixedGID = 0 as unknown as any;
    let C;
    let tileSize: Size;
    let grid: TiledGrid | undefined;
    _fillCount = 0;
    if (_tiledLayer.tiledMapCurr?.clear) {
        _tiledLayer.tiledMapCurr = {};
        _tiledLayer.tiledMapPool = {};
    }
    const d = (_tiledLayer._offset == null ? undefined : _tiledLayer._offset.y) !== 0 ? 1 : 0;
    C = 0;
    const rows = rowMoveDir === -1
        ? ((row = rightTop.row + d), leftDown.row - _tiledLayer.downRow + d)
        : ((row = leftDown.row - _tiledLayer.downRow + d), rightTop.row + d);
    const cols = (colMoveDir === 1
        ? ((col = leftDown.col), rightTop)
        : ((col = rightTop.col), leftDown)).col;
    if (_tiledLayer.hasUserNode) {
        for (let B: number = rightTop.row + _tiledLayer.nodeDownRow; B > rightTop.row; --B) {
            dealUserNode(_tiledLayer.getSorttedNodesByRow(B));
        }
    }
    for (; (rows - row) * rowMoveDir >= 0; row += rowMoveDir) {
        const rowData = _tiledLayer.vertices[row];
        if (rowData) {
            for (let R = col; R <= cols; R += colMoveDir) {
                const colData = rowData[R];
                if (colData) {
                    let N; let U; let k; let G; let V; let H; let W; let j; let X; let z; let J;
                    let tex: TextureBase | undefined;
                    gid = _tiledLayer.tiles[colData.index];
                    if (gid === 0) continue;
                    grid = _tiledLayer.texGrids!.get((gid & TileFlag.FLIPPED_MASK) >>> 0);
                    if (!grid) continue;
                    tex = grid.spriteFrame == null ? undefined : grid.spriteFrame.texture;
                    if (!tex) {
                        _tiledLayer.loadTileMapImage(grid.tileset, _tiledLayer.texGrids!, _tiledLayer.hasUserNode);
                        if (!_tiledGrid) continue;
                        tex = _tiledGrid.spriteFrame?.texture;
                        grid = _tiledGrid;
                    }
                    if (_curTexture !== tex) {
                        if (!_tiledLayer.hasUserNode && maxTexs) {
                            if (C === maxTexs - 1) {
                                packRenderData(false);
                                reset();
                            }
                            C = _Index(tex);
                        } else {
                            packRenderData(true);
                        }
                        _curTexture = tex;
                        if (_tiledLayer.isGroundLayer) _tiledGrid = grid;
                    }
                    const q = 10000 * row + R;
                    X = _tiledLayer.tiledMapCurr[q];
                    if (!X && _tiledLayer.tiledMapPool[q]) {
                        X = _tiledLayer.tiledMapPool[q];
                        _tiledLayer.tiledMapCurr[q] = X;
                        _tiledLayer.tiledMapPool[q] = null;
                        delete _tiledLayer.tiledMapPool[q];
                    }
                    if (X) {
                        if (X[2] !== C) {
                            X[2] = C;
                            X[11] = C;
                            X[20] = C;
                            X[29] = C;
                        }
                        n$r[_fillCount++] = q;
                        continue;
                    }
                    // lxm这里报错循环没有第二次
                    // eslint-disable-next-line no-unreachable-loop
                    for (z in _tiledLayer.tiledMapPool) {
                        X = _tiledLayer.tiledMapPool[z];
                        _tiledLayer.tiledMapPool[z] = null;
                        delete _tiledLayer.tiledMapPool[z];
                        break;
                    }
                    X = X || new Float32Array(36);
                    _tiledLayer.tiledMapCurr[q] = X;
                    n$r[_fillCount++] = q;
                    tileSize = grid.tileset._tileSize;
                    left = _tiledLayer.node.worldPosition.x + colData.left - _moveX;
                    bottom = _tiledLayer.node.worldPosition.y + colData.bottom - _moveY;
                    right = left + tileSize.width;
                    top = bottom + tileSize.height;
                    X[0] = left;
                    X[1] = top;
                    X[9] = left;
                    X[10] = bottom;
                    X[18] = right;
                    X[19] = top;
                    X[27] = right;
                    X[28] = bottom;
                    if (X[2] !== C) {
                        X[2] =  C;
                        X[11] = C;
                        X[20] = C;
                        X[29] = C;
                    }
                    if ((X[8] !== 1)) {
                        for (let Z = 5; Z < 36; Z += 5) {
                            X[Z++] = 1;
                            X[Z++] = 1;
                            X[Z++] = 1;
                            X[Z++] = 1;
                        }
                    }
                    (V = grid.r);
                    (J = grid.t);
                    (U = j = grid.l);
                    (N = k = grid.b);
                    (W = V);
                    (H = J);
                    (G = undefined);
                    if ((gid & TileFlag.HORIZONTAL) >>> 0) {
                        G = j;
                        j = W;
                        W = G;
                        G = J;
                        J = H;
                        H = G;
                        G = U;
                        U = V;
                        V = G;
                        G = N;
                        N = k;
                        k = G;
                    }
                    if ((gid & TileFlag.VERTICAL) >>> 0) {
                        G = j;
                        j = U;
                        U = G;
                        G = J;
                        J = N;
                        N = G;
                        G = W;
                        W = V;
                        V = G;
                        G = H;
                        H = k;
                        k = G;
                    }
                    if (grid._rotated) {
                        X[3] =  W;
                        X[4] =  H;
                        X[12] = j;
                        X[13] = J;
                        X[21] = V;
                        X[22] = k;
                        X[30] = U;
                        X[31] = N;
                    } else {
                        X[3] =  j;
                        X[4] =  J;
                        X[12] = U;
                        X[13] = N;
                        X[21] = W;
                        X[22] = H;
                        X[30] = V;
                        X[31] = k;
                    }
                }
            }
        }
        if (_tiledLayer.hasUserNode) {
            dealUserNode(_tiledLayer.getSorttedNodesByRow(row, true));
        }
    }
    if (_tiledLayer.hasUserNode) {
        for (
            let $ = leftDown.row - _tiledLayer.downRow - 1,
                tt = leftDown.row - _tiledLayer.nodeUpRow;
            tt < $; --$) dealUserNode(_tiledLayer.getSorttedNodesByRow($));
    }
    packRenderData(_tiledLayer.hasUserNode);
}

// function fillByTiledNode (tiledNode: Node, color: Float32Array, vbuf: Float32Array,
//     left: number, right: number, top: number, bottom: number, diamondTile: boolean): void {
//     const vertStep = 9;
//     const vertStep2 = vertStep * 2;
//     const vertStep3 = vertStep * 3;

//     tiledNode.updateWorldTransform();
//     Mat4.fromRTS(_mat4_temp, tiledNode.rotation, tiledNode.position, tiledNode.scale);
//     Vec3.set(_vec3u_temp, -(left + _moveX), -(bottom + _moveY), 0);
//     Mat4.transform(_mat4_temp, _mat4_temp, _vec3u_temp);
//     Mat4.multiply(_mat4_temp, tiledNode.parent!.worldMatrix, _mat4_temp);

//     const m = _mat4_temp;
//     const tx = m.m12;
//     const ty = m.m13;

//     const a = m.m00;
//     const b = m.m01;
//     const c = m.m04;
//     const d = m.m05;

//     const justTranslate = a === 1 && b === 0 && c === 0 && d === 1;

//     if (diamondTile) {
//         const centerX = (left + right) / 2;
//         const centerY = (top + bottom) / 2;
//         if (justTranslate) {
//             // ct
//             vbuf[_vfOffset] = centerX + tx;
//             vbuf[_vfOffset + 1] = top + ty;

//             // lc
//             vbuf[_vfOffset + vertStep] = left + tx;
//             vbuf[_vfOffset + vertStep + 1] = centerY + ty;

//             // rc
//             vbuf[_vfOffset + vertStep2] = right + tx;
//             vbuf[_vfOffset + vertStep2 + 1] = centerY + ty;

//             // cb
//             vbuf[_vfOffset + vertStep3] = centerX + tx;
//             vbuf[_vfOffset + vertStep3 + 1] = bottom + ty;
//         } else {
//             // ct
//             vbuf[_vfOffset] = centerX * a + top * c + tx;
//             vbuf[_vfOffset + 1] = centerX * b + top * d + ty;

//             // lc
//             vbuf[_vfOffset + vertStep] = left * a + centerY * c + tx;
//             vbuf[_vfOffset + vertStep + 1] = left * b + centerY * d + ty;

//             // rc
//             vbuf[_vfOffset + vertStep2] = right * a + centerY * c + tx;
//             vbuf[_vfOffset + vertStep2 + 1] = right * b + centerY * d + ty;

//             // cb
//             vbuf[_vfOffset + vertStep3] = centerX * a + bottom * c + tx;
//             vbuf[_vfOffset + vertStep3 + 1] = centerX * b + bottom * d + ty;
//         }
//     } else if (justTranslate) {
//         vbuf[_vfOffset] = left + tx;
//         vbuf[_vfOffset + 1] = top + ty;

//         vbuf[_vfOffset + vertStep] = left + tx;
//         vbuf[_vfOffset + vertStep + 1] = bottom + ty;

//         vbuf[_vfOffset + vertStep2] = right + tx;
//         vbuf[_vfOffset + vertStep2 + 1] = top + ty;

//         vbuf[_vfOffset + vertStep3] = right + tx;
//         vbuf[_vfOffset + vertStep3 + 1] = bottom + ty;
//     } else {
//         // lt
//         vbuf[_vfOffset] = left * a + top * c + tx;
//         vbuf[_vfOffset + 1] = left * b + top * d + ty;

//         // lb
//         vbuf[_vfOffset + vertStep] = left * a + bottom * c + tx;
//         vbuf[_vfOffset + vertStep + 1] = left * b + bottom * d + ty;

//         // rt
//         vbuf[_vfOffset + vertStep2] = right * a + top * c + tx;
//         vbuf[_vfOffset + vertStep2 + 1] = right * b + top * d + ty;

//         // rb
//         vbuf[_vfOffset + vertStep3] = right * a + bottom * c + tx;
//         vbuf[_vfOffset + vertStep3 + 1] = right * b + bottom * d + ty;
//     }

//     vbuf.set(color, _vfOffset + 5);
//     vbuf.set(color, _vfOffset + vertStep + 5);
//     vbuf.set(color, _vfOffset + vertStep2 + 5);
//     vbuf.set(color, _vfOffset + vertStep3 + 5);
// }

function dealUserNode (t: TiledUserNodeData | null): void {
    if (t) {
        packRenderData(true);
        _curLayer!.requestSubNodesData(t);
    }
}
function packRenderData (hasUserNode: boolean): void {
    if (_fillCount > 0 && _curTexture) {
        const rd = _curLayer!.requestTiledRenderData();
        rd.reuse(_fillCount);
        if (maxTexs) {
            rd.frame = _curTexture;
        } else {
            rd.updateTexture(_curTexture);
            rd.updateHash();
        }
        if (hasUserNode || !maxTexs) {
            if (textureEnd > 0) reset();
        } else {
            rd.textureInfo = { textureList, textureStart, textureEnd: textureEnd - 1, textureMat }; //todo
            textureStart = textureEnd;
        }
        _curTexture = null!;
        let r = 0;
        const currMap = _curLayer!.tiledMapCurr;
        const mapPool = _curLayer!.tiledMapPool;
        for (let h = 0; h < _fillCount; ++h) {
            for (let u = 0; u < 36; ++u) rd.chunk.vb[r++] = currMap[n$r[h]][u];
        }
        for (let a = 0; a < _fillCount; ++a) {
            const c = n$r.length;
            mapPool[c] = currMap[c];
            currMap[c] = null;
            delete currMap[c];
        }
        _curLayer!.tiledMapCurr = mapPool;
        _curLayer!.tiledMapPool = currMap;
        _fillCount = 0;
    }
}

function reset (): void {
    textureMat.mat = null;
    if (textureEnd > 0) {
        textureList.length = 0;
        _texMap = {};
        textureStart = textureEnd = 0;
    }
}
