/*
 Copyright (c) 2017-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

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

import { Color, Vec4 } from '../../../core';
import type { IBatcher } from '../../renderer/i-batcher';
import type { Label } from '../../components/label';
import type { IAssembler } from '../../renderer/base';
import { fillMeshVertices3D } from '../utils';
import { BmfontUtils } from './bmfontUtils';
import type { RenderData } from '../../renderer/render-data';

const tempColor = new Color(255, 255, 255, 255);
const _col = new Vec4();// lxm add

/**
 * bmfont 组装器
 * 可通过 `UI.bmfont` 获取该组装器。
 */
class Bmfont extends BmfontUtils implements IAssembler {
    createData (comp: Label): RenderData {
        const renderData = comp.requestRenderData();
        renderData.resize(0, 0);
        return renderData;
    }

    fillBuffers (comp: Label, renderer: IBatcher): void {
        const node = comp.node;
        // tempColor.set(comp.color);// lxm 移动到下面if内部
        // tempColor.a = node._uiProps.opacity * 255;
        // Fill All
        // fillMeshVertices3D(node, renderer, comp.renderData!, tempColor); // lxm delete 改成以下正部分，单独拿出来了
        const renderData = comp.renderData!;
        const chunk = renderData.chunk;
        const dataList = renderData.data;
        const vData = chunk.vb;
        const vertexCount = renderData.vertexCount;
        const m = node.worldMatrix;

        // lxm add 增加if判断
        if (node.hasChangedFlags || renderData.vertDirty) {
            renderData.vertDirty = false;// lxm add
            tempColor.set(comp.color);// lxm add
            tempColor.a = node._uiProps.opacity * 255;// lxm add

            const m00 = m.m00; const m01 = m.m01; const m02 = m.m02; const m03 = m.m03;
            const m04 = m.m04; const m05 = m.m05; const m06 = m.m06; const m07 = m.m07;
            const m12 = m.m12; const m13 = m.m13; const m14 = m.m14; const m15 = m.m15;

            // convert to 0 ~ 1
            _col.set(tempColor.r / 255, tempColor.g / 255, tempColor.b / 255, tempColor.a / 255);

            let vertexOffset = 0;
            for (let i = 0; i < vertexCount; ++i) {
                const vert = dataList[i];
                const x = vert.x;
                const y = vert.y;
                let rhw = m03 * x + m07 * y + m15;
                rhw = rhw ? 1 / rhw : 1;
                vData[vertexOffset + 0] = (m00 * x + m04 * y + m12) * rhw;
                vData[vertexOffset + 1] = (m01 * x + m05 * y + m13) * rhw;
                vData[vertexOffset + 2] = renderData.atlasIndex;//(m02 * x + m06 * y + m14) * rhw; lxm
                Vec4.toArray(vData, _col, vertexOffset + 5);
                vertexOffset += renderData.floatStride;
            }
        }

        // fill index data
        const bid = chunk.bufferId;
        let vid = chunk.vertexOffset;
        const meshBuffer = chunk.meshBuffer;
        const ib = chunk.meshBuffer.iData;
        let indexOffset = meshBuffer.indexOffset;
        // lxm 替换以下部分
        const u = indexOffset + 1.5 * vertexCount;
        if (renderData.meshBufferOffset !== indexOffset
            || renderData.meshFinishOffset !== u
            || ib[indexOffset] !== vid) {
            renderData.meshBufferOffset = indexOffset;
            renderData.meshFinishOffset = u;
            for (;indexOffset < u;) {
                ib[indexOffset++] = vid;
                ib[indexOffset++] = ++vid;
                ib[indexOffset++] = ++vid;
                ib[indexOffset++] = vid;
                ib[indexOffset++] = vid++ - 1;
                ib[indexOffset++] = vid++;
            }
        }
        meshBuffer.indexOffset = u;
        // for (let i = 0, count = vertexCount / 4; i < count; i++) {
        //     const start = vid + i * 4;
        //     ib[indexOffset++] = start;
        //     ib[indexOffset++] = start + 1;
        //     ib[indexOffset++] = start + 2;
        //     ib[indexOffset++] = start + 1;
        //     ib[indexOffset++] = start + 3;
        //     ib[indexOffset++] = start + 2;
        // }
        // meshBuffer.indexOffset += renderData.indexCount;
        // meshBuffer.setDirty();
    }
}

export const bmfont = new Bmfont();
