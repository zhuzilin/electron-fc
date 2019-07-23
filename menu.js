"use strict"
const { dialog } = require('electron'); // Load the dialogs component of the OS
const fs = require('fs'); // Load the File System to execute our common tasks (CRUD)

module.exports.template = function(app, shell, win) {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Load',
            accelerator: 'CmdOrCtrl+L',
            click: function () {
                dialog.showOpenDialog({
                    filters: [
                        { name: 'NES ROM', extensions: ['nes'] },
                      ]
                }, (fileNames) => {
                  // fileNames is an array that contains all the selected
                  if(fileNames === undefined){
                    console.log("No file selected");
                    return;
                  }
                  console.log(fileNames);
                  win.send('load', fileNames);
                });
            }
          },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: function(item, focusedWindow) {
              if (focusedWindow)
                focusedWindow.reload();
            }
          },
        ]
      },
      {
        label: 'Help',
        role: 'help',
        submenu: [
          {
            label: 'Learn More',
            click: function() { shell.openExternal('https://github.com/zhuzilin/electron-fc') }
          },
        ]
      },
    ];
  
    if (process.platform === 'darwin') {
      const name = app.getName();
      template.unshift({
        label: name,
        submenu: [
          {
            label: 'About ' + name,
            role: 'about'
          },
          {
            type: 'separator'
          },
          {
            label: 'Services',
            role: 'services',
            submenu: []
          },
          {
            type: 'separator'
          },
          {
            label: 'Hide ' + name,
            accelerator: 'Command+H',
            role: 'hide'
          },
          {
            label: 'Hide Others',
            accelerator: 'Command+Shift+H',
            role: 'hideothers'
          },
          {
            label: 'Show All',
            role: 'unhide'
          },
          {
            type: 'separator'
          },
          {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: function() { app.quit(); }
          },
        ]
      });
      const windowMenu = template.find(function(m) { return m.role === 'window' })
      if (windowMenu) {
        windowMenu.submenu.push(
          {
            type: 'separator'
          },
          {
            label: 'Bring All to Front',
            role: 'front'
          }
        );
      }
    }
  
    return template;
  }