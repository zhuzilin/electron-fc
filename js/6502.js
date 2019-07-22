"use strict";
let assert = require('assert');
let {  replaceAt } = require('./util');
const {
    INDEX_C,
    INDEX_Z,
    INDEX_I,
    INDEX_D,
    INDEX_B,
    INDEX_R,
    INDEX_V,
    INDEX_S,
    INDEX_N,
    FLAG_C,
    FLAG_Z,
    FLAG_I,
    FLAG_D,
    FLAG_B,
    FLAG_R,
    FLAG_V,
    FLAG_S,
    FLAG_N,
    VECTOR_NMI,
    VECTOR_RESET,
    VECTOR_IRQBRK,
} = require('./const');

// 6502 instructions
const INS_UNK = 0;      // 未知指令
const INS_LDA = 1;      // LDA--由存储器取数送入累加器A    M -> A
const INS_LDX = 2;      // LDX--由存储器取数送入寄存器X    M -> X
const INS_LDY = 3;      // LDY--由存储器取数送入寄存器Y    M -> Y
const INS_STA = 4;      // STA--将累加器A的数送入存储器    A -> M
const INS_STX = 5;      // STX--将寄存器X的数送入存储器    X -> M
const INS_STY = 6;      // STY--将寄存器Y的数送入存储器    Y -> M
const INS_TAX = 7;      // 将累加器A的内容送入变址寄存器X
const INS_TXA = 8;      // 将变址寄存器X的内容送入累加器A
const INS_TAY = 9;      // 将累加器A的内容送入变址寄存器Y
const INS_TYA = 10;     // 将变址寄存器Y的内容送入累加器A
const INS_TSX = 11;     // 堆栈指针S的内容送入变址寄存器X
const INS_TXS = 12;     // 变址寄存器X的内容送入堆栈指针S
const INS_ADC = 13;     // ADC--累加器 =存储器 =进位标志C相加 =结果送累加器A  A+M+C -> A
const INS_SBC = 14;     // SBC--从累加器减去存储器和进位标志C取反 =结果送累加器 A-M-(1-C) -> A
const INS_INC = 15;     // INC--存储器单元内容增1  M+1 -> M
const INS_DEC = 16;      // DEC--存储器单元内容减1  M-1 -> M
const INS_INX = 17;      // INX--X寄存器+1 X+1 -> X
const INS_DEX = 18;      // DEX--X寄存器-1 X-1 -> X
const INS_INY = 19;      // INY--Y寄存器+1 Y+1 -> Y
const INS_DEY = 20;      // DEY--Y寄存器-1 Y-1 -> Y
const INS_AND = 21;      // AND--存储器与累加器相与 =结果送累加器  A∧M -> A
const INS_ORA = 22;      // ORA--存储器与累加器相或 =结果送累加器  A∨M -> A
const INS_EOR = 23;      // EOR--存储器与累加器异或 =结果送累加器  A≮M -> A
const INS_CLC = 24;      // CLC--清除进位标志C   0 -> C
const INS_SEC = 25;      // SEC--设置进位标志C   1 -> C
const INS_CLD = 26;      // CLD--清除十进标志D   0 -> D
const INS_SED = 27;      // SED--设置十进标志D   1 -> D
const INS_CLV = 28;      // CLV--清除溢出标志V   0 -> V
const INS_CLI = 29;      // CLI--清除中断禁止V   0 -> I
const INS_SEI = 30;      // SEI--设置中断禁止V   1 -> I
const INS_CMP = 31;      // CMP--累加器和存储器比较
const INS_CPX = 32;      // CPX--寄存器X的内容和存储器比较
const INS_CPY = 33;      // CPY--寄存器Y的内容和存储器比较
const INS_BIT = 34;      // BIT--位测试
const INS_ASL = 35;      // ASL--算术左移 储存器
const INS_ASLA = 36;     // ASL--算术左移 累加器
const INS_LSR = 37;      // LSR--算术右移 储存器
const INS_LSRA = 38;     // LSR--算术右移 累加器
const INS_ROL = 39;      // ROL--循环算术左移 储存器
const INS_ROLA = 40;     // ROL--循环算术左移 累加器
const INS_ROR = 41;      // ROR--循环算术右移 储存器
const INS_RORA = 42;     // ROR--循环算术右移 累加器
const INS_PHA = 43;      // PHA--累加器进栈
const INS_PLA = 44;      // PLA--累加器出栈
const INS_PHP = 45;      // PHP--标志寄存器P进栈
const INS_PLP = 46;      // PLP--标志寄存器P出栈
const INS_JMP = 47;      // JMP--无条件跳转
const INS_BEQ = 48;      // 如果标志位Z = 1则转移，否则继续
const INS_BNE = 49;      // 如果标志位Z = 0则转移，否则继续
const INS_BCS = 50;      // 如果标志位C = 1则转移，否则继续
const INS_BCC = 51;      // 如果标志位C = 0则转移，否则继续
const INS_BMI = 52;      // 如果标志位N = 1则转移，否则继续
const INS_BPL = 53;      // 如果标志位N = 0则转移，否则继续
const INS_BVS = 54;      // 如果标志位V = 1则转移，否则继续
const INS_BVC = 55;      // 如果标志位V = 0则转移，否则继续
const INS_JSR = 56;      // 跳转到子程序
const INS_RTS = 57;      // 返回到主程序
const INS_NOP = 58;      // 无操作
const INS_BRK = 59;      // 强制中断
const INS_RTI = 60;      // 从中断返回
// --------  组合指令  ----------
const INS_ALR = 61;      // [Unofficial&Combo] AND+LSR
const INS_ASR = INS_ALR; // 有消息称是叫这个
const INS_ANC = 62;      // [Unofficial&Combo] AND+N2C?
const INS_AAC = INS_ANC; // 差不多一个意思
const INS_ARR = 63;      // [Unofficial&Combo] AND+ROR [类似]
const INS_AXS = 64;      // [Unofficial&Combo] AND+XSB?
const INS_SBX = INS_AXS; // 一个意思
const INS_LAX = 65;       // [Unofficial&Combo] LDA+TAX
const INS_SAX = 66;      // [Unofficial&Combo] STA&STX [类似]
// -------- 读改写指令 ----------
const INS_DCP = 67;      // [Unofficial& RMW ] DEC+CMP
const INS_ISC = 68;      // [Unofficial& RMW ] INC+SBC
const INS_ISB = INS_ISC;// 差不多一个意思
const INS_RLA = 69;      // [Unofficial& RMW ] ROL+AND
const INS_RRA = 70;      // [Unofficial& RMW ] ROR+AND
const INS_SLO = 71;      // [Unofficial& RMW ] ASL+ORA
const INS_SRE = 72;      // [Unofficial& RMW ] LSR+EOR
// -------- 卧槽 ----
const INS_LAS = 73;
const INS_XAA = 74;
const INS_AHX = 75;
const INS_TAS = 76;
const INS_SHX = 77;
const INS_SHY = 78;


// 寻址方式
const AM_UNK = 0;         // 未知寻址
const AM_ACC = 1;         // 操累加器A: Op Accumulator
const AM_IMP = 2;         // 隐含 寻址: Implied    Addressing
const AM_IMM = 3;         // 立即 寻址: Immediate  Addressing
const AM_ABS = 4;         // 直接 寻址: Absolute   Addressing
const AM_ABX = 5;         // 直接X变址: Absolute X Addressing
const AM_ABY = 6;         // 直接Y变址: Absolute Y Addressing
const AM_ZPG = 7;         // 零页 寻址: Zero-Page  Addressing
const AM_ZPX = 8;         // 零页X变址: Zero-PageX Addressing
const AM_ZPY = 9;         // 零页Y变址: Zero-PageY Addressing
const AM_INX = 10;        // 间接X变址:  Pre-indexed Indirect Addressing
const AM_INY = 11;        // 间接Y变址: Post-indexed Indirect Addressing
const AM_IND = 12;        // 间接 寻址: Indirect   Addressing
const AM_REL = 13;        // 相对 寻址: Relative   Addressing

const opname_data = [
    [ 'B', 'R', 'K', AM_IMP ],
    [ 'O', 'R', 'A', AM_INX ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'S', 'L', 'O', AM_INX ],
    [ 'N', 'O', 'P', AM_ZPG ],
    [ 'O', 'R', 'A', AM_ZPG ],
    [ 'A', 'S', 'L', AM_ZPG ],
    [ 'S', 'L', 'O', AM_ZPG ],
    [ 'P', 'H', 'P', AM_IMP ],
    [ 'O', 'R', 'A', AM_IMM ],
    [ 'A', 'S', 'L', AM_ACC ],
    [ 'A', 'N', 'C', AM_IMM ],
    [ 'N', 'O', 'P', AM_ABS ],
    [ 'O', 'R', 'A', AM_ABS ],
    [ 'A', 'S', 'L', AM_ABS ],
    [ 'S', 'L', 'O', AM_ABS ],
    
    [ 'B', 'P', 'L', AM_REL ],
    [ 'O', 'R', 'A', AM_INY ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'S', 'L', 'O', AM_INY ],
    [ 'N', 'O', 'P', AM_ZPX ],
    [ 'O', 'R', 'A', AM_ZPX ],
    [ 'A', 'S', 'L', AM_ZPX ],
    [ 'S', 'L', 'O', AM_ZPX ],
    [ 'C', 'L', 'C', AM_IMP ],
    [ 'O', 'R', 'A', AM_ABY ],
    [ 'N', 'O', 'P', AM_IMP ],
    [ 'S', 'L', 'O', AM_ABY ],
    [ 'N', 'O', 'P', AM_ABX ],
    [ 'O', 'R', 'A', AM_ABX ],
    [ 'A', 'S', 'L', AM_ABX ],
    [ 'S', 'L', 'O', AM_ABX ],
    
    [ 'J', 'S', 'R', AM_ABS ],
    [ 'A', 'N', 'D', AM_INX ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'R', 'L', 'A', AM_INX ],
    [ 'B', 'I', 'T', AM_ZPG ],
    [ 'A', 'N', 'D', AM_ZPG ],
    [ 'R', 'O', 'L', AM_ZPG ],
    [ 'R', 'L', 'A', AM_ZPG ],
    [ 'P', 'L', 'P', AM_IMP ],
    [ 'A', 'N', 'D', AM_IMM ],
    [ 'R', 'O', 'L', AM_ACC ],
    [ 'A', 'N', 'C', AM_IMM ],
    [ 'B', 'I', 'T', AM_ABS ],
    [ 'A', 'N', 'D', AM_ABS ],
    [ 'R', 'O', 'L', AM_ABS ],
    [ 'R', 'L', 'A', AM_ABS ],
    
    [ 'B', 'M', 'I', AM_REL ],
    [ 'A', 'N', 'D', AM_INY ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'R', 'L', 'A', AM_INY ],
    [ 'N', 'O', 'P', AM_ZPX ],
    [ 'A', 'N', 'D', AM_ZPX ],
    [ 'R', 'O', 'L', AM_ZPX ],
    [ 'R', 'L', 'A', AM_ZPX ],
    [ 'S', 'E', 'C', AM_IMP ],
    [ 'A', 'N', 'D', AM_ABY ],
    [ 'N', 'O', 'P', AM_IMP ],
    [ 'R', 'L', 'A', AM_ABY ],
    [ 'N', 'O', 'P', AM_ABX ],
    [ 'A', 'N', 'D', AM_ABX ],
    [ 'R', 'O', 'L', AM_ABX ],
    [ 'R', 'L', 'A', AM_ABX ],
    
    [ 'R', 'T', 'I', AM_IMP ],
    [ 'E', 'O', 'R', AM_INX ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'S', 'R', 'E', AM_INX ],
    [ 'N', 'O', 'P', AM_ZPG ],
    [ 'E', 'O', 'R', AM_ZPG ],
    [ 'L', 'S', 'R', AM_ZPG ],
    [ 'S', 'R', 'E', AM_ZPG ],
    [ 'P', 'H', 'A', AM_IMP ],
    [ 'E', 'O', 'R', AM_IMM ],
    [ 'L', 'S', 'R', AM_ACC ],
    [ 'A', 'S', 'R', AM_IMM ],
    [ 'J', 'M', 'P', AM_ABS ],
    [ 'E', 'O', 'R', AM_ABS ],
    [ 'L', 'S', 'R', AM_ABS ],
    [ 'S', 'R', 'E', AM_ABS ],
    
    [ 'B', 'V', 'C', AM_REL ],
    [ 'E', 'O', 'R', AM_INY ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'S', 'R', 'E', AM_INY ],
    [ 'N', 'O', 'P', AM_ZPX ],
    [ 'E', 'O', 'R', AM_ZPX ],
    [ 'L', 'S', 'R', AM_ZPX ],
    [ 'S', 'R', 'E', AM_ZPX ],
    [ 'C', 'L', 'I', AM_IMP ],
    [ 'E', 'O', 'R', AM_ABY ],
    [ 'N', 'O', 'P', AM_IMP ],
    [ 'S', 'R', 'E', AM_ABY ],
    [ 'N', 'O', 'P', AM_ABX ],
    [ 'E', 'O', 'R', AM_ABX ],
    [ 'L', 'S', 'R', AM_ABX ],
    [ 'S', 'R', 'E', AM_ABX ],
    
    [ 'R', 'T', 'S', AM_IMP ],
    [ 'A', 'D', 'C', AM_INX ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'R', 'R', 'A', AM_INX ],
    [ 'N', 'O', 'P', AM_ZPG ],
    [ 'A', 'D', 'C', AM_ZPG ],
    [ 'R', 'O', 'R', AM_ZPG ],
    [ 'R', 'R', 'A', AM_ZPG ],
    [ 'P', 'L', 'A', AM_IMP ],
    [ 'A', 'D', 'C', AM_IMM ],
    [ 'R', 'O', 'R', AM_ACC ],
    [ 'A', 'R', 'R', AM_IMM ],
    [ 'J', 'M', 'P', AM_IND ],
    [ 'A', 'D', 'C', AM_ABS ],
    [ 'R', 'O', 'R', AM_ABS ],
    [ 'R', 'R', 'A', AM_ABS ],
    
    [ 'B', 'V', 'S', AM_REL ],
    [ 'A', 'D', 'C', AM_INY ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'R', 'R', 'A', AM_INY ],
    [ 'N', 'O', 'P', AM_ZPX ],
    [ 'A', 'D', 'C', AM_ZPX ],
    [ 'R', 'O', 'R', AM_ZPX ],
    [ 'R', 'R', 'A', AM_ZPX ],
    [ 'S', 'E', 'I', AM_IMP ],
    [ 'A', 'D', 'C', AM_ABY ],
    [ 'N', 'O', 'P', AM_IMP ],
    [ 'R', 'R', 'A', AM_ABY ],
    [ 'N', 'O', 'P', AM_ABX ],
    [ 'A', 'D', 'C', AM_ABX ],
    [ 'R', 'O', 'R', AM_ABX ],
    [ 'R', 'R', 'A', AM_ABX ],
    
    [ 'N', 'O', 'P', AM_IMM ],
    [ 'S', 'T', 'A', AM_INX ],
    [ 'N', 'O', 'P', AM_IMM ],
    [ 'S', 'A', 'X', AM_INX ],
    [ 'S', 'T', 'Y', AM_ZPG ],
    [ 'S', 'T', 'A', AM_ZPG ],
    [ 'S', 'T', 'X', AM_ZPG ],
    [ 'S', 'A', 'X', AM_ZPG ],
    [ 'D', 'E', 'Y', AM_IMP ],
    [ 'N', 'O', 'P', AM_IMM ],
    [ 'T', 'A', 'X', AM_IMP ],
    [ 'X', 'X', 'A', AM_IMM ],
    [ 'S', 'T', 'Y', AM_ABS ],
    [ 'S', 'T', 'A', AM_ABS ],
    [ 'S', 'T', 'X', AM_ABS ],
    [ 'S', 'A', 'X', AM_ABS ],
    
    [ 'B', 'C', 'C', AM_REL ],
    [ 'S', 'T', 'A', AM_INY ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'A', 'H', 'X', AM_INY ],
    [ 'S', 'T', 'Y', AM_ZPX ],
    [ 'S', 'T', 'A', AM_ZPX ],
    [ 'S', 'T', 'X', AM_ZPY ],
    [ 'S', 'A', 'X', AM_ZPY ],
    [ 'T', 'Y', 'A', AM_IMP ],
    [ 'S', 'T', 'A', AM_ABY ],
    [ 'T', 'X', 'S', AM_IMP ],
    [ 'T', 'A', 'S', AM_ABY ],
    [ 'S', 'H', 'Y', AM_ABX ],
    [ 'S', 'T', 'A', AM_ABX ],
    [ 'S', 'H', 'X', AM_ABY ],
    [ 'A', 'H', 'X', AM_ABY ],
    
    [ 'L', 'D', 'Y', AM_IMM ],
    [ 'L', 'D', 'A', AM_INX ],
    [ 'L', 'D', 'X', AM_IMM ],
    [ 'L', 'A', 'X', AM_INX ],
    [ 'L', 'D', 'Y', AM_ZPG ],
    [ 'L', 'D', 'A', AM_ZPG ],
    [ 'L', 'D', 'X', AM_ZPG ],
    [ 'L', 'A', 'X', AM_ZPG ],
    [ 'T', 'A', 'Y', AM_IMP ],
    [ 'L', 'D', 'A', AM_IMM ],
    [ 'T', 'A', 'X', AM_IMP ],
    [ 'L', 'A', 'X', AM_IMM ],
    [ 'L', 'D', 'Y', AM_ABS ],
    [ 'L', 'D', 'A', AM_ABS ],
    [ 'L', 'D', 'X', AM_ABS ],
    [ 'L', 'A', 'X', AM_ABS ],
    
    [ 'B', 'C', 'S', AM_REL ],
    [ 'L', 'D', 'A', AM_INY ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'L', 'A', 'X', AM_INY ],
    [ 'L', 'D', 'Y', AM_ZPX ],
    [ 'L', 'D', 'A', AM_ZPX ],
    [ 'L', 'D', 'X', AM_ZPY ],
    [ 'L', 'A', 'X', AM_ZPY ],
    [ 'C', 'L', 'V', AM_IMP ],
    [ 'L', 'D', 'A', AM_ABY ],
    [ 'T', 'S', 'X', AM_IMP ],
    [ 'L', 'A', 'S', AM_ABY ],
    [ 'L', 'D', 'Y', AM_ABX ],
    [ 'L', 'D', 'A', AM_ABX ],
    [ 'L', 'D', 'X', AM_ABY ],
    [ 'L', 'A', 'X', AM_ABY ],
    
    [ 'C', 'P', 'Y', AM_IMM ],
    [ 'C', 'M', 'P', AM_INX ],
    [ 'N', 'O', 'P', AM_IMM ],
    [ 'D', 'C', 'P', AM_INX ],
    [ 'C', 'P', 'Y', AM_ZPG ],
    [ 'C', 'M', 'P', AM_ZPG ],
    [ 'D', 'E', 'C', AM_ZPG ],
    [ 'D', 'C', 'P', AM_ZPG ],
    [ 'I', 'N', 'Y', AM_IMP ],
    [ 'C', 'M', 'P', AM_IMM ],
    [ 'D', 'E', 'X', AM_IMP ],
    [ 'A', 'X', 'S', AM_IMM ],
    [ 'C', 'P', 'Y', AM_ABS ],
    [ 'C', 'M', 'P', AM_ABS ],
    [ 'D', 'E', 'C', AM_ABS ],
    [ 'D', 'C', 'P', AM_ABS ],
    
    [ 'B', 'N', 'E', AM_REL ],
    [ 'C', 'M', 'P', AM_INY ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'D', 'C', 'P', AM_INY ],
    [ 'N', 'O', 'P', AM_ZPX ],
    [ 'C', 'M', 'P', AM_ZPX ],
    [ 'D', 'E', 'C', AM_ZPX ],
    [ 'D', 'C', 'P', AM_ZPX ],
    [ 'C', 'L', 'D', AM_IMP ],
    [ 'C', 'M', 'P', AM_ABY ],
    [ 'N', 'O', 'P', AM_IMP ],
    [ 'D', 'C', 'P', AM_ABY ],
    [ 'N', 'O', 'P', AM_ABX ],
    [ 'C', 'M', 'P', AM_ABX ],
    [ 'D', 'E', 'C', AM_ABX ],
    [ 'D', 'C', 'P', AM_ABX ],
    
    [ 'C', 'P', 'X', AM_IMM ],
    [ 'S', 'B', 'C', AM_INX ],
    [ 'N', 'O', 'P', AM_IMM ],
    [ 'I', 'S', 'B', AM_INX ],
    [ 'C', 'P', 'X', AM_ZPG ],
    [ 'S', 'B', 'C', AM_ZPG ],
    [ 'I', 'N', 'C', AM_ZPG ],
    [ 'I', 'S', 'B', AM_ZPG ],
    [ 'I', 'N', 'X', AM_IMP ],
    [ 'S', 'B', 'C', AM_IMM ],
    [ 'N', 'O', 'P', AM_IMP ],
    [ 'S', 'B', 'C', AM_IMM ],
    [ 'C', 'P', 'X', AM_ABS ],
    [ 'S', 'B', 'C', AM_ABS ],
    [ 'I', 'N', 'C', AM_ABS ],
    [ 'I', 'S', 'B', AM_ABS ],
    
    [ 'B', 'E', 'Q', AM_REL ],
    [ 'S', 'B', 'C', AM_INY ],
    [ 'S', 'T', 'P', AM_UNK ],
    [ 'I', 'S', 'B', AM_INY ],
    [ 'N', 'O', 'P', AM_ZPX ],
    [ 'S', 'B', 'C', AM_ZPX ],
    [ 'I', 'N', 'C', AM_ZPX ],
    [ 'I', 'S', 'B', AM_ZPX ],
    [ 'S', 'E', 'D', AM_IMP ],
    [ 'S', 'B', 'C', AM_ABY ],
    [ 'N', 'O', 'P', AM_IMP ],
    [ 'I', 'S', 'B', AM_ABY ],
    [ 'N', 'O', 'P', AM_ABX ],
    [ 'S', 'B', 'C', AM_ABX ],
    [ 'I', 'N', 'C', AM_ABX ],
    [ 'I', 'S', 'B', AM_ABX ],
];

const HEXDATA = "0123456789abcdef";

function add_hex(buf, i, num) {
    buf = replaceAt(buf, i, HEXDATA[num >> 4]);
    buf = replaceAt(buf, i+1, HEXDATA[num & 0x0f]);
    return buf;
}

function add_dec(buf, i, num) {
    if (num > 128) {
        buf = replaceAt(buf, i, '-');
        num = 256 - num;
    }
    else {
        buf = replaceAt(buf, i, '+');
    }
    buf = replaceAt(buf, i + 1, HEXDATA[parseInt(num / 100)]);
    buf = replaceAt(buf, i + 2, HEXDATA[parseInt(num / 10) % 10]);
    buf = replaceAt(buf, i + 3, HEXDATA[num % 10]);
    return buf;
}

module.exports.add_hex = add_hex;
module.exports.add_dec = add_dec;

// code will be Uint8Array[4]
module.exports.disassembly_6502 = function (code) {
    const NAME_FIRST = 0;
    const ADDR_FIRST = NAME_FIRST + 4;
    const LEN = ADDR_FIRST + 9;
    let op = code[0];
    let a1 = code[1];
    let a2 = code[2];
    let ctrl = code[3];
    let opname = opname_data[code[0]];
    let buf = ' '.repeat(LEN);
    buf += ';';
    buf = replaceAt(buf, NAME_FIRST + 0, opname[0]);
    buf = replaceAt(buf, NAME_FIRST + 1, opname[1]);
    buf = replaceAt(buf, NAME_FIRST + 2, opname[2]);
    let mode = opname[3];
    switch (mode)
    {
        case AM_UNK:
            // fall through
        case AM_IMP:
            // XXX     ;
            break;
        case AM_ACC:
            // XXX A   ;
            buf = replaceAt(buf, ADDR_FIRST + 0, 'A');
            break;
        case AM_IMM:
            // XXX #$AB
            buf = replaceAt(buf, ADDR_FIRST + 0, '#');
            buf = replaceAt(buf, ADDR_FIRST + 1, '$');
            buf = add_hex(buf, ADDR_FIRST + 2, a1);
            break;
        case AM_ABS:
            // XXX $ABCD
            // fall through
        case AM_ABX:
            // XXX $ABCD, X
            // fall through
        case AM_ABY:
            // XXX $ABCD, Y
            // REAL
            buf = replaceAt(buf, ADDR_FIRST, '$');
            buf = add_hex(buf, ADDR_FIRST + 1, a2);
            buf = add_hex(buf, ADDR_FIRST + 3, a1);
            if (mode === AM_ABS) break;
            buf = buf = replaceAt(buf, ADDR_FIRST + 5, ',');
            buf = buf = replaceAt(buf, ADDR_FIRST + 7, mode === AM_ABX ? 'X' : 'Y');
            break;
        case AM_ZPG:
            // XXX $AB
            // fall through
        case AM_ZPX:
            // XXX $AB, X
            // fall through
        case AM_ZPY:
            // XXX $AB, Y
            // REAL
            buf = replaceAt(buf, ADDR_FIRST, '$');
            buf = add_hex(buf, ADDR_FIRST + 1, a1);
            if (mode === AM_ZPG) break;
            buf = replaceAt(buf, ADDR_FIRST + 3, ',');
            buf = replaceAt(buf, ADDR_FIRST + 5, mode === AM_ABX ? 'X' : 'Y');
            break;
        case AM_INX:
            // XXX ($AB, X)
            buf = replaceAt(buf, ADDR_FIRST + 0, '(');
            buf = replaceAt(buf, ADDR_FIRST + 1, '$');
            buf = add_hex(buf, ADDR_FIRST + 2, a1);
            buf = replaceAt(buf, ADDR_FIRST + 4, ',');
            buf = replaceAt(buf, ADDR_FIRST + 6, 'X');
            buf = replaceAt(buf, ADDR_FIRST + 7, ')');
            break;
        case AM_INY:
            // XXX ($AB), Y
            buf = replaceAt(buf, ADDR_FIRST + 0, '(');
            buf = replaceAt(buf, ADDR_FIRST + 1, '$');
            buf = add_hex(buf, ADDR_FIRST + 2, a1);
            buf = replaceAt(buf, ADDR_FIRST + 4, ')');
            buf = replaceAt(buf, ADDR_FIRST + 5, ',');
            buf = replaceAt(buf, ADDR_FIRST + 7, 'Y');
            break;
        case AM_IND:
            // XXX ($ABCD)
            buf = replaceAt(buf, ADDR_FIRST + 0, '(');
            buf = replaceAt(buf, ADDR_FIRST + 1, '$');
            buf = add_hex(buf, ADDR_FIRST + 2, a2);
            buf = add_hex(buf, ADDR_FIRST + 4, a1);
            buf = replaceAt(buf, ADDR_FIRST + 6, ')');
            break;
        case AM_REL:
            // XXX $AB(-085)
            // XXX $ABCD
            buf = replaceAt(buf, ADDR_FIRST + 0, '$');
            buf = add_hex(buf, ADDR_FIRST + 1, a1);
            buf = replaceAt(buf, ADDR_FIRST + 3, '(');
            buf = add_dec(buf, ADDR_FIRST + 4, a1);
            buf = replaceAt(buf, ADDR_FIRST + 8, ')');
            break;
    }
    return buf;
};

/***************************************************************
 * addressing mode
 ***************************************************************/
// unknown
function addressing_UNK(fc, cycle) {
    //assert(false, "unknown addressing mode");
    return 0;
}

// 累加器
function addressing_ACC(fc, cycle) {
    return 0;
}

// 隐含寻址
function addressing_IMP(fc, cycle) {
    return 0;
}


// 立即寻址
// 直接用pc的值
function addressing_IMM(fc, cycle) {
    const address = fc.registers.program_counter++;
    fc.registers.program_counter &= 0xffff;
    return address;
}

// 绝对寻址
// 从pc中读出地址
function addressing_ABS(fc, cycle) {
    const address0 = fc.read_cpu_address(fc.registers.program_counter++);
    fc.registers.program_counter &= 0xffff;
    const address1 = fc.read_cpu_address(fc.registers.program_counter++);
    fc.registers.program_counter &= 0xffff;
    return address0 | (address1 << 8);
}

// 绝对X变址
// 从pc中读出地址然后加X
function addressing_ABX(fc, cycle) {
    const base = addressing_ABS(fc, cycle);
    const address = (base + fc.registers.x_index) & 0xffff;
    cycle.count += ((base ^ address) >> 8) & 1;
    return address;
}

function addressing_abx(fc, cycle) {
    const base = addressing_ABS(fc, cycle);
    const address = (base + fc.registers.x_index) & 0xffff;
    return address;
}

// 绝对Y变址
// 从pc中读出地址然后加Y
function addressing_ABY(fc, cycle) {
    const base = addressing_ABS(fc, cycle);
    const address = (base + fc.registers.y_index) & 0xffff;
    cycle.count += ((base ^ address) >> 8) & 1;
    return address;
}

function addressing_aby(fc, cycle) {
    const base = addressing_ABS(fc, cycle);
    const address = (base + fc.registers.y_index) & 0xffff;
    return address;
}

// 0页寻址
function addressing_ZPG(fc, cycle) {
    const address = fc.read_cpu_address(fc.registers.program_counter++);
    return address;
}

// 0页X变址
function addressing_ZPX(fc, cycle) {
    const address = addressing_ZPG(fc, cycle);
    return (address + fc.registers.x_index) & 0xff;
}

// 0页Y变址
function addressing_ZPY(fc, cycle) {
    const address = addressing_ZPG(fc, cycle);
    return (address + fc.registers.y_index) & 0xff;
}

// 间接寻址
// 注意这个fc有内部bug，需要实现。
function addressing_IND(fc, cycle) {
    // 读取地址
    const base1 = addressing_ABS(fc, cycle);
    // 刻意实现6502的BUG
    // 如果base1是xxff, base2将会是xx00，其他时候base2 = base1 + 1
    const base2 = (base1 & 0xff00) | ((base1 + 1) & 0x00ff);
    // 读取地址
    const address = fc.read_cpu_address(base1) | (fc.read_cpu_address(base2) << 8);
    return address;
}

// 间接X寻址
function addressing_INX(fc, cycle) {
    let base = (fc.read_cpu_address(fc.registers.program_counter++) + fc.registers.x_index) & 0xff;
    fc.registers.program_counter &= 0xffff;
    const address0 = fc.read_cpu_address(base++);
    base &= 0xff;
    const address1 = fc.read_cpu_address(base);
    return address0 | (address1 << 8);
}

// 间接Y寻址
function addressing_INY(fc, cycle) {
    let base = fc.read_cpu_address(fc.registers.program_counter++);
    fc.registers.program_counter &= 0xffff;
    const address0 = fc.read_cpu_address(base++);
    base &= 0xff;
    const address1 = fc.read_cpu_address(base);
    const address = (address0 | (address1 << 8));
    const rvar = ((address0 | (address1 << 8)) + fc.registers.y_index) & 0xffff;
    cycle.count += ((address ^ rvar) >> 8) & 1;
    return rvar;
}

// 相对寻址
function addressing_REL(fc, cycle) {
    const data = fc.read_cpu_address(fc.registers.program_counter++);
    fc.registers.program_counter &= 0xffff;
    const data_int8 = (data > 127 ? data - 256 : data);
    const address = fc.registers.program_counter + data_int8;  // fast way to turn uint8 to int8
    return address & 0xffff;
}

/***************************************************************
 * 辅助函数
 ***************************************************************/
// if中判断用FLAG
function CF(fc) {
    return (fc.registers.status & FLAG_C);
}

function ZF(fc) {
    return (fc.registers.status & FLAG_Z);
}

function IF(fc) {
    return (fc.registers.status & FLAG_I);
}

function DF(fc) {
    return (fc.registers.status & FLAG_D)
}
function BF(fc) {
    return (fc.registers.status & FLAG_B);
}
function VF(fc) {
    return (fc.registers.status & FLAG_V);
}
function SF(fc) {
    return (fc.registers.status & FLAG_S);
}
// 将FLAG将变为1
function CF_SE(fc) {
    fc.registers.status |= FLAG_C
}
function ZF_SE(fc) {
    fc.registers.status |= FLAG_Z
}
function IF_SE(fc) {
    fc.registers.status |= FLAG_I
}
function DF_SE(fc) {
    fc.registers.status |= FLAG_D
}
function BF_SE(fc) {
    fc.registers.status |= FLAG_B
}
function RF_SE(fc) {
    fc.registers.status |= FLAG_R
}
function VF_SE(fc) {
    fc.registers.status |= FLAG_V
}
function SF_SE(fc) {
    fc.registers.status |= FLAG_S
}
// 将FLAG将变为0
function CF_CL(fc) {
    fc.registers.status &= ~FLAG_C
}
function ZF_CL(fc) {
    fc.registers.status &= ~FLAG_Z
}
function IF_CL(fc) {
    fc.registers.status &= ~FLAG_I
}
function DF_CL(fc) {
    fc.registers.status &= ~FLAG_D
}
function BF_CL(fc) {
    fc.registers.status &= ~FLAG_B
}
function VF_CL(fc) {
    fc.registers.status &= ~FLAG_V
}
function SF_CL(fc) {
    fc.registers.status &= ~FLAG_S
}
// 将FLAG将变为0或者1
function CF_IF(fc, x) {
    (x ? CF_SE(fc) : CF_CL(fc));
}
function ZF_IF(fc, x) {
    (x ? ZF_SE(fc) : ZF_CL(fc));
}
function OF_IF(fc, x) {
    (x ? IF_SE(fc) : IF_CL(fc));
}
function DF_IF(fc, x) {
    (x ? DF_SE(fc) : DF_CL(fc));
}
function BF_IF(fc, x) {
    (x ? BF_SE(fc) : BF_CL(fc));
}
function VF_IF(fc, x) {
    (x ? VF_SE(fc) : VF_CL(fc));
}
function SF_IF(fc, x) {
    (x ? SF_SE(fc) : SF_CL(fc));
}

function push(fc, a) {
    fc.main_memory[0x100 + (fc.registers.stack_pointer--)] = a;
    fc.registers.stack_pointer &= 0xff;
}

function pop(fc) {
    ++fc.registers.stack_pointer;
    fc.registers.stack_pointer &= 0xff;
    return fc.main_memory[0x100 + (fc.registers.stack_pointer)];
}

function check_sign_zero_flag(fc, x) {
    SF_IF(fc, x & 0x80);
    ZF_IF(fc, x === 0);
}

function branch(fc, address, cycle) {
    const saved = fc.registers.program_counter;
    fc.registers.program_counter = address;
    ++(cycle.count);
    cycle.count += (address ^ saved) >> 8 & 1;
}
/***************************************************************
 * 指令
 ***************************************************************/

function operation_UNK(fc, address, cycle) {
    assert(false, "UNKNOWN INS");
}

// 基础指令
function operation_LDA(fc, address, cycle) {
    fc.registers.accumulator = fc.read_cpu_address(address);
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_LDX(fc, address, cycle) {
    fc.registers.x_index = fc.read_cpu_address(address);
    check_sign_zero_flag(fc, fc.registers.x_index);
}

function operation_LDY(fc, address, cycle) {
    fc.registers.y_index = fc.read_cpu_address(address);
    check_sign_zero_flag(fc, fc.registers.y_index);
}

function operation_STA(fc, address, cycle) {
    fc.write_cpu_address(address, fc.registers.accumulator);
}

function operation_STX(fc, address, cycle) {
    fc.write_cpu_address(address, fc.registers.x_index);
}

function operation_STY(fc, address, cycle) {
    fc.write_cpu_address(address, fc.registers.y_index);
}

function operation_ADC(fc, address, cycle) {
    const src = fc.read_cpu_address(address);
    const result16 = fc.registers.accumulator + src + (CF(fc) ? 1 : 0);
    CF_IF(fc, result16 >> 8);
    const result8 = result16 & 0xff;
    VF_IF(fc, !((fc.registers.accumulator ^ src) & 0x80) && ((fc.registers.accumulator ^ result8) & 0x80));
    fc.registers.accumulator = result8;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_SBC(fc, address, cycle) {
    const src = fc.read_cpu_address(address);
    const result16 = fc.registers.accumulator - src - (CF(fc) ? 0 : 1);
    CF_IF(fc, !(result16 >> 8));
    const result8 = result16 & 0xff;
    VF_IF(fc, ((fc.registers.accumulator ^ src) & 0x80) && ((fc.registers.accumulator ^ result8) & 0x80));
    fc.registers.accumulator = result8;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_INC(fc, address, cycle) {
    let data = fc.read_cpu_address(address);
    ++data;
    data &= 0xff;
    fc.write_cpu_address(address, data);
    check_sign_zero_flag(fc, data);
}

function operation_DEC(fc, address, cycle) {
    let data = fc.read_cpu_address(address);
    --data;
    data &= 0xff;
    fc.write_cpu_address(address, data);
    check_sign_zero_flag(fc, data);
}

function operation_AND(fc, address, cycle) {
    fc.registers.accumulator &= fc.read_cpu_address(address);
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_ORA(fc, address, cycle) {
    fc.registers.accumulator |= fc.read_cpu_address(address);
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_EOR(fc, address, cycle) {
    fc.registers.accumulator ^= fc.read_cpu_address(address);
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_INX(fc, address, cycle) {
    fc.registers.x_index++;
    fc.registers.x_index &= 0xff;
    check_sign_zero_flag(fc, fc.registers.x_index);
}

function operation_DEX(fc, address, cycle) {
    fc.registers.x_index--;
    fc.registers.x_index &= 0xff;
    check_sign_zero_flag(fc, fc.registers.x_index);
}

function operation_INY(fc, address, cycle) {
    fc.registers.y_index++;
    fc.registers.y_index &= 0xff;
    check_sign_zero_flag(fc, fc.registers.y_index);
}

function operation_DEY(fc, address, cycle) {
    fc.registers.y_index--;
    fc.registers.y_index &= 0xff;
    check_sign_zero_flag(fc, fc.registers.y_index);
}

function operation_TAX(fc, address, cycle) {
    fc.registers.x_index = fc.registers.accumulator;
    check_sign_zero_flag(fc, fc.registers.x_index);
}

function operation_TXA(fc, address, cycle) {
    fc.registers.accumulator = fc.registers.x_index;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_TAY(fc, address, cycle) {
    fc.registers.y_index = fc.registers.accumulator;
    check_sign_zero_flag(fc, fc.registers.y_index);
}

function operation_TYA(fc, address, cycle) {
    fc.registers.accumulator = fc.registers.y_index;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_TSX(fc, address, cycle) {
    fc.registers.x_index = fc.registers.stack_pointer;
    check_sign_zero_flag(fc, fc.registers.x_index);
}

function operation_TXS(fc, address, cycle) {
    fc.registers.stack_pointer = fc.registers.x_index;
}

function operation_CLC(fc, address, cycle) {
    CF_CL(fc);
}

function operation_SEC(fc, address, cycle) {
    CF_SE(fc);
}

function operation_CLD(fc, address, cycle) {
    DF_CL(fc);
}

function operation_SED(fc, address, cycle) {
    DF_SE(fc);
}

function operation_CLV(fc, address, cycle) {
    VF_CL(fc);
}

function operation_SEV(fc, address, cycle) {
    VF_SE(fc);
}

function operation_CLI(fc, address, cycle) {
    IF_CL(fc);
}

function operation_SEI(fc, address, cycle) {
    IF_SE(fc);
}

function operation_CMP(fc, address, cycle) {
    let result16 = (fc.registers.accumulator - fc.read_cpu_address(address));
    result16 &= 0xffff;
    CF_IF(fc, result16 < 0x100);
    check_sign_zero_flag(fc, result16 & 0xff);
}

function operation_CPX(fc, address, cycle) {
    let result16 = (fc.registers.x_index - fc.read_cpu_address(address));
    SF_IF(fc, result16 < 0);
    result16 &= 0xffff;
    CF_IF(fc, result16 < 0x100);
    check_sign_zero_flag(fc, result16 & 0xff);
}

function operation_CPY(fc, address, cycle) {
    let result16 = (fc.registers.y_index - fc.read_cpu_address(address));
    result16 &= 0xffff;
    CF_IF(fc, result16 < 0x100);
    check_sign_zero_flag(fc, result16 & 0xff);
}

function operation_BIT(fc, address, cycle) {
    const value = fc.read_cpu_address(address) & 0xff;
    VF_IF(fc, value & (1 << 6));
    SF_IF(fc, value & (1 << 7));
    ZF_IF(fc, !(fc.registers.accumulator & value))
}

function operation_ASL(fc, address, cycle) {
    let data = fc.read_cpu_address(address);
    CF_IF(fc, data & 0x80);
    data <<= 1;
    data &= 0xff;
    fc.write_cpu_address(address, data);
    check_sign_zero_flag(fc, data);
}

function operation_ASLA(fc, address, cycle) {
    CF_IF(fc, fc.registers.accumulator & 0x80);
    fc.registers.accumulator <<= 1;
    fc.registers.accumulator &= 0xff;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_LSR(fc, address, cycle) {
    let data = fc.read_cpu_address(address);
    CF_IF(fc, data & 1);
    data >>= 1;
    fc.write_cpu_address(address, data);
    check_sign_zero_flag(fc, data);
}

function operation_LSRA(fc, address, cycle) {
    CF_IF(fc, fc.registers.accumulator & 1);
    fc.registers.accumulator >>= 1;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_ROL(fc, address, cycle) {
    let result16 = fc.read_cpu_address(address);
    result16 <<= 1;
    result16 |= (CF(fc)) >> (INDEX_C);
    CF_IF(fc, result16 & 0x100);
    const result8 = result16 & 0xff;
    fc.write_cpu_address(address, result8);
    check_sign_zero_flag(fc, result8);
}

function operation_ROLA(fc, address, cycle) {
    let result16 = fc.registers.accumulator;
    result16 <<= 1;
    result16 |= (CF(fc)) >> (INDEX_C);
    CF_IF(fc, result16 & 0x100);
    fc.registers.accumulator = result16 & 0xff;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_ROR(fc, address, cycle) {
    let result16 = fc.read_cpu_address(address);
    result16 |= (CF(fc)) << (8 - INDEX_C);
    CF_IF(fc, result16 & 1);
    result16 >>= 1;
    const result8 = result16 & 0xff;
    fc.write_cpu_address(address, result8);
    check_sign_zero_flag(fc, result8);
}

function operation_RORA(fc, address, cycle) {
    let result16 = fc.registers.accumulator;
    result16 |= (CF(fc)) << (8 - INDEX_C);
    CF_IF(fc, result16 & 1);
    result16 >>= 1;
    fc.registers.accumulator = result16 & 0xff;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_PHA(fc, address, cycle) {
    push(fc, fc.registers.accumulator);
}

function operation_PLA(fc, address, cycle) {
    fc.registers.accumulator = pop(fc);
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_PHP(fc, address, cycle) {
    push(fc, fc.registers.status | (FLAG_R | FLAG_B));
}

function operation_PLP(fc, address, cycle) {
    fc.registers.status = pop(fc);
    RF_SE(fc);
    BF_CL(fc);
}

// 流程指令
function operation_JMP(fc, address, cycle) {
    fc.registers.program_counter = address;
}

function operation_BEQ(fc, address, cycle) {
    if (ZF(fc))
        branch(fc, address, cycle);
}

function operation_BNE(fc, address, cycle) {
    if (!ZF(fc))
        branch(fc, address, cycle);
}

function operation_BCS(fc, address, cycle) {
    if (CF(fc))
        branch(fc, address, cycle);
}

function operation_BCC(fc, address, cycle) {
    if (!CF(fc))
        branch(fc, address, cycle);
}

function operation_BMI(fc, address, cycle) {
    if (SF(fc))
        branch(fc, address, cycle);
}

function operation_BPL(fc, address, cycle) {
    if (!SF(fc))
        branch(fc, address, cycle);
}

function operation_BVS(fc, address, cycle) {
    if (VF(fc))
        branch(fc, address, cycle);
}

function operation_BVC(fc, address, cycle) {
    if (!VF(fc))
        branch(fc, address, cycle);
}

function operation_JSR(fc, address, cycle) {
    const pc1 = (fc.registers.program_counter - 1) & 0xffff;
    push(fc, (pc1 >> 8) & 0xff);
    push(fc, (pc1) & 0xff);
    fc.registers.program_counter = address;
}

function operation_RTS(fc, address, cycle) {
    const pcl = pop(fc);
    const pch = pop(fc);
    fc.registers.program_counter = pcl | (pch << 8);
    fc.registers.program_counter++;
    fc.registers.program_counter &= 0xffff;
}

function operation_NOP(fc, address, cycle) {
}

function operation_BRK(fc, address, cycle) {
    fc.registers.program_counter++;
    fc.registers.program_counter &= 0xffff;
    push(fc, fc.registers.program_counter >> 8);
    push(fc, fc.registers.program_counter & 0xff);
    IF_SE(fc);
    fc.registers.program_counter = fc.read_cpu_address(VECTOR_IRQBRK);
    fc.registers.program_counter |= fc.read_cpu_address(VECTOR_IRQBRK + 1) << 8;
}

function operation_RTI(fc, address, cycle) {
    // P
    fc.registers.status = pop(fc);
    RF_SE(fc);
    BF_CL(fc);
    // PC
    const pcl = pop(fc);
    const pch = pop(fc);
    fc.registers.program_counter = pcl | (pch << 8);
}

// 扩展指令
function operation_ALR(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_ASR(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_ANC(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_AAC(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_ARR(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_AXS(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_SBX(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_LAX(fc, address, cycle) {
    fc.registers.accumulator = fc.read_cpu_address(address);
    fc.registers.x_index = fc.registers.accumulator;
    check_sign_zero_flag(fc, fc.registers.x_index);
}

function operation_SAX(fc, address, cycle) {
    fc.write_cpu_address(address, fc.registers.accumulator & fc.registers.x_index);
}

function operation_DCP(fc, address, cycle) {
    // DEC
    let data = fc.read_cpu_address(address);
    --data;
    data &= 0xff;
    fc.write_cpu_address(address, data);
    // CMP
    const result16 = (fc.registers.accumulator - data) & 0xffff;
    CF_IF(fc, !(result16 & 0x8000));
    check_sign_zero_flag(fc, result16);
}

function operation_ISC(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_ISB(fc, address, cycle) {
    // INC
    let data = fc.read_cpu_address(address);
    ++data;
    data &= 0xff
    fc.write_cpu_address(address, data);
    // SBC
    const src = data;
    const result16 = (fc.registers.accumulator - src - (CF(fc) ? 0 : 1)) & 0xffff;
    CF_IF(fc, !(result16 >> 8));
    const result8 = result16 & 0xff;
    VF_IF(fc, ((fc.registers.accumulator ^ src) & 0x80) && ((fc.registers.accumulator ^ result8) & 0x80));
    fc.registers.accumulator = result8;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_RLA(fc, address, cycle) {
    // ROL
    let result16 = fc.read_cpu_address(address);
    result16 <<= 1;
    result16 |= (CF(fc)) >> (INDEX_C);
    CF_IF(fc, result16 & 0x100);
    const result8 = result16 & 0xff;
    fc.write_cpu_address(address, result8);
    // AND
    fc.registers.accumulator &= result8;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_RRA(fc, address, cycle) {
    // ROR
    let result16_ror = fc.read_cpu_address(address);
    result16_ror |= (CF(fc)) << (8 - INDEX_C);
    const tmpcf = result16_ror & 1;
    result16_ror >>= 1;
    const result8_ror = result16_ror & 0xff;
    fc.write_cpu_address(address, result8_ror);
    // ADC
    const src = result8_ror;
    const result16 = (fc.registers.accumulator + src + tmpcf) & 0xffff;
    CF_IF(fc, result16 >> 8);
    const result8 = result16 & 0xff;
    VF_IF(fc, !((fc.registers.accumulator ^ src) & 0x80) && ((fc.registers.accumulator ^ result8) & 0x80));
    fc.registers.accumulator = result8;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_SLO(fc, address, cycle) {
    // ASL
    let data = fc.read_cpu_address(address);
    CF_IF(fc, data & 0x80);
    data <<= 1;
    fc.write_cpu_address(address, data);
    // ORA
    fc.registers.accumulator |= data;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_SRE(fc, address, cycle) {
    // LSR
    let data = fc.read_cpu_address(address);
    CF_IF(fc, data & 1);
    data >>= 1;
    fc.write_cpu_address(address, data);
    // EOR
    fc.registers.accumulator ^= data;
    check_sign_zero_flag(fc, fc.registers.accumulator);
}

function operation_SHX(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_SXA(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_SHY(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_SYA(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_LAS(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_XAA(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_AHX(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_SHA(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_TAS(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_KIL(fc, address, cycle) {
    operation_UNK(fc, address);
}

function operation_STP(fc, address, cycle) {
    operation_UNK(fc, address);
}

/************************************************
 * basic cycles
 ************************************************/
let BASIC_CYCLE = new Array(0x100);
{
    BASIC_CYCLE[0x00] = 7;
    BASIC_CYCLE[0x01] = 6;
    BASIC_CYCLE[0x02] = 2;
    BASIC_CYCLE[0x03] = 8;
    BASIC_CYCLE[0x04] = 3;
    BASIC_CYCLE[0x05] = 3;
    BASIC_CYCLE[0x06] = 5;
    BASIC_CYCLE[0x07] = 5;
    BASIC_CYCLE[0x08] = 3;
    BASIC_CYCLE[0x09] = 2;
    BASIC_CYCLE[0x0A] = 2;
    BASIC_CYCLE[0x0B] = 2;
    BASIC_CYCLE[0x0C] = 4;
    BASIC_CYCLE[0x0D] = 4;
    BASIC_CYCLE[0x0E] = 6;
    BASIC_CYCLE[0x0F] = 6;
    BASIC_CYCLE[0x10] = 2;
    BASIC_CYCLE[0x11] = 5;
    BASIC_CYCLE[0x12] = 2;
    BASIC_CYCLE[0x13] = 8;
    BASIC_CYCLE[0x14] = 4;
    BASIC_CYCLE[0x15] = 4;
    BASIC_CYCLE[0x16] = 6;
    BASIC_CYCLE[0x17] = 6;
    BASIC_CYCLE[0x18] = 2;
    BASIC_CYCLE[0x19] = 4;
    BASIC_CYCLE[0x1A] = 2;
    BASIC_CYCLE[0x1B] = 7;
    BASIC_CYCLE[0x1C] = 4;
    BASIC_CYCLE[0x1D] = 4;
    BASIC_CYCLE[0x1E] = 7;
    BASIC_CYCLE[0x1F] = 7;
    BASIC_CYCLE[0x20] = 6;
    BASIC_CYCLE[0x21] = 6;
    BASIC_CYCLE[0x22] = 2;
    BASIC_CYCLE[0x23] = 8;
    BASIC_CYCLE[0x24] = 3;
    BASIC_CYCLE[0x25] = 3;
    BASIC_CYCLE[0x26] = 5;
    BASIC_CYCLE[0x27] = 5;
    BASIC_CYCLE[0x28] = 4;
    BASIC_CYCLE[0x29] = 2;
    BASIC_CYCLE[0x2A] = 2;
    BASIC_CYCLE[0x2B] = 2;
    BASIC_CYCLE[0x2C] = 4;
    BASIC_CYCLE[0x2D] = 4;
    BASIC_CYCLE[0x2E] = 6;
    BASIC_CYCLE[0x2F] = 6;
    BASIC_CYCLE[0x30] = 2;
    BASIC_CYCLE[0x31] = 5;
    BASIC_CYCLE[0x32] = 2;
    BASIC_CYCLE[0x33] = 8;
    BASIC_CYCLE[0x34] = 4;
    BASIC_CYCLE[0x35] = 4;
    BASIC_CYCLE[0x36] = 6;
    BASIC_CYCLE[0x37] = 6;
    BASIC_CYCLE[0x38] = 2;
    BASIC_CYCLE[0x39] = 4;
    BASIC_CYCLE[0x3A] = 2;
    BASIC_CYCLE[0x3B] = 7;
    BASIC_CYCLE[0x3C] = 4;
    BASIC_CYCLE[0x3D] = 4;
    BASIC_CYCLE[0x3E] = 7;
    BASIC_CYCLE[0x3F] = 7;
    BASIC_CYCLE[0x40] = 6;
    BASIC_CYCLE[0x41] = 6;
    BASIC_CYCLE[0x42] = 2;
    BASIC_CYCLE[0x43] = 8;
    BASIC_CYCLE[0x44] = 3;
    BASIC_CYCLE[0x45] = 3;
    BASIC_CYCLE[0x46] = 5;
    BASIC_CYCLE[0x47] = 5;
    BASIC_CYCLE[0x48] = 3;
    BASIC_CYCLE[0x49] = 2;
    BASIC_CYCLE[0x4A] = 2;
    BASIC_CYCLE[0x4B] = 2;
    BASIC_CYCLE[0x4C] = 3;
    BASIC_CYCLE[0x4D] = 4;
    BASIC_CYCLE[0x4E] = 6;
    BASIC_CYCLE[0x4F] = 6;
    BASIC_CYCLE[0x50] = 2;
    BASIC_CYCLE[0x51] = 5;
    BASIC_CYCLE[0x52] = 2;
    BASIC_CYCLE[0x53] = 8;
    BASIC_CYCLE[0x54] = 4;
    BASIC_CYCLE[0x55] = 4;
    BASIC_CYCLE[0x56] = 6;
    BASIC_CYCLE[0x57] = 6;
    BASIC_CYCLE[0x58] = 2;
    BASIC_CYCLE[0x59] = 4;
    BASIC_CYCLE[0x5A] = 2;
    BASIC_CYCLE[0x5B] = 7;
    BASIC_CYCLE[0x5C] = 4;
    BASIC_CYCLE[0x5D] = 4;
    BASIC_CYCLE[0x5E] = 7;
    BASIC_CYCLE[0x5F] = 7;
    BASIC_CYCLE[0x60] = 6;
    BASIC_CYCLE[0x61] = 6;
    BASIC_CYCLE[0x62] = 2;
    BASIC_CYCLE[0x63] = 8;
    BASIC_CYCLE[0x64] = 3;
    BASIC_CYCLE[0x65] = 3;
    BASIC_CYCLE[0x66] = 5;
    BASIC_CYCLE[0x67] = 5;
    BASIC_CYCLE[0x68] = 4;
    BASIC_CYCLE[0x69] = 2;
    BASIC_CYCLE[0x6A] = 2;
    BASIC_CYCLE[0x6B] = 2;
    BASIC_CYCLE[0x6C] = 5;
    BASIC_CYCLE[0x6D] = 4;
    BASIC_CYCLE[0x6E] = 6;
    BASIC_CYCLE[0x6F] = 6;
    BASIC_CYCLE[0x70] = 2;
    BASIC_CYCLE[0x71] = 5;
    BASIC_CYCLE[0x72] = 2;
    BASIC_CYCLE[0x73] = 8;
    BASIC_CYCLE[0x74] = 4;
    BASIC_CYCLE[0x75] = 4;
    BASIC_CYCLE[0x76] = 6;
    BASIC_CYCLE[0x77] = 6;
    BASIC_CYCLE[0x78] = 2;
    BASIC_CYCLE[0x79] = 4;
    BASIC_CYCLE[0x7A] = 2;
    BASIC_CYCLE[0x7B] = 7;
    BASIC_CYCLE[0x7C] = 4;
    BASIC_CYCLE[0x7D] = 4;
    BASIC_CYCLE[0x7E] = 7;
    BASIC_CYCLE[0x7F] = 7;
    BASIC_CYCLE[0x80] = 2;
    BASIC_CYCLE[0x81] = 6;
    BASIC_CYCLE[0x82] = 2;
    BASIC_CYCLE[0x83] = 6;
    BASIC_CYCLE[0x84] = 3;
    BASIC_CYCLE[0x85] = 3;
    BASIC_CYCLE[0x86] = 3;
    BASIC_CYCLE[0x87] = 3;
    BASIC_CYCLE[0x88] = 2;
    BASIC_CYCLE[0x89] = 2;
    BASIC_CYCLE[0x8A] = 2;
    BASIC_CYCLE[0x8B] = 2;
    BASIC_CYCLE[0x8C] = 4;
    BASIC_CYCLE[0x8D] = 4;
    BASIC_CYCLE[0x8E] = 4;
    BASIC_CYCLE[0x8F] = 4;
    BASIC_CYCLE[0x90] = 2;
    BASIC_CYCLE[0x91] = 6;
    BASIC_CYCLE[0x92] = 2;
    BASIC_CYCLE[0x93] = 6;
    BASIC_CYCLE[0x94] = 4;
    BASIC_CYCLE[0x95] = 4;
    BASIC_CYCLE[0x96] = 4;
    BASIC_CYCLE[0x97] = 4;
    BASIC_CYCLE[0x98] = 2;
    BASIC_CYCLE[0x99] = 5;
    BASIC_CYCLE[0x9A] = 2;
    BASIC_CYCLE[0x9B] = 5;
    BASIC_CYCLE[0x9C] = 5;
    BASIC_CYCLE[0x9D] = 5;
    BASIC_CYCLE[0x9E] = 5;
    BASIC_CYCLE[0x9F] = 5;
    BASIC_CYCLE[0xA0] = 2;
    BASIC_CYCLE[0xA1] = 6;
    BASIC_CYCLE[0xA2] = 2;
    BASIC_CYCLE[0xA3] = 6;
    BASIC_CYCLE[0xA4] = 3;
    BASIC_CYCLE[0xA5] = 3;
    BASIC_CYCLE[0xA6] = 3;
    BASIC_CYCLE[0xA7] = 3;
    BASIC_CYCLE[0xA8] = 2;
    BASIC_CYCLE[0xA9] = 2;
    BASIC_CYCLE[0xAA] = 2;
    BASIC_CYCLE[0xAB] = 2;
    BASIC_CYCLE[0xAC] = 4;
    BASIC_CYCLE[0xAD] = 4;
    BASIC_CYCLE[0xAE] = 4;
    BASIC_CYCLE[0xAF] = 4;
    BASIC_CYCLE[0xB0] = 2;
    BASIC_CYCLE[0xB1] = 5;
    BASIC_CYCLE[0xB2] = 2;
    BASIC_CYCLE[0xB3] = 5;
    BASIC_CYCLE[0xB4] = 4;
    BASIC_CYCLE[0xB5] = 4;
    BASIC_CYCLE[0xB6] = 4;
    BASIC_CYCLE[0xB7] = 4;
    BASIC_CYCLE[0xB8] = 2;
    BASIC_CYCLE[0xB9] = 4;
    BASIC_CYCLE[0xBA] = 2;
    BASIC_CYCLE[0xBB] = 4;
    BASIC_CYCLE[0xBC] = 4;
    BASIC_CYCLE[0xBD] = 4;
    BASIC_CYCLE[0xBE] = 4;
    BASIC_CYCLE[0xBF] = 4;
    BASIC_CYCLE[0xC0] = 2;
    BASIC_CYCLE[0xC1] = 6;
    BASIC_CYCLE[0xC2] = 2;
    BASIC_CYCLE[0xC3] = 8;
    BASIC_CYCLE[0xC4] = 3;
    BASIC_CYCLE[0xC5] = 3;
    BASIC_CYCLE[0xC6] = 5;
    BASIC_CYCLE[0xC7] = 5;
    BASIC_CYCLE[0xC8] = 2;
    BASIC_CYCLE[0xC9] = 2;
    BASIC_CYCLE[0xCA] = 2;
    BASIC_CYCLE[0xCB] = 2;
    BASIC_CYCLE[0xCC] = 4;
    BASIC_CYCLE[0xCD] = 4;
    BASIC_CYCLE[0xCE] = 6;
    BASIC_CYCLE[0xCF] = 6;
    BASIC_CYCLE[0xD0] = 2;
    BASIC_CYCLE[0xD1] = 5;
    BASIC_CYCLE[0xD2] = 2;
    BASIC_CYCLE[0xD3] = 8;
    BASIC_CYCLE[0xD4] = 4;
    BASIC_CYCLE[0xD5] = 4;
    BASIC_CYCLE[0xD6] = 6;
    BASIC_CYCLE[0xD7] = 6;
    BASIC_CYCLE[0xD8] = 2;
    BASIC_CYCLE[0xD9] = 4;
    BASIC_CYCLE[0xDA] = 2;
    BASIC_CYCLE[0xDB] = 7;
    BASIC_CYCLE[0xDC] = 4;
    BASIC_CYCLE[0xDD] = 4;
    BASIC_CYCLE[0xDE] = 7;
    BASIC_CYCLE[0xDF] = 7;
    BASIC_CYCLE[0xE0] = 2;
    BASIC_CYCLE[0xE1] = 6;
    BASIC_CYCLE[0xE2] = 2;
    BASIC_CYCLE[0xE3] = 8;
    BASIC_CYCLE[0xE4] = 3;
    BASIC_CYCLE[0xE5] = 3;
    BASIC_CYCLE[0xE6] = 5;
    BASIC_CYCLE[0xE7] = 5;
    BASIC_CYCLE[0xE8] = 2;
    BASIC_CYCLE[0xE9] = 2;
    BASIC_CYCLE[0xEA] = 2;
    BASIC_CYCLE[0xEB] = 2;
    BASIC_CYCLE[0xEC] = 4;
    BASIC_CYCLE[0xED] = 4;
    BASIC_CYCLE[0xEE] = 6;
    BASIC_CYCLE[0xEF] = 6;
    BASIC_CYCLE[0xF0] = 2;
    BASIC_CYCLE[0xF1] = 5;
    BASIC_CYCLE[0xF2] = 2;
    BASIC_CYCLE[0xF3] = 8;
    BASIC_CYCLE[0xF4] = 4;
    BASIC_CYCLE[0xF5] = 4;
    BASIC_CYCLE[0xF6] = 6;
    BASIC_CYCLE[0xF7] = 6;
    BASIC_CYCLE[0xF8] = 2;
    BASIC_CYCLE[0xF9] = 4;
    BASIC_CYCLE[0xFA] = 2;
    BASIC_CYCLE[0xFB] = 7;
    BASIC_CYCLE[0xFC] = 4;
    BASIC_CYCLE[0xFD] = 4;
    BASIC_CYCLE[0xFE] = 7;
    BASIC_CYCLE[0xFF] = 7;
}
/*************************************************
 * 执行
 ************************************************/
function cpu_execute_one(fc) {
    fc.interfaces.before_execute(fc.argument, fc);
    const opcode = fc.read_cpu_address(fc.registers.program_counter++);
    fc.registers.program_counter &= 0xffff;
    let cycle_add = { count: 0 };
    switch (opcode)
    {
        case 0x00:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_BRK(fc, address, cycle_add);
            break;}
        case 0x01:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_ORA(fc, address, cycle_add);
            break;}
        case 0x02:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0x03:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_SLO(fc, address, cycle_add);
            break;}
        case 0x04:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x05:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_ORA(fc, address, cycle_add);
            break;}
        case 0x06:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_ASL(fc, address, cycle_add);
            break;}
        case 0x07:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_SLO(fc, address, cycle_add);
            break;}
        case 0x08:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_PHP(fc, address, cycle_add);
            break;}
        case 0x09:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_ORA(fc, address, cycle_add);
            break;}
        case 0x0A:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_ASLA(fc, address, cycle_add);
            break;}
        case 0x0B:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_ANC(fc, address, cycle_add);
            break;}
        case 0x0C:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x0D:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_ORA(fc, address, cycle_add);
            break;}
        case 0x0E:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_ASL(fc, address, cycle_add);
            break;}
        case 0x0F:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_SLO(fc, address, cycle_add);
            break;}
        case 0x10:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_REL(fc, cycle_add); operation_BPL(fc, address, cycle_add);
            break;}
        case 0x11:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_ORA(fc, address, cycle_add);
            break;}
        case 0x12:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0x13:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_SLO(fc, address, cycle_add);
            break;}
        case 0x14:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x15:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_ORA(fc, address, cycle_add);
            break;}
        case 0x16:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_ASL(fc, address, cycle_add);
            break;}
        case 0x17:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_SLO(fc, address, cycle_add);
            break;}
        case 0x18:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_CLC(fc, address, cycle_add);
            break;}
        case 0x19:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_ORA(fc, address, cycle_add);
            break;}
        case 0x1A:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x1B:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_SLO(fc, address, cycle_add);
            break;}
        case 0x1C:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x1D:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_ORA(fc, address, cycle_add);
            break;}
        case 0x1E:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_abx(fc, cycle_add); operation_ASL(fc, address, cycle_add);
            break;}
        case 0x1F:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_SLO(fc, address, cycle_add);
            break;}
        case 0x20:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_JSR(fc, address, cycle_add);
            break;}
        case 0x21:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_AND(fc, address, cycle_add);
            break;}
        case 0x22:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0x23:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_RLA(fc, address, cycle_add);
            break;}
        case 0x24:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_BIT(fc, address, cycle_add);
            break;}
        case 0x25:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_AND(fc, address, cycle_add);
            break;}
        case 0x26:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_ROL(fc, address, cycle_add);
            break;}
        case 0x27:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_RLA(fc, address, cycle_add);
            break;}
        case 0x28:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_PLP(fc, address, cycle_add);
            break;}
        case 0x29:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_AND(fc, address, cycle_add);
            break;}
        case 0x2A:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_ROLA(fc, address, cycle_add);
            break;}
        case 0x2B:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_ANC(fc, address, cycle_add);
            break;}
        case 0x2C:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_BIT(fc, address, cycle_add);
            break;}
        case 0x2D:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_AND(fc, address, cycle_add);
            break;}
        case 0x2E:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_ROL(fc, address, cycle_add);
            break;}
        case 0x2F:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_RLA(fc, address, cycle_add);
            break;}
        case 0x30:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_REL(fc, cycle_add); operation_BMI(fc, address, cycle_add);
            break;}
        case 0x31:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_AND(fc, address, cycle_add);
            break;}
        case 0x32:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0x33:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_RLA(fc, address, cycle_add);
            break;}
        case 0x34:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x35:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_AND(fc, address, cycle_add);
            break;}
        case 0x36:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_ROL(fc, address, cycle_add);
            break;}
        case 0x37:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_RLA(fc, address, cycle_add);
            break;}
        case 0x38:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_SEC(fc, address, cycle_add);
            break;}
        case 0x39:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_AND(fc, address, cycle_add);
            break;}
        case 0x3A:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x3B:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_RLA(fc, address, cycle_add);
            break;}
        case 0x3C:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x3D:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_AND(fc, address, cycle_add);
            break;}
        case 0x3E:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_abx(fc, cycle_add); operation_ROL(fc, address, cycle_add);
            break;}
        case 0x3F:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_RLA(fc, address, cycle_add);
            break;}
        case 0x40:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_RTI(fc, address, cycle_add);
            break;}
        case 0x41:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_EOR(fc, address, cycle_add);
            break;}
        case 0x42:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0x43:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_SRE(fc, address, cycle_add);
            break;}
        case 0x44:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x45:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_EOR(fc, address, cycle_add);
            break;}
        case 0x46:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_LSR(fc, address, cycle_add);
            break;}
        case 0x47:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_SRE(fc, address, cycle_add);
            break;}
        case 0x48:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_PHA(fc, address, cycle_add);
            break;}
        case 0x49:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_EOR(fc, address, cycle_add);
            break;}
        case 0x4A:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_LSRA(fc, address, cycle_add);
            break;}
        case 0x4B:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_ASR(fc, address, cycle_add);
            break;}
        case 0x4C:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_JMP(fc, address, cycle_add);
            break;}
        case 0x4D:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_EOR(fc, address, cycle_add);
            break;}
        case 0x4E:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_LSR(fc, address, cycle_add);
            break;}
        case 0x4F:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_SRE(fc, address, cycle_add);
            break;}
        case 0x50:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_REL(fc, cycle_add); operation_BVC(fc, address, cycle_add);
            break;}
        case 0x51:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_EOR(fc, address, cycle_add);
            break;}
        case 0x52:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0x53:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_SRE(fc, address, cycle_add);
            break;}
        case 0x54:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x55:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_EOR(fc, address, cycle_add);
            break;}
        case 0x56:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_LSR(fc, address, cycle_add);
            break;}
        case 0x57:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_SRE(fc, address, cycle_add);
            break;}
        case 0x58:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_CLI(fc, address, cycle_add);
            break;}
        case 0x59:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_EOR(fc, address, cycle_add);
            break;}
        case 0x5A:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x5B:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_SRE(fc, address, cycle_add);
            break;}
        case 0x5C:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x5D:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_EOR(fc, address, cycle_add);
            break;}
        case 0x5E:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_abx(fc, cycle_add); operation_LSR(fc, address, cycle_add);
            break;}
        case 0x5F:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_SRE(fc, address, cycle_add);
            break;}
        case 0x60:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_RTS(fc, address, cycle_add);
            break;}
        case 0x61:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_ADC(fc, address, cycle_add);
            break;}
        case 0x62:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0x63:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_RRA(fc, address, cycle_add);
            break;}
        case 0x64:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x65:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_ADC(fc, address, cycle_add);
            break;}
        case 0x66:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_ROR(fc, address, cycle_add);
            break;}
        case 0x67:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_RRA(fc, address, cycle_add);
            break;}
        case 0x68:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_PLA(fc, address, cycle_add);
            break;}
        case 0x69:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_ADC(fc, address, cycle_add);
            break;}
        case 0x6A:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_RORA(fc, address, cycle_add);
            break;}
        case 0x6B:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_ARR(fc, address, cycle_add);
            break;}
        case 0x6C:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IND(fc, cycle_add); operation_JMP(fc, address, cycle_add);
            break;}
        case 0x6D:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_ADC(fc, address, cycle_add);
            break;}
        case 0x6E:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_ROR(fc, address, cycle_add);
            break;}
        case 0x6F:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_RRA(fc, address, cycle_add);
            break;}
        case 0x70:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_REL(fc, cycle_add); operation_BVS(fc, address, cycle_add);
            break;}
        case 0x71:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_ADC(fc, address, cycle_add);
            break;}
        case 0x72:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0x73:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_RRA(fc, address, cycle_add);
            break;}
        case 0x74:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x75:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_ADC(fc, address, cycle_add);
            break;}
        case 0x76:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_ROR(fc, address, cycle_add);
            break;}
        case 0x77:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_RRA(fc, address, cycle_add);
            break;}
        case 0x78:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_SEI(fc, address, cycle_add);
            break;}
        case 0x79:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_ADC(fc, address, cycle_add);
            break;}
        case 0x7A:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x7B:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_RRA(fc, address, cycle_add);
            break;}
        case 0x7C:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x7D:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_ADC(fc, address, cycle_add);
            break;}
        case 0x7E:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_abx(fc, cycle_add); operation_ROR(fc, address, cycle_add);
            break;}
        case 0x7F:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_RRA(fc, address, cycle_add);
            break;}
        case 0x80:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x81:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_STA(fc, address, cycle_add);
            break;}
        case 0x82:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x83:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_SAX(fc, address, cycle_add);
            break;}
        case 0x84:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_STY(fc, address, cycle_add);
            break;}
        case 0x85:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_STA(fc, address, cycle_add);
            break;}
        case 0x86:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_STX(fc, address, cycle_add);
            break;}
        case 0x87:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_SAX(fc, address, cycle_add);
            break;}
        case 0x88:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_DEY(fc, address, cycle_add);
            break;}
        case 0x89:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0x8A:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_TXA(fc, address, cycle_add);
            break;}
        case 0x8B:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_XAA(fc, address, cycle_add);
            break;}
        case 0x8C:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_STY(fc, address, cycle_add);
            break;}
        case 0x8D:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_STA(fc, address, cycle_add);
            break;}
        case 0x8E:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_STX(fc, address, cycle_add);
            break;}
        case 0x8F:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_SAX(fc, address, cycle_add);
            break;}
        case 0x90:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_REL(fc, cycle_add); operation_BCC(fc, address, cycle_add);
            break;}
        case 0x91:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_STA(fc, address, cycle_add);
            break;}
        case 0x92:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0x93:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_AHX(fc, address, cycle_add);
            break;}
        case 0x94:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_STY(fc, address, cycle_add);
            break;}
        case 0x95:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_STA(fc, address, cycle_add);
            break;}
        case 0x96:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPY(fc, cycle_add); operation_STX(fc, address, cycle_add);
            break;}
        case 0x97:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPY(fc, cycle_add); operation_SAX(fc, address, cycle_add);
            break;}
        case 0x98:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_TYA(fc, address, cycle_add);
            break;}
        case 0x99:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_aby(fc, cycle_add); operation_STA(fc, address, cycle_add);
            break;}
        case 0x9A:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_TXS(fc, address, cycle_add);
            break;}
        case 0x9B:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_TAS(fc, address, cycle_add);
            break;}
        case 0x9C:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_SHY(fc, address, cycle_add);
            break;}
        case 0x9D:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_abx(fc, cycle_add); operation_STA(fc, address, cycle_add);
            break;}
        case 0x9E:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_SHX(fc, address, cycle_add);
            break;}
        case 0x9F:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_AHX(fc, address, cycle_add);
            break;}
        case 0xA0:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_LDY(fc, address, cycle_add);
            break;}
        case 0xA1:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_LDA(fc, address, cycle_add);
            break;}
        case 0xA2:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_LDX(fc, address, cycle_add);
            break;}
        case 0xA3:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_LAX(fc, address, cycle_add);
            break;}
        case 0xA4:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_LDY(fc, address, cycle_add);
            break;}
        case 0xA5:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_LDA(fc, address, cycle_add);
            break;}
        case 0xA6:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_LDX(fc, address, cycle_add);
            break;}
        case 0xA7:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_LAX(fc, address, cycle_add);
            break;}
        case 0xA8:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_TAY(fc, address, cycle_add);
            break;}
        case 0xA9:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_LDA(fc, address, cycle_add);
            break;}
        case 0xAA:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_TAX(fc, address, cycle_add);
            break;}
        case 0xAB:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_LAX(fc, address, cycle_add);
            break;}
        case 0xAC:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_LDY(fc, address, cycle_add);
            break;}
        case 0xAD:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_LDA(fc, address, cycle_add);
            break;}
        case 0xAE:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_LDX(fc, address, cycle_add);
            break;}
        case 0xAF:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_LAX(fc, address, cycle_add);
            break;}
        case 0xB0:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_REL(fc, cycle_add); operation_BCS(fc, address, cycle_add);
            break;}
        case 0xB1:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_LDA(fc, address, cycle_add);
            break;}
        case 0xB2:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0xB3:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_LAX(fc, address, cycle_add);
            break;}
        case 0xB4:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_LDY(fc, address, cycle_add);
            break;}
        case 0xB5:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_LDA(fc, address, cycle_add);
            break;}
        case 0xB6:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPY(fc, cycle_add); operation_LDX(fc, address, cycle_add);
            break;}
        case 0xB7:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPY(fc, cycle_add); operation_LAX(fc, address, cycle_add);
            break;}
        case 0xB8:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_CLV(fc, address, cycle_add);
            break;}
        case 0xB9:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_LDA(fc, address, cycle_add);
            break;}
        case 0xBA:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_TSX(fc, address, cycle_add);
            break;}
        case 0xBB:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_LAS(fc, address, cycle_add);
            break;}
        case 0xBC:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_LDY(fc, address, cycle_add);
            break;}
        case 0xBD:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_LDA(fc, address, cycle_add);
            break;}
        case 0xBE:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_LDX(fc, address, cycle_add);
            break;}
        case 0xBF:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_LAX(fc, address, cycle_add);
            break;}
        case 0xC0:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_CPY(fc, address, cycle_add);
            break;}
        case 0xC1:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_CMP(fc, address, cycle_add);
            break;}
        case 0xC2:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0xC3:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_DCP(fc, address, cycle_add);
            break;}
        case 0xC4:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_CPY(fc, address, cycle_add);
            break;}
        case 0xC5:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_CMP(fc, address, cycle_add);
            break;}
        case 0xC6:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_DEC(fc, address, cycle_add);
            break;}
        case 0xC7:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_DCP(fc, address, cycle_add);
            break;}
        case 0xC8:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_INY(fc, address, cycle_add);
            break;}
        case 0xC9:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_CMP(fc, address, cycle_add);
            break;}
        case 0xCA:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_DEX(fc, address, cycle_add);
            break;}
        case 0xCB:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_AXS(fc, address, cycle_add);
            break;}
        case 0xCC:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_CPY(fc, address, cycle_add);
            break;}
        case 0xCD:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_CMP(fc, address, cycle_add);
            break;}
        case 0xCE:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_DEC(fc, address, cycle_add);
            break;}
        case 0xCF:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_DCP(fc, address, cycle_add);
            break;}
        case 0xD0:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_REL(fc, cycle_add); operation_BNE(fc, address, cycle_add);
            break;}
        case 0xD1:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_CMP(fc, address, cycle_add);
            break;}
        case 0xD2:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0xD3:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_DCP(fc, address, cycle_add);
            break;}
        case 0xD4:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0xD5:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_CMP(fc, address, cycle_add);
            break;}
        case 0xD6:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_DEC(fc, address, cycle_add);
            break;}
        case 0xD7:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_DCP(fc, address, cycle_add);
            break;}
        case 0xD8:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_CLD(fc, address, cycle_add);
            break;}
        case 0xD9:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_CMP(fc, address, cycle_add);
            break;}
        case 0xDA:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0xDB:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_DCP(fc, address, cycle_add);
            break;}
        case 0xDC:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0xDD:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_CMP(fc, address, cycle_add);
            break;}
        case 0xDE:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_abx(fc, cycle_add); operation_DEC(fc, address, cycle_add);
            break;}
        case 0xDF:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_DCP(fc, address, cycle_add);
            break;}
        case 0xE0:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_CPX(fc, address, cycle_add);
            break;}
        case 0xE1:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_SBC(fc, address, cycle_add);
            break;}
        case 0xE2:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0xE3:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INX(fc, cycle_add); operation_ISB(fc, address, cycle_add);
            break;}
        case 0xE4:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_CPX(fc, address, cycle_add);
            break;}
        case 0xE5:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_SBC(fc, address, cycle_add);
            break;}
        case 0xE6:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_INC(fc, address, cycle_add);
            break;}
        case 0xE7:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPG(fc, cycle_add); operation_ISB(fc, address, cycle_add);
            break;}
        case 0xE8:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_INX(fc, address, cycle_add);
            break;}
        case 0xE9:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_SBC(fc, address, cycle_add);
            break;}
        case 0xEA:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0xEB:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMM(fc, cycle_add); operation_SBC(fc, address, cycle_add);
            break;}
        case 0xEC:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_CPX(fc, address, cycle_add);
            break;}
        case 0xED:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_SBC(fc, address, cycle_add);
            break;}
        case 0xEE:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_INC(fc, address, cycle_add);
            break;}
        case 0xEF:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABS(fc, cycle_add); operation_ISB(fc, address, cycle_add);
            break;}
        case 0xF0:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_REL(fc, cycle_add); operation_BEQ(fc, address, cycle_add);
            break;}
        case 0xF1:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_SBC(fc, address, cycle_add);
            break;}
        case 0xF2:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_UNK(fc, cycle_add); operation_UNK(fc, address, cycle_add);
            break;}
        case 0xF3:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_INY(fc, cycle_add); operation_ISB(fc, address, cycle_add);
            break;}
        case 0xF4:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0xF5:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_SBC(fc, address, cycle_add);
            break;}
        case 0xF6:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_INC(fc, address, cycle_add);
            break;}
        case 0xF7:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ZPX(fc, cycle_add); operation_ISB(fc, address, cycle_add);
            break;}
        case 0xF8:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_SED(fc, address, cycle_add);
            break;}
        case 0xF9:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_SBC(fc, address, cycle_add);
            break;}
        case 0xFA:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_IMP(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0xFB:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABY(fc, cycle_add); operation_ISB(fc, address, cycle_add);
            break;}
        case 0xFC:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_NOP(fc, address, cycle_add);
            break;}
        case 0xFD:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_SBC(fc, address, cycle_add);
            break;}
        case 0xFE:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_abx(fc, cycle_add); operation_INC(fc, address, cycle_add);
            break;}
        case 0xFF:
        {cycle_add.count += BASIC_CYCLE[opcode]; const address = addressing_ABX(fc, cycle_add); operation_ISB(fc, address, cycle_add);
            break;}
    }
    fc.cpu_cycle_count += cycle_add.count;
}

module.exports.cpu_execute_one = cpu_execute_one;

function operation_NMI(fc, address) {
    const pch = (fc.registers.program_counter >> 8);
    const pcl = fc.registers.program_counter & 0xff;
    push(fc, pch);
    push(fc, pcl);
    push(fc, fc.registers.program_counter | FLAG_R);
    IF_SE(fc);
    const pcl2 = fc.read_cpu_address(VECTOR_NMI + 0);
    const pch2 = fc.read_cpu_address(VECTOR_NMI + 1);
    fc.registers.program_counter = pcl2 | pch2 << 8;

    fc.cpu_cycle_count += 7;
}

module.exports.operation_NMI = operation_NMI;