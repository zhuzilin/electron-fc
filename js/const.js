// 寄存器标记 (status index)
const INDEX_C = 0;
const INDEX_Z = 1;
const INDEX_I = 2;
const INDEX_D = 3;
const INDEX_B = 4;
const INDEX_R = 5;
const INDEX_V = 6;
const INDEX_S = 7;
const INDEX_N = INDEX_S;

module.exports.INDEX_C = INDEX_C;
module.exports.INDEX_Z = INDEX_Z;
module.exports.INDEX_I = INDEX_I;
module.exports.INDEX_D = INDEX_D;
module.exports.INDEX_B = INDEX_B;
module.exports.INDEX_R = INDEX_R;
module.exports.INDEX_V = INDEX_V;
module.exports.INDEX_S = INDEX_S;
module.exports.INDEX_N = INDEX_N;

// status flag
const FLAG_C = 1 << 0;    // 进位标记(Carry flag)
const FLAG_Z = 1 << 1;    // 零标记 (Zero flag)
const FLAG_I = 1 << 2;    // 禁止中断(Irq disabled flag)
const FLAG_D = 1 << 3;    // 十进制模式(Decimal mode flag)
const FLAG_B = 1 << 4;    // 软件中断(BRK flag)
const FLAG_R = 1 << 5;    // 保留标记(Reserved); 一直为1
const FLAG_V = 1 << 6;    // 溢出标记(Overflow  flag)
const FLAG_S = 1 << 7;    // 符号标记(Sign flag)
const FLAG_N = FLAG_S;// 又叫(Negative Flag)

module.exports.FLAG_C = FLAG_C;
module.exports.FLAG_Z = FLAG_Z;
module.exports.FLAG_I = FLAG_I;
module.exports.FLAG_D = FLAG_D;
module.exports.FLAG_B = FLAG_B;
module.exports.FLAG_R = FLAG_R;
module.exports.FLAG_V = FLAG_V;
module.exports.FLAG_S = FLAG_S;
module.exports.FLAG_N = FLAG_N;

// interrupt vectors
const VECTOR_NMI     = 0xFFFA;   // 不可屏蔽中断
const VECTOR_RESET   = 0xFFFC;   // 重置CP指针地址
const VECTOR_IRQBRK  = 0xFFFE;   // 中断重定向

module.exports.VECTOR_NMI     = VECTOR_NMI;     // 不可屏蔽中断
module.exports.VECTOR_RESET   = VECTOR_RESET;   // 重置CP指针地址
module.exports.VECTOR_IRQBRK  = VECTOR_IRQBRK;  // 中断重定向

// PPU
const PPU2000_NMIGen  = 0x80; // [0x2000]VBlank期间是否产生NMI
const PPU2000_Sp8x16  = 0x20; // [0x2000]精灵为8x16(1); 还是8x8(0)
const PPU2000_BgTabl  = 0x10; // [0x2000]背景调色板表地址$1000(1); $0000(0)
const PPU2000_SpTabl  = 0x08; // [0x2000]精灵调色板表地址$1000(1); $0000(0); 8x16模式下被忽略
const PPU2000_VINC32  = 0x04; // [0x2000]VRAM读写增加值32(1); 1(0)

const PPU2001_Grey    = 0x01; // 灰阶使能
const PPU2001_BackL8  = 0x02; // 显示最左边的8像素背景
const PPU2001_SpriteL8= 0x04; // 显示最左边的8像素精灵
const PPU2001_Back    = 0x08; // 背景显示使能
const PPU2001_Sprite  = 0x10; // 精灵显示使能

const PPU2001_NTSCEmR = 0x20; // NTSC 强调红色
const PPU2001_NTSCEmG = 0x40; // NTSC 强调绿色
const PPU2001_NTSCEmB = 0x80; // NTSC 强调蓝色

const PPU2001_PALEmG  = 0x20; // PAL 强调绿色
const PPU2001_PALEmR  = 0x40; // PAL 强调红色
const PPU2001_PALEmB  = 0x80; // PAL 强调蓝色

const PPU2002_VBlank  = 0x80; // [0x2002]垂直空白间隙标志
const PPU2002_Sp0Hit  = 0x40; // [0x2002]零号精灵命中标志
const PPU2002_SpOver  = 0x20; // [0x2002]精灵溢出标志

module.exports.PPU2000_NMIGen  = PPU2000_NMIGen;
module.exports.PPU2000_Sp8x16  = PPU2000_Sp8x16;
module.exports.PPU2000_BgTabl  = PPU2000_BgTabl;
module.exports.PPU2000_SpTabl  = PPU2000_SpTabl;
module.exports.PPU2000_VINC32  = PPU2000_VINC32;

module.exports.PPU2001_Grey    = PPU2001_Grey;
module.exports.PPU2001_BackL8  = PPU2001_BackL8;
module.exports.PPU2001_SpriteL8= PPU2001_SpriteL8;
module.exports.PPU2001_Back    = PPU2001_Back;
module.exports.PPU2001_Sprite  = PPU2001_Sprite;

module.exports.PPU2001_NTSCEmR = PPU2001_NTSCEmR;
module.exports.PPU2001_NTSCEmG = PPU2001_NTSCEmG;
module.exports.PPU2001_NTSCEmB = PPU2001_NTSCEmB;

module.exports.PPU2001_PALEmG  = PPU2001_PALEmG;
module.exports.PPU2001_PALEmR  = PPU2001_PALEmR;
module.exports.PPU2001_PALEmB  = PPU2001_PALEmB;

module.exports.PPU2002_VBlank  = PPU2002_VBlank;
module.exports.PPU2002_Sp0Hit  = PPU2002_Sp0Hit;
module.exports.PPU2002_SpOver  = PPU2002_SpOver;

const SPATTR_FlipV   = 0x80; // 垂直翻转
const SPATTR_FlipH   = 0x40; // 水平翻转
const SPATTR_Priority= 0x20; // 优先位

module.exports.SPATTR_FlipV = SPATTR_FlipV;
module.exports.SPATTR_FlipH = SPATTR_FlipH;
module.exports.SPATTR_Priority = SPATTR_Priority;

const WIDTH = 256;
const HEIGHT = 240;
const SPRITE_COUNT = 64;

module.exports.WIDTH = WIDTH;
module.exports.HEIGHT = HEIGHT;
module.exports.SPRITE_COUNT = SPRITE_COUNT;

// NTSC master clock is 12 times as fast as cpu clock
const MASTER_CYCLE_PER_CPU = 12;

module.exports.MASTER_CYCLE_PER_CPU = MASTER_CYCLE_PER_CPU;