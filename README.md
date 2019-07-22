# electron-fc
A electron based famicom(NES) emulator.

![super mario bro](https://github.com/zhuzilin/electron-fc/blob/master/img/sm.gif?raw=true) ![super mario bro](https://github.com/zhuzilin/electron-fc/blob/master/img/pacman.gif?raw=true)

## How to start the game
```
yarn
yarn start
```
For now, if you want to change game, please change the directory in `js/famicom.js`. And only mapper 000 (NROM) games are supported.
## Control
The basic control is:

W, A, S, D: up, left, down, right,

J: A, K: B, U: select, I: start

## Acknowledgement
The emulator is mainly base on [StepFC](https://github.com/dustpg/StepFC). If you know Chinese, it is an excellent tutorial on writing fc emulator!

## TODOs
Tons of work undone, like mappers, audio. Will continue after I find a job😛.
