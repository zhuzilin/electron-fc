'use strict';
let assert = require('assert');
let {
    PPU2000_BgTabl,
    PPU2000_NMIGen,
    PPU2000_Sp8x16,
    PPU2000_VINC32,
    PPU2002_Sp0Hit,
    PPU2002_SpOver,
    PPU2002_VBlank,
    PPUFLAG_SpTabl,
    WIDTH,
    HEIGHT,
} = require('./const');
let { render_frame } = require('./render');
let stdpalette = [
    [ 0x7F, 0x7F, 0x7F, 0xFF ], [ 0x20, 0x00, 0xB0, 0xFF ], [ 0x28, 0x00, 0xB8, 0xFF ], [ 0x60, 0x10, 0xA0, 0xFF ],
    [ 0x98, 0x20, 0x78, 0xFF ], [ 0xB0, 0x10, 0x30, 0xFF ], [ 0xA0, 0x30, 0x00, 0xFF ], [ 0x78, 0x40, 0x00, 0xFF ],
    [ 0x48, 0x58, 0x00, 0xFF ], [ 0x38, 0x68, 0x00, 0xFF ], [ 0x38, 0x6C, 0x00, 0xFF ], [ 0x30, 0x60, 0x40, 0xFF ],
    [ 0x30, 0x50, 0x80, 0xFF ], [ 0x00, 0x00, 0x00, 0xFF ], [ 0x00, 0x00, 0x00, 0xFF ], [ 0x00, 0x00, 0x00, 0xFF ],

    [ 0xBC, 0xBC, 0xBC, 0xFF ], [ 0x40, 0x60, 0xF8, 0xFF ], [ 0x40, 0x40, 0xFF, 0xFF ], [ 0x90, 0x40, 0xF0, 0xFF ],
    [ 0xD8, 0x40, 0xC0, 0xFF ], [ 0xD8, 0x40, 0x60, 0xFF ], [ 0xE0, 0x50, 0x00, 0xFF ], [ 0xC0, 0x70, 0x00, 0xFF ],
    [ 0x88, 0x88, 0x00, 0xFF ], [ 0x50, 0xA0, 0x00, 0xFF ], [ 0x48, 0xA8, 0x10, 0xFF ], [ 0x48, 0xA0, 0x68, 0xFF ],
    [ 0x40, 0x90, 0xC0, 0xFF ], [ 0x00, 0x00, 0x00, 0xFF ], [ 0x00, 0x00, 0x00, 0xFF ], [ 0x00, 0x00, 0x00, 0xFF ],

    [ 0xFF, 0xFF, 0xFF, 0xFF ], [ 0x60, 0xA0, 0xFF, 0xFF ], [ 0x50, 0x80, 0xFF, 0xFF ], [ 0xA0, 0x70, 0xFF, 0xFF ],
    [ 0xF0, 0x60, 0xFF, 0xFF ], [ 0xFF, 0x60, 0xB0, 0xFF ], [ 0xFF, 0x78, 0x30, 0xFF ], [ 0xFF, 0xA0, 0x00, 0xFF ],
    [ 0xE8, 0xD0, 0x20, 0xFF ], [ 0x98, 0xE8, 0x00, 0xFF ], [ 0x70, 0xF0, 0x40, 0xFF ], [ 0x70, 0xE0, 0x90, 0xFF ],
    [ 0x60, 0xD0, 0xE0, 0xFF ], [ 0x60, 0x60, 0x60, 0xFF ], [ 0x00, 0x00, 0x00, 0xFF ], [ 0x00, 0x00, 0x00, 0xFF ],

    [ 0xFF, 0xFF, 0xFF, 0xFF ], [ 0x90, 0xD0, 0xFF, 0xFF ], [ 0xA0, 0xB8, 0xFF, 0xFF ], [ 0xC0, 0xB0, 0xFF, 0xFF ],
    [ 0xE0, 0xB0, 0xFF, 0xFF ], [ 0xFF, 0xB8, 0xE8, 0xFF ], [ 0xFF, 0xC8, 0xB8, 0xFF ], [ 0xFF, 0xD8, 0xA0, 0xFF ],
    [ 0xFF, 0xF0, 0x90, 0xFF ], [ 0xC8, 0xF0, 0x80, 0xFF ], [ 0xA0, 0xF0, 0xA0, 0xFF ], [ 0xA0, 0xFF, 0xC8, 0xFF ],
    [ 0xA0, 0xFF, 0xF0, 0xFF ], [ 0xA0, 0xA0, 0xA0, 0xFF ], [ 0x00, 0x00, 0x00, 0xFF ], [ 0x00, 0x00, 0x00, 0xFF ]
];

module.exports.stdpalette = stdpalette;

let ppu = {
    // 内存地址库
    banks: new Array(0x4000 / 0x0400),  // 每个里面都是uint8
    // 名称表选择(PPUCTRL低2位, 以及渲染中VRAM指针AB位)
    nametable_select: 0,  // uint8_t
    // VRAM 地址
    vramaddr: 0,  // uint16
    // 寄存器 PPUCTRL      @$2000
    ctrl: 0,  //uint8
    // 寄存器 PPUMASK      @$2001
    mask: 0,  // uint8
    // 寄存器 PPUSTATUS    @$2002
    status: 0,  // uint8
    // 寄存器 OAMADDR      @$2003
    oamaddr: 0, // uint8
    // 滚动偏移
    scroll: new Uint8Array(2),
    // 滚动偏移双写位置记录
    writex2: 0,  // uint8
    // 显存读取缓冲值
    pseudo: 0,  // uint8
    // 精灵调色板索引
    spindexes: new Uint8Array(0x20),
    // 精灵数据: 256B
    sprites: new Uint8Array(0x100),
};

ppu.read_ppu_address = (address) => {

};

ppu.read_ppu_address = (address) => {
    const real_address = address & 0x3fff;
    // 使用BANK读取
    if (real_address < 0x3F00) {
        const index = real_address >> 10;
        const offset = real_address & 0x3ff;
        assert(ppu.banks[index]);
        const data = ppu.pseudo;  // emulate the read buffer
        ppu.pseudo = ppu.banks[index][offset];
        return data;
    }
    // 调色板索引
    else {
        const underneath = (real_address - 0x1000) & 0xffff;
        const index = (real_address >> 10) & 0xffff;
        const offset = real_address & 0x3FF;
        assert(ppu.banks[index]);
        ppu.pseudo = ppu.banks[index][offset];
        // 读取调色板能返回即时值
        return ppu.spindexes[real_address & 0x1f];
    }
};

ppu.write_ppu_address = (address, data) => {
    const real_address = address & 0x3FFF;
    // 使用BANK写入
    if (real_address < 0x3F00) {
        const index = real_address >> 10;
        const offset = real_address & 0x3FF;
        assert(ppu.banks[index]);
        ppu.banks[index][offset] = data;
    }
    // 调色板索引
    else {
        // 独立地址
        if (real_address & 0x03) {
            ppu.spindexes[real_address & 0x1f] = data;
        }
        // 镜像$3F00/$3F04/$3F08/$3F0C
        else {
            const offset = real_address & 0x0f;
            ppu.spindexes[offset] = data;
            ppu.spindexes[offset | 0x10] = data;
        }
    }
};

ppu.read_ppu_register_via_cpu = (address) => {
    let data = 0x00;
    // 8字节镜像
    switch (address & 0x7) {
        case 0:
            // 0x2000: Controller ($2000) > write
            // 只写寄存器
            // fall through
        case 1:
            // 0x2001: Mask ($2001) > write
            // 只写寄存器
            assert(!"write only!");
            break;
        case 2:
            // 0x2002: Status ($2002) < read
            // 只读状态寄存器
            data = ppu.status;
            // 读取后会清除VBlank状态
            ppu.status &= ~PPU2002_VBlank;
            // wiki.nesdev.com/w/index.php/PPU_scrolling:  $2002 read
            ppu.writex2 = 0;
            break;
        case 3:
            // 0x2003: OAM address port ($2003) > write
            // 只写寄存器
            assert(!"write only!");
            break;
        case 4:
            // 0x2004: OAM data ($2004) <> read/write
            // 读写寄存器
            data = ppu.sprites[ppu.oamaddr];
            break;
        case 5:
            // 0x2005: Scroll ($2005) >> write x2
            // 双写寄存器
            // fall through
        case 6:
            // 0x2006: Address ($2006) >> write x2
            // 双写寄存器
            assert(!"write only!");
            break;
        case 7:
            // 0x2007: Data ($2007) <> read/write
            // PPU VRAM读写端口
            data = ppu.read_ppu_address(ppu.vramaddr);
            ppu.vramaddr += ((ppu.ctrl & PPU2000_VINC32) ? 32 : 1);
            ppu.vramaddr &= 0xffff;
            break;
    }
    return data;
};

ppu.write_ppu_register_via_cpu = (address, data) => {
    switch (address & 0x7)
    {
        case 0:
            // PPU 控制寄存器
            // 0x2000: Controller ($2000) > write
            ppu.ctrl = data;
            ppu.nametable_select = data & 3;
            break;
        case 1:
            // PPU 掩码寄存器
            // 0x2001: Mask ($2001) > write
            ppu.mask = data;
            break;
        case 2:
            // 0x2002: Status ($2002) < read
            // 只读
            assert(!"read only");
            break;
        case 3:
            // 0x2003: OAM address port ($2003) > write
            // PPU OAM 地址端口
            ppu.oamaddr = data;
            break;
        case 4:
            // 0x2004: OAM data ($2004) <> read/write
            // PPU OAM 数据端口
            ppu.sprites[ppu.oamaddr++] = data;
            ppu.oamaddr &= 0xff;
            break;
        case 5:
            // 0x2005: Scroll ($2005) >> write x2
            // PPU 滚动位置寄存器 - 双写
            ppu.scroll[ppu.writex2 & 1] = data;
            ++ppu.writex2;
            ppu.writex2 &= 0xff;
            break;
        case 6:
            // 0x2006: Address ($2006) >> write x2
            // PPU 地址寄存器 - 双写
            // 写入高字节
            if (ppu.writex2 & 1) {
                ppu.vramaddr = (ppu.vramaddr & 0xFF00) | data;
                ppu.nametable_select = (ppu.vramaddr >> 10) & 3;
            }
            // 写入低字节
            else {
                ppu.vramaddr = (ppu.vramaddr & 0x00FF) | (data << 8);
            }
            ++ppu.writex2;
            ppu.writex2 &= 0xff;
            break;
        case 7:
            // 0x2007: Data ($2007) <> read/write
            // PPU VRAM数据端
            ppu.write_ppu_address(ppu.vramaddr, data);
            ppu.vramaddr += ((ppu.ctrl & PPU2000_VINC32) ? 32 : 1);
            ppu.vramaddr &= 0xffff;
            break;
    }
};

module.exports.ppu = ppu;

function pixel2data(pixel, data, di) {
    data[di * 4    ] = pixel[0];
    data[di * 4 + 1] = pixel[1];
    data[di * 4 + 2] = pixel[2];
    data[di * 4 + 3] = pixel[3];
}

function main_render(fc) {
    let imageData = new ImageData(WIDTH, HEIGHT);
    //let imageData = {data: new Uint8Array(WIDTH * HEIGHT * 4)}
    let data = imageData.data;
    // buffer will store the palette index of each
    let buffer = new Uint8Array(WIDTH * HEIGHT);

    render_frame(fc, buffer);
    
    for (let i = 0; i !== 256 * 240; ++i) {
        pixel2data(stdpalette[buffer[i]], data, i);
    }

    //main_render(fc);
    let ctx = document.getElementById('canvas').getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    window.requestAnimationFrame(() => main_render(fc));
}

module.exports.main_render = main_render;