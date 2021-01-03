import router from "../vue/router";
import { MenuItem, remote } from "electron";
import store from "../vue/store";

export class ApplicationMenu {

    constructor(name: string) {
        const { Menu, MenuItem } = remote;

        const isMac = process.platform === 'darwin'

        const template = [
            ...(isMac ? [{
              label: name,
              role: 'appMenu',
              submenu: [
                { role: 'about' },
                { type: 'separator' },
                { label: "Preferences...", click:()=>router.push('/preferencies')},
                { type: 'separator' },  
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
              ]
            }] : []),
            {
              label: 'File',
              role: 'fileMenu',
              submenu: [
                { label: "New Project", click:()=>store.dispatch('new')},
                { label: "New Project from", 
                  submenu:[
                    { label: "Gerber Folder...",enabled:false},
                    { label: "Gerber Zip...", click:()=>store.dispatch('openGerberZip')},
                  ]},
                { type: 'separator' },  
                { label: "Open Project...", click:()=>store.dispatch('open') },
                ...(isMac ? [
                { label: "Open Recent", 
                  role: "recentDocuments",
                  submenu:[
                     { type: 'separator' },
                     { label: 'Clear Recently Opened' , role: "clearRecentDocuments"},
                   ]
                }]:[]),
                { type: 'separator' },  
                { id:"save", label: "Save Project", click:()=>store.dispatch('save'), enabled:false},
                { label: "Save Project As...", click:()=>store.dispatch('saveAs')},
                { type: 'separator' },  
                { id:"import", label: "Import...", click:()=>store.dispatch('importGerber'), enabled:false }, 
                { type: 'separator' }, 
                { id:"close", label: "Close Project", click:()=>store.dispatch('close'), enabled:false},
                  ...(isMac ? [                   
                ]:[
                  { type: 'separator' },  
                  { label: "Preferences...", click:()=>router.push('/preferencies')},
                ]),
                { type: 'separator' },  
                isMac ? { role: 'close' } : { role: 'quit' }
              ]
            },
            {
              label: 'Edit',
              role: 'editMenu',
              submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                  { role: 'pasteAndMatchStyle' },
                  { role: 'delete' },
                  { role: 'selectAll' },
                  { type: 'separator' },
                  {
                    label: 'Speech',
                    submenu: [
                      { role: 'startSpeaking' },
                      { role: 'stopSpeaking' }
                    ]
                  }
                ] : [
                  { role: 'delete' },
                  { type: 'separator' },
                  { role: 'selectAll' }
                ])
              ]
            },
            {
              label: 'View',
              role: 'viewMenu',
              submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
              ]
            },
            {
              label: 'Project',
              id: 'project',
              submenu: [
                { label: 'Properties...', enabled:false ,click:()=>router.push('/project') },
                { label: 'Wizard...', enabled:false ,click:()=>router.push('/wizard/config') },
                { type: 'separator' },
                { label: 'Run...', enabled:false },
              ]
            },
            {
              label: 'Window',
              role: 'windowMenu',
              submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                  { type: 'separator' },
                  { role: 'front' },
                  { type: 'separator' },
                  { role: 'window' }
                ] : [
                  { role: 'close' }
                ])
              ]
            },
            {
              role: 'help',
              submenu: [
                {
                  label: 'Learn More',
                  click: async () => {
                    const { shell } = require('electron')
                    await shell.openExternal('https://electronjs.org')
                  }
                }
              ]
            }
          ];
          
          const menu = Menu.buildFromTemplate(template as unknown as MenuItem[]);
          Menu.setApplicationMenu(menu);       
    }

}