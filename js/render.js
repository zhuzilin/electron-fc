"use strict";

const {
    WIDTH, HEIGHT, SPRITE_COUNT,
    PPU2000_SpTabl,
    PPU2000_Sp8x16,
    MASTER_CYCLE_PER_CPU,
    PPU2002_VBlank,
    PPU2000_NMIGen,
    PPU2002_Sp0Hit,
    PPU2000_BgTabl,
} = require('./const');

const { operation_NMI } = require('./6502');

let palette_data = new Uint8Array(32);

function bg_get_pixel(x, y, background, bi, nt, bg, banks) {
    // 获取所在名称表
    const id = (x >> 3) + (y >> 3) * 32;
    const name = banks[Math.floor((nt + id) / 1024)][(nt + id) % 1024];
    // 查找对应图样表
    const nowp0 = bg + name * 16;
    const nowp1 = nowp0 + 8;
    // Y坐标为平面内偏移
    const p0 = banks[Math.floor((nowp0 + (y & 0x7)) / 1024)][(nowp0 + (y & 0x7)) % 1024];
    const p1 = banks[Math.floor((nowp1 + (y & 0x7)) / 1024)][(nowp1 + (y & 0x7)) % 1024];
    // X坐标为字节内偏移
    const shift = (~x) & 0x7;
    const mask = 1 << shift;
    // 背景检测
    background[bi] = ((p0 & mask) >> shift) | ((p1 & mask) >> shift);
    // 计算低二位
    const low = ((p0 & mask) >> shift) | ((p1 & mask) >> shift << 1);
    // 计算所在属性表
    const aid = (x >> 5) + (y >> 5) * 8;
    const attr = banks[Math.floor((nt + aid + (32 * 30)) / 1024)][(nt + aid + (32 * 30)) % 1024];
    // 获取属性表内位偏移
    const aoffset = ((x & 0x10) >> 3) | ((y & 0x10) >> 2);
    // 计算高两位
    const high = (attr & (3 << aoffset)) >> aoffset << 2;
    // 合并作为颜色
    return palette_data[high | low];
}


function render_background_scanline(fc, line, sppbuffer, buffer, buffer_offset) {
    let background_hittest = new Uint8Array(WIDTH + 8);
    // 计算当前偏移量
    const scrollx = fc.ppu.scroll[0] + ((fc.ppu.nametable_select & 1) << 8);
    const scrolly = fc.ppu.scroll[1];
    // 在扫描期间写入调色板数据是合法的
    for (let i = 0; i !== 16; ++i) {
        palette_data[i] = fc.ppu.spindexes[i];
    }
    palette_data[4 * 1] = palette_data[0];
    palette_data[4 * 2] = palette_data[0];
    palette_data[4 * 3] = palette_data[0];
    // 计算背景所使用的图样表
    const pattern = (fc.ppu.ctrl & PPU2000_BgTabl ? 4 : 0) * 1024;
    // 检测垂直偏移量确定使用图案表的前一半[8-9]还是后一半[10-11]

    // 目前假定使用前一半
    const table = 8 * 1024;
    // 扫描该行像素
    for (let i = 0; i !== 0x100; ++i) {
        const realx = scrollx + i;
        const realy = scrolly + line;
        const nt = table + ((realx >> 8) & 1) * 1024;
        buffer[buffer_offset + i] = bg_get_pixel(realx & 0xff, realy & 0xff, background_hittest, i, nt, pattern, fc.ppu.banks);
    }
    // 基于行的精灵0命中测试

    if (fc.ppu.status & PPU2002_Sp0Hit)
        return;
    // 精灵#0的数据
    const yyyyy = fc.ppu.sprites[0] + 1;
    if (yyyyy <= line && yyyyy + 8 > line ) {
        // 避免越界
        for(let i=0; i<8; i++)
            background_hittest[32 * 8  + i] = 0;
        // X = 255时 不做检测
        background_hittest[255] = 0;

        const xxxxx = fc.ppu.sprites[3];
        const index = fc.ppu.sprites[1];
        let hittest = 0;
        for (let i = xxxxx; i !== xxxxx + 8; ++i) {
            hittest <<= 1;
            hittest |= background_hittest[i];
        }
        const spp = sppbuffer[index & 1];
        const nowp0 = spp + (index & 0xfe) * 16;
        const nowp1 = nowp0 + 8;
        const sphit = fc.ppu.banks[Math.floor((nowp0 + line - yyyyy) / 1024)][(nowp0 + line - yyyyy) % 1024] |
            fc.ppu.banks[Math.floor((nowp1 + line - yyyyy) / 1024)][(nowp1 + line - yyyyy) % 1024]
        if (sphit & hittest)
            fc.ppu.status |= PPU2002_Sp0Hit;
    }
}


/// SFCs the sprite expand 8.
function sprite_expand_8_on(p0, p1, high, buffer, offset) {
    // 0 - D7
    const low0 = ((p0 & 0x80) >> 6) | ((p1 & 0x80) >> 5);
    if (low0) buffer[offset + 0] = palette_data[(high | low0) >> 1];
    // 1 - D6
    const low1 = ((p0 & 0x40) >> 5) | ((p1 & 0x40) >> 4);
    if (low1) buffer[offset + 1] = palette_data[(high | low1) >> 1];
    // 2 - D5
    const low2 = ((p0 & 0x20) >> 4) | ((p1 & 0x20) >> 3);
    if (low2) buffer[offset + 2] = palette_data[(high | low2) >> 1];
    // 3 - D4
    const low3 = ((p0 & 0x10) >> 3) | ((p1 & 0x10) >> 2);
    if (low3) buffer[offset + 3] = palette_data[(high | low3) >> 1];
    // 4 - D3
    const low4 = ((p0 & 0x08) >> 2) | ((p1 & 0x08) >> 1);
    if (low4) buffer[offset + 4] = palette_data[(high | low4) >> 1];
    // 5 - D2
    const low5 = ((p0 & 0x04) >> 1) | ((p1 & 0x04) >> 0);
    if (low5) buffer[offset + 5] = palette_data[(high | low5) >> 1];
    // 6 - D1
    const low6 = ((p0 & 0x02) >> 0) | ((p1 & 0x02) << 1);
    if (low6) buffer[offset + 6] = palette_data[(high | low6) >> 1];
    // 7 - D0
    const low7 = ((p0 & 0x01) << 1) | ((p1 & 0x01) << 2);
    if (low7) buffer[offset + 7] = palette_data[(high | low7) >> 1];
}


/// SFCs the sprite expand 8.
function sprite_expand_8_op(p0, p1, high, buffer, offset) {
    // 0 - D7
    const low0 = ((p0 & 0x80) >> 6) | ((p1 & 0x80) >> 5);
    if (~buffer[offset + 0] & 1) buffer[offset + 0] = palette_data[(high | low0) >> 1];
    // 1 - D6
    const low1 = ((p0 & 0x40) >> 5) | ((p1 & 0x40) >> 4);
    if (~buffer[offset + 1] & 1) buffer[offset + 1] = palette_data[(high | low1) >> 1];
    // 2 - D5
    const low2 = ((p0 & 0x20) >> 4) | ((p1 & 0x20) >> 3);
    if (~buffer[offset + 2] & 1) buffer[offset + 2] = palette_data[(high | low2) >> 1];
    // 3 - D4
    const low3 = ((p0 & 0x10) >> 3) | ((p1 & 0x10) >> 2);
    if (~buffer[offset + 3] & 1) buffer[offset + 3] = palette_data[(high | low3) >> 1];
    // 4 - D3
    const low4 = ((p0 & 0x08) >> 2) | ((p1 & 0x08) >> 1);
    if (~buffer[offset + 4] & 1) buffer[offset + 4] = palette_data[(high | low4) >> 1];
    // 5 - D2
    const low5 = ((p0 & 0x04) >> 1) | ((p1 & 0x04) >> 0);
    if (~buffer[offset + 5] & 1) buffer[offset + 5] = palette_data[(high | low5) >> 1];
    // 6 - D1
    const low6 = ((p0 & 0x02) >> 0) | ((p1 & 0x02) << 1);
    if (~buffer[offset + 6] & 1) buffer[offset + 6] = palette_data[(high | low6) >> 1];
    // 7 - D0
    const low7 = ((p0 & 0x01) << 1) | ((p1 & 0x01) << 2);
    if (~buffer[offset + 7] & 1) buffer[offset + 7] = palette_data[(high | low7) >> 1];
}


/// SFCs the sprite expand 8.
function sprite_expand_8_rn(p0, p1, high, buffer, offset) {
    // 7 - D7
    const low0 = ((p0 & 0x80) >> 6) | ((p1 & 0x80) >> 5);
    if (low0) buffer[offset + 7] = palette_data[(high | low0) >> 1];
    // 6 - D6
    const low1 = ((p0 & 0x40) >> 5) | ((p1 & 0x40) >> 4);
    if (low1) buffer[offset + 6] = palette_data[(high | low1) >> 1];
    // 5 - D5
    const low2 = ((p0 & 0x20) >> 4) | ((p1 & 0x20) >> 3);
    if (low2) buffer[offset + 5] = palette_data[(high | low2) >> 1];
    // 4 - D4
    const low3 = ((p0 & 0x10) >> 3) | ((p1 & 0x10) >> 2);
    if (low3) buffer[offset + 4] = palette_data[(high | low3) >> 1];
    // 3 - D3
    const low4 = ((p0 & 0x08) >> 2) | ((p1 & 0x08) >> 1);
    if (low4) buffer[offset + 3] = palette_data[(high | low4) >> 1];
    // 2 - D2
    const low5 = ((p0 & 0x04) >> 1) | ((p1 & 0x04) >> 0);
    if (low5) buffer[offset + 2] = palette_data[(high | low5) >> 1];
    // 1 - D1
    const low6 = ((p0 & 0x02) >> 0) | ((p1 & 0x02) << 1);
    if (low6) buffer[offset + 1] = palette_data[(high | low6) >> 1];
    // 0 - D0
    const low7 = ((p0 & 0x01) << 1) | ((p1 & 0x01) << 2);
    if (low7) buffer[offset + 0] = palette_data[(high | low7) >> 1];
}


/// SFCs the sprite expand 8.
function sprite_expand_8_rp(p0, p1, high, buffer, offset) {
    // 7 - D7
    const low0 = ((p0 & 0x80) >> 6) | ((p1 & 0x80) >> 5);
    if (~buffer[offset + 7] & 1) buffer[offset + 7] = palette_data[(high | low0) >> 1];
    // 6 - D6
    const low1 = ((p0 & 0x40) >> 5) | ((p1 & 0x40) >> 4);
    if (~buffer[offset + 6] & 1) buffer[offset + 6] = palette_data[(high | low1) >> 1];
    // 5 - D5
    const low2 = ((p0 & 0x20) >> 4) | ((p1 & 0x20) >> 3);
    if (~buffer[offset + 5] & 1) buffer[offset + 5] = palette_data[(high | low2) >> 1];
    // 4 - D4
    const low3 = ((p0 & 0x10) >> 3) | ((p1 & 0x10) >> 2);
    if (~buffer[offset + 4] & 1) buffer[offset + 4] = palette_data[(high | low3) >> 1];
    // 3 - D3
    const low4 = ((p0 & 0x08) >> 2) | ((p1 & 0x08) >> 1);
    if (~buffer[offset + 3] & 1) buffer[offset + 3] = palette_data[(high | low4) >> 1];
    // 2 - D2
    const low5 = ((p0 & 0x04) >> 1) | ((p1 & 0x04) >> 0);
    if (~buffer[offset + 2] & 1) buffer[offset + 2] = palette_data[(high | low5) >> 1];
    // 1 - D1
    const low6 = ((p0 & 0x02) >> 0) | ((p1 & 0x02) << 1);
    if (~buffer[offset + 1] & 1) buffer[offset + 1] = palette_data[(high | low6) >> 1];
    // 0 - D0
    const low7 = ((p0 & 0x01) << 1) | ((p1 & 0x01) << 2);
    if (~buffer[offset + 0] & 1) buffer[offset + 0] = palette_data[(high | low7) >> 1];
}

/// <summary>
/// SFCs the render frame.
/// </summary>
/// <param name="fc">The fc.</param>
function render_frame(fc, buffer) {
    const SCAN_LINE_COUNT = HEIGHT;

    let buffer_offset = 0;
    //const uint16_t visible_line = fc.config.visible_scanline;
    const vblank_line = fc.config.vblank_scanline;
    const per_scanline = fc.config.master_cycle_per_scanline;
    let end_cycle_count = 0;

    // 精灵使用的图样板
    const sp8x16 = (fc.ppu.ctrl & PPU2000_Sp8x16) >> 2;

    const sppbuffer = new Array(2);
    sppbuffer[0] = sp8x16 ? 0 * 1024 : (fc.ppu.ctrl & PPU2000_SpTabl ? 4 : 0) * 1024;
    sppbuffer[1] = sp8x16 ? 4 * 1024 : sppbuffer[0] + 16;

    // 预渲染

    // 渲染
    for (let i = 0; i !== SCAN_LINE_COUNT; ++i) {
        end_cycle_count += per_scanline;
        const end_cycle_count_this_round = Math.floor(end_cycle_count / MASTER_CYCLE_PER_CPU);
        // 执行CPU
        for (; fc.cpu_cycle_count < end_cycle_count_this_round;)
            fc.cpu_execute_one();
        // 渲染背景
        render_background_scanline(fc, i, sppbuffer, buffer, buffer_offset);
        buffer_offset += 256;
        // 执行HBlank
    }
    // 后渲染


    // 垂直空白期间

    // 开始
    fc.ppu.status |= PPU2002_VBlank;
    if (fc.ppu.ctrl & PPU2000_NMIGen) {
        operation_NMI(fc);
    }
    // 执行
    for (let i = 0; i !== vblank_line; ++i) {
        end_cycle_count += per_scanline;
        const end_cycle_count_this_round = Math.floor(end_cycle_count / MASTER_CYCLE_PER_CPU);
        for (; fc.cpu_cycle_count < end_cycle_count_this_round;)
            fc.cpu_execute_one();
    }
    // 结束
    fc.ppu.status = 0;

    // 预渲染
    end_cycle_count += per_scanline * 2;
    // 最后一次保证是偶数(DMA使用)
    const end_cycle_count_this_round = Math.floor(end_cycle_count / MASTER_CYCLE_PER_CPU) & ~1;
    for (; fc.cpu_cycle_count < end_cycle_count_this_round;)
        fc.cpu_execute_one();


    // 清除计数器
    fc.cpu_cycle_count -= end_cycle_count_this_round;

    // 生成调色板颜色
    //memset(data, 0, 256 * 240 * 4);
    {
        for (let i = 0; i != 32; ++i) {
            palette_data[i] = fc.ppu.spindexes[i];
        }
        palette_data[4 * 1] = palette_data[0];
        palette_data[4 * 2] = palette_data[0];
        palette_data[4 * 3] = palette_data[0];
        palette_data[4 * 4] = palette_data[0];
        palette_data[4 * 5] = palette_data[0];
        palette_data[4 * 6] = palette_data[0];
        palette_data[4 * 7] = palette_data[0];
    }

    //LARGE_INTEGER t0, t1;
    //QueryPerformanceCounter(&t0);
    

    for (let i = SPRITE_COUNT - 1; i !== -1; --i) {
        const yy = fc.ppu.sprites[i*4 + 0];
        if (yy >= 0xef) continue;
        const ii = fc.ppu.sprites[i*4 + 1];
        const aa = fc.ppu.sprites[i*4 + 2];
        const xx = fc.ppu.sprites[i*4 + 3];
        // 查找对应图样表
        const spp = sppbuffer[ii & 1];
        const nowp0 = spp + (ii & 0xfe) * 16;  // TODO, sprite可以选择两个
        const nowp1 = nowp0 + 8;
        const high = ((aa & 3) | 4) << 3;
        // 水平翻转
        // TODO vertical and priority
        let write = xx + (yy + 1) * WIDTH;
        switch (((aa >> 5) | sp8x16) & 0x0f) {
            case 0x8:
                // 1000: 8x16 前
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j + 16) / 1024)][(nowp0 + j + 16) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j + 16) / 1024)][(nowp1 + j + 16) % 1024];
                    sprite_expand_8_on(p0, p1, high, buffer, write + WIDTH * (j + 8));
                }
                // fall through
            case 0x0:
                // 0000: 前
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_on(p0, p1, high, buffer, write + WIDTH * j);
                }
                break;
            case 0x9:
                // 1001: 8x16 后
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j + 16) / 1024)][(nowp0 + j + 16) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j + 16) / 1024)][(nowp1 + j + 16) % 1024];
                    sprite_expand_8_op(p0, p1, high, buffer, write + WIDTH * (j + 8));
                }
                // fall through
            case 0x1:
                // 0001: 后
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_op(p0, p1, high, buffer, write + WIDTH * j);
                }
                break;
            case 0xA:
                // 1010: 8x16 水平翻转 前 
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j + 16) / 1024)][(nowp0 + j + 16) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j + 16) / 1024)][(nowp1 + j + 16) % 1024];
                    sprite_expand_8_rn(p0, p1, high, buffer, write + WIDTH * (j + 8));
                }
                // fall through
            case 0x2:
                // 0010: 水平翻转 前 
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_rn(p0, p1, high, buffer, write + WIDTH * j);
                }
                break;
            case 0xB:
                // 1011: 8x16 水平翻转 后
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j + 16) / 1024)][(nowp0 + j + 16) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j + 16) / 1024)][(nowp1 + j + 16) % 1024];
                    sprite_expand_8_rp(p0, p1, high, buffer, write + WIDTH * (j + 8));
                }
                // fall through
            case 0x3:
                // 0011: 水平翻转 后
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_rp(p0, p1, high, buffer, write + WIDTH * j);
                }
                break;
            case 0xC:
                // 1100: 8x16 垂直翻转 前
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j + 16) / 1024)][(nowp0 + j + 16) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j + 16) / 1024)][(nowp1 + j + 16) % 1024];
                    sprite_expand_8_on(p0, p1, high, buffer, write + WIDTH * (7 - j));
                }
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_on(p0, p1, high, buffer, write + WIDTH * (15 - j));
                }
                break;
            case 0x4:
                // 0100: 垂直翻转 前 
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_on(p0, p1, high, buffer, write + WIDTH * (7 - j));
                }
                break;
            case 0xD:
                // 1101: 8x16 垂直翻转 后
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j + 16) / 1024)][(nowp0 + j + 16) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j + 16) / 1024)][(nowp1 + j + 16) % 1024];
                    sprite_expand_8_op(p0, p1, high, buffer, write + WIDTH * (7 - j));
                }
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_op(p0, p1, high, buffer, write + WIDTH * (15 - j));
                }
                break;
            case 0x5:
                // 0101: 垂直翻转 后
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_op(p0, p1, high, buffer, write + WIDTH * (7 - j));
                }
                break;
            case 0xE: 
                // 1110: 8x16 垂直翻转 水平翻转 前 
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j + 16) / 1024)][(nowp0 + j + 16) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j + 16) / 1024)][(nowp1 + j + 16) % 1024];
                    sprite_expand_8_rn(p0, p1, high, buffer, write + WIDTH * (7 - j));
                }
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_rn(p0, p1, high, buffer, write + WIDTH * (15 - j));
                }
                break;
            case 0x6:
                // 0110: 8x16 垂直翻转 水平翻转 前 
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_rn(p0, p1, high, buffer, write + WIDTH * (7 - j));
                }
                break;
            case 0xF:
                // 1111: 8x16 垂直翻转 水平翻转 后
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j + 16) / 1024)][(nowp0 + j + 16) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j + 16) / 1024)][(nowp1 + j + 16) % 1024];
                    sprite_expand_8_rp(p0, p1, high, buffer, write + WIDTH * (7 - j));
                }
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_rp(p0, p1, high, buffer, write + WIDTH * (15 - j));
                }
                break;
            case 0x7:
                // 0111: 垂直翻转 水平翻转 后
                for (let j = 0; j != 8; ++j) {
                    let p0 = fc.ppu.banks[Math.floor((nowp0 + j) / 1024)][(nowp0 + j) % 1024];
                    let p1 = fc.ppu.banks[Math.floor((nowp1 + j) / 1024)][(nowp1 + j) % 1024];
                    sprite_expand_8_rp(p0, p1, high, buffer, write + WIDTH * (7 - j));
                }
                break;
        }
    }
    
}

module.exports.render_frame = render_frame;