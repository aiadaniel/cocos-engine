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
import { TiledLayer, XTiledRenderData, TiledTile, TiledMap, bmap } from '..';
import { GID, MixedGID, TiledGrid, TileFlag } from '../xtiled-types';
import { director, Director } from '../../game';
import { StaticVBAccessor } from '../../2d/renderer/static-vb-accessor';
import { vfmtPosUvColor } from '../../2d/renderer/vertex-format';
import { RenderData } from '../../2d/renderer/render-data';
import { RenderDrawInfoType } from '../../2d/renderer/render-draw-info';
import { Texture2D } from '../../asset/assets';
import { Node } from '../../scene-graph';
import { SpriteFrame } from '../../2d';
import { TextureBase } from '../../asset/assets/texture-base';

const MaxGridsLimit = Math.ceil(65535 / 6);

const vec3_temps: Vec3[] = [];
for (let i = 0; i < 4; i++) {
    vec3_temps.push(new Vec3());
}

const _mat4_temp = new Mat4();
const _vec3u_temp = new Vec3();
const _leftDown = { row: 0, col: 0 };
let _uva = { x: 0, y: 0 };
let _uvb = { x: 0, y: 0 };
let _uvc = { x: 0, y: 0 };
let _uvd = { x: 0, y: 0 };

let _vfOffset = 0;
let _moveX = 0;
let _moveY = 0;
let YZr = 0;// t.leftDownToCenterX,
let qZr = 0;//t.leftDownToCenterY,

let e$r = 0;
let h$r = 0;

let n$r = new Array(300);
let r$r = 0;

let t$r: SpriteFrame | TextureBase | null;

let zZr: any[] = [];

let _fillCount = 0;
let _curTexture : Texture2D | null = null;
let _tempBuffers : Float32Array;
let _curLayer: TiledLayer;
let i$r : TiledLayer|null;
let $Zr : TiledMap | null;
let o$r = {
    mat: null,
};
let s$r;
let KZr = 0;

let flipTexture: (grid: TiledGrid, gid: MixedGID) => void;

let _accessor: StaticVBAccessor = null!;
/**
 * simple 组装器
 * 可通过 `UI.simple` 获取该组装器。
 */
export const simple: IAssembler = {
    ensureAccessor () {
        if (!_accessor) {
            const device = director.root!.device;
            // const batcher = director.root!.batcher2D;
            _accessor = new StaticVBAccessor(device, vfmtPosUvColor, this.vCount);
            //batcher.registerBufferAccessor(Number.parseInt('TILED-MAP', 36), _accessor);
            director.on(Director.EVENT_BEFORE_DRAW, () => {
                _accessor.reset();
            });
        }
    },

    createData (layer: TiledLayer) {
        ($Zr = null),//TiledMap
            !(KZr = globalThis.multMat_maxUnits) ||
                zZr ||
                ((zZr = []), director.on(Director.EVENT_BEFORE_DRAW, FSr));
        if (JSB) {
            console.log("createData in tileassembler");
            this.ensureAccessor();
        }
    },

    //02 batch2d.ts(commitComp->assembler.fillBiffers) <=组件的_render(此处是tiledlayer) <==ui-renderer.ts/ui-mesh-renderer.ts(fillBuffers) <===batcher-2d.ts(walk) <== root.ts(framemove)
    fillBuffers (t: TiledLayer /*layer: TiledLayer, renderer: IBatcher*/) {
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
        var i, n, r, s, e, h;
        if (
            ((s = (h = (i = t.currRenderData).chunk.meshBuffer).indexOffset),
            (r = h.indexOffset + 1.5 * i.vertexCount),
            (e = h.iData),
            (n = i.chunk.vertexOffset),
            i.meshBufferOffset != s || i.meshFinishOffset != r || e[s] != n)
        )
            for (i.meshBufferOffset = s, i.meshFinishOffset = r; s < r; )
                (e[s++] = n),
                    (e[s++] = ++n),
                    (e[s++] = ++n),
                    (e[s++] = n),
                    (e[s++] = n++ - 1),
                    (e[s++] = n++);
        h.indexOffset = r;
    },

    //01 ui-renderer.ts updateRenderer <= ui-renderer-manager.ts
    updateRenderData (t: TiledLayer) {
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
        if (t.isUserNodeDirty()) {
            var i, n, r;
            switch (
                ((YZr = t.leftDownToCenterX),
                (qZr = t.leftDownToCenterY),
                (n = (r = t.cullingRect).leftDown),
                (i = r.rightTop),
                t.destroyRenderData(),
                (i$r = t).renderOrder)
            ) {
                case bmap.RenderOrder.RightDown:
                    traverseGrids(n, i, -1, 1, t);
                    break;
                case bmap.RenderOrder.LeftDown:
                    traverseGrids(n, i, -1, -1, t);
                    break;
                case bmap.RenderOrder.RightUp:
                    traverseGrids(n, i, 1, 1, t);
                    break;
                default:
                    traverseGrids(n, i, 1, -1, t);
            }
            (i$r = null), t.setUserNodeDirty(!1);
        }
    },

    // ui-renderer.ts _updateColor <= setColor
    updateColor (tiled: TiledLayer) {
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
    },
};

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
function traverseGrids (t, i, n, r, e: TiledLayer): void {
        var h, o, u, a, c, f, l, v, d, _, p, w, A, m, E, T, g, S, M, C, R, y, I, b, O, P, D; 
        if ( (
            (r$r = 0), 
            e.tiledMapCurr?.clear && ((e.tiledMapCurr = {}), (e.tiledMapPool = {})), 
            (c = e.isGroundLayer), 
            (w = (f = e.node.worldPosition).x), 
            (E = f.y), 
            (p = e.texGrids), 
            (A = e.tiles), 
            (y = e.vertices), 
            (S = e.hasUserNode), 
            (O = e.downRow), 
            (d = 0 != (null == (D = e._offset) ? void 0 : D.y) ? 1 : 0), 
            (C = 0), 
            (v = -1 === n ? ((_ = i.row + d), t.row - O + d) : ((_ = t.row - O + d), i.row + d)), 
            (I = ( 1 === r ? ((o = t.col), i) : ((o = i.col), t) ).col), 
            (R = 0), 
            S) ) 
            for (var B = i.row + e.nodeDownRow; B > i.row; --B) 
                QTr(e.getSorttedNodesByRow(B)); 
            for (; 0 <= (v - _) * n; _ += n) { 
                if ((m = y[_])) 
                    for (R = o; R <= I; R += r) 
                        if ((M = m[R])) { 
                            var L, N, F, U, k, G, V, H, W, j, X, z, Y, q, Q, J; 
                            if (0 == (g = A[M.index])) 
                                continue; 
                            if ( !(l = p.get((g & TileFlag.FLIPPED_MASK) >>> 0)) ) //vZr
                                continue; 
                            if ( !(Q = null == (h = l.spriteFrame) ? void 0 : h.texture) ) { 
                                if ((e.loadTileMapImage(l.tileset, p, S), !$Zr)) 
                                    continue; 
                                (Q = $Zr.spriteFrame.texture), 
                                (l = $Zr); 
                            } 
                            if ( (t$r !== Q && 
                                (!S && KZr 
                                    ? (C == KZr - 1 && (ySr(!1), FSr()), 
                                        (C = (function (t) { 
                                            var i, n; 
                                            return ( (n = t.getId()), 
                                                null != (i = s$r[n]) ? i : ((zZr[ e$r ] = t), ((s$r = e$r % KZr == 0 ? {} : s$r)[ n ] = e$r++)) 
                                            ); 
                                        })(Q))) 
                                    : ySr(!0), (t$r = Q), c) && ($Zr = l), 
                                (q = 10000 * _ + R), 
                                (L = e.tiledMapCurr), 
                                (Y = e.tiledMapPool), 
                                !(X = L[q]) && Y[q] && ((X = Y[q]), (L[q] = X), (Y[q] = null), delete Y[q]), 
                                X) ) { 
                                    X[2] != C && ((X[2] = C), (X[11] = C), (X[20] = C), (X[29] = C)), 
                                    (n$r[r$r++] = q); 
                                    continue; 
                                } 
                                for (z in Y) { 
                                    (X = Y[z]), 
                                    (Y[z] = null), 
                                    delete Y[z]; 
                                    break; 
                                } 
                                if ( ((X = X || new Float32Array(36)), 
                                    (L[q] = X), 
                                    (n$r[r$r++] = q), 
                                    (T = l.tileset._tileSize), 
                                    (a = w + M.left - YZr), 
                                    (u = E + M.bottom - qZr), 
                                    (b = a + T.width), 
                                    (P = u + T.height), 
                                    (X[0] = a), 
                                    (X[1] = P), 
                                    (X[9] = a), 
                                    (X[10] = u), 
                                    (X[18] = b), 
                                    (X[19] = P), 
                                    (X[27] = b), 
                                    (X[28] = u), 
                                    X[2] != C && ((X[2] = C), (X[11] = C), (X[20] = C), (X[29] = C)), 
                                    1 != X[8]) ) 
                                    for ( var Z = 5; Z < 36; Z += 5 ) 
                                        (X[Z++] = 1), 
                                        (X[Z++] = 1), 
                                        (X[Z++] = 1), 
                                        (X[Z++] = 1); 
                                        (V = (F = l).r), 
                                        (J = F.t), 
                                        (U = j = F.l), 
                                        (N = k = F.b), 
                                        (W = V), 
                                        (H = J), 
                                        (G = void 0), 
                                        (g & TileFlag.HORIZONTAL) >>> 0 && (
                                            (G = j), 
                                            (j = W), 
                                            (W = G), 
                                            (G = J), 
                                            (J = H), 
                                            (H = G), 
                                            (G = U), 
                                            (U = V), 
                                            (V = G), 
                                            (G = N), 
                                            (N = k), 
                                            (k = G)), 
                                        (g & TileFlag.VERTICAL) >>> 0 && (
                                            (G = j), 
                                            (j = U), 
                                            (U = G), 
                                            (G = J), 
                                            (J = N), 
                                            (N = G), 
                                            (G = W), 
                                            (W = V), 
                                            (V = G), 
                                            (G = H), 
                                            (H = k), 
                                            (k = G)), 
                                        l._rotated ? (
                                                (X[3] = W), 
                                                (X[4] = H), 
                                                (X[12] = j), 
                                                (X[13] = J), 
                                                (X[21] = V), 
                                                (X[22] = k), 
                                                (X[30] = U), 
                                                (X[31] = N)) 
                                            : 
                                            (
                                                (X[3] = j), 
                                                (X[4] = J), 
                                                (X[12] = U), 
                                                (X[13] = N), 
                                                (X[21] = W), 
                                                (X[22] = H), 
                                                (X[30] = V), 
                                                (X[31] = k)); 
                        } 
                S && QTr(e.getSorttedNodesByRow(_, !0)); 
            } 
            if (S) 
                for ( 
                    var $ = t.row - O - 1, 
                        tt = t.row - e.nodeUpRow; 
                    tt < $; --$ ) 
                    QTr(e.getSorttedNodesByRow($)); 
            ySr(S); 
    }

function fillByTiledNode (tiledNode: Node, color: Float32Array, vbuf: Float32Array,
    left: number, right: number, top: number, bottom: number, diamondTile: boolean): void {
    const vertStep = 9;
    const vertStep2 = vertStep * 2;
    const vertStep3 = vertStep * 3;

    tiledNode.updateWorldTransform();
    Mat4.fromRTS(_mat4_temp, tiledNode.rotation, tiledNode.position, tiledNode.scale);
    Vec3.set(_vec3u_temp, -(left + _moveX), -(bottom + _moveY), 0);
    Mat4.transform(_mat4_temp, _mat4_temp, _vec3u_temp);
    Mat4.multiply(_mat4_temp, tiledNode.parent!.worldMatrix, _mat4_temp);

    const m = _mat4_temp;
    const tx = m.m12;
    const ty = m.m13;

    const a = m.m00;
    const b = m.m01;
    const c = m.m04;
    const d = m.m05;

    const justTranslate = a === 1 && b === 0 && c === 0 && d === 1;

    if (diamondTile) {
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        if (justTranslate) {
            // ct
            vbuf[_vfOffset] = centerX + tx;
            vbuf[_vfOffset + 1] = top + ty;

            // lc
            vbuf[_vfOffset + vertStep] = left + tx;
            vbuf[_vfOffset + vertStep + 1] = centerY + ty;

            // rc
            vbuf[_vfOffset + vertStep2] = right + tx;
            vbuf[_vfOffset + vertStep2 + 1] = centerY + ty;

            // cb
            vbuf[_vfOffset + vertStep3] = centerX + tx;
            vbuf[_vfOffset + vertStep3 + 1] = bottom + ty;
        } else {
            // ct
            vbuf[_vfOffset] = centerX * a + top * c + tx;
            vbuf[_vfOffset + 1] = centerX * b + top * d + ty;

            // lc
            vbuf[_vfOffset + vertStep] = left * a + centerY * c + tx;
            vbuf[_vfOffset + vertStep + 1] = left * b + centerY * d + ty;

            // rc
            vbuf[_vfOffset + vertStep2] = right * a + centerY * c + tx;
            vbuf[_vfOffset + vertStep2 + 1] = right * b + centerY * d + ty;

            // cb
            vbuf[_vfOffset + vertStep3] = centerX * a + bottom * c + tx;
            vbuf[_vfOffset + vertStep3 + 1] = centerX * b + bottom * d + ty;
        }
    } else if (justTranslate) {
        vbuf[_vfOffset] = left + tx;
        vbuf[_vfOffset + 1] = top + ty;

        vbuf[_vfOffset + vertStep] = left + tx;
        vbuf[_vfOffset + vertStep + 1] = bottom + ty;

        vbuf[_vfOffset + vertStep2] = right + tx;
        vbuf[_vfOffset + vertStep2 + 1] = top + ty;

        vbuf[_vfOffset + vertStep3] = right + tx;
        vbuf[_vfOffset + vertStep3 + 1] = bottom + ty;
    } else {
        // lt
        vbuf[_vfOffset] = left * a + top * c + tx;
        vbuf[_vfOffset + 1] = left * b + top * d + ty;

        // lb
        vbuf[_vfOffset + vertStep] = left * a + bottom * c + tx;
        vbuf[_vfOffset + vertStep + 1] = left * b + bottom * d + ty;

        // rt
        vbuf[_vfOffset + vertStep2] = right * a + top * c + tx;
        vbuf[_vfOffset + vertStep2 + 1] = right * b + top * d + ty;

        // rb
        vbuf[_vfOffset + vertStep3] = right * a + bottom * c + tx;
        vbuf[_vfOffset + vertStep3 + 1] = right * b + bottom * d + ty;
    }

    vbuf.set(color, _vfOffset + 5);
    vbuf.set(color, _vfOffset + vertStep + 5);
    vbuf.set(color, _vfOffset + vertStep2 + 5);
    vbuf.set(color, _vfOffset + vertStep3 + 5);
}

function QTr (t) {
    t && (ySr(!0), i$r!.requestSubNodesData(t)); 
}
function ySr (t) { 
    if (0 < r$r && t$r) { 
        var i:RenderData; 
        (i = i$r!.requestTiledRenderData()).reuse(r$r), 
        KZr ? (i.frame = t$r) : (i.updateTexture(t$r), i.updateHash()), 
        t || !KZr 
            ? 0 < e$r && FSr() 
            : (
                (i.textureInfo = { textureList: zZr, textureStart: h$r, textureEnd: e$r - 1, textureMat: o$r }), 
                (h$r = e$r)
            ), 
        (t$r = null); 
        for ( var n = i.chunk.vb, r = 0, s = i$r!.tiledMapCurr!, e = i$r!.tiledMapPool, h = 0; h < r$r; ++h ) 
            for (var o = s![n$r[h]], u = 0; u < 36; ++u) 
                n[r++] = o[u]; 
        for (var a = 0; a < r$r; ++a) { 
                var c; 
                (e[(c = n$r.length)] = s[c]), 
                (s[c] = null), 
                delete s[c]; 
        } 
        (i$r!.tiledMapCurr = e), 
        (i$r!.tiledMapPool = s), 
        (r$r = 0); 
    } 
}

function FSr () { 
    (o$r.mat = null), 
    0 < e$r && ((zZr.length = 0), (s$r = {}), (h$r = e$r = 0)); 
}

