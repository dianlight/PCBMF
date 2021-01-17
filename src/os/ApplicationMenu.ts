import router from "../vue/router";
import { MenuItem, remote, shell } from "electron";
import store from "../vue/store/store";
import {i18n} from "@/vue/i18n";

export class ApplicationMenu {

    constructor(name: string) {
        const { Menu } = remote;

        const isMac = process.platform === 'darwin'

        const template = [
            ...(isMac ? [{
              label: name,
              role: 'appMenu',
              submenu: [
                { role: 'about' },
                { type: 'separator' },
                { label: i18n.t("menu.app.preferencies"), click:()=>router.push('/preferencies')},
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
              label: i18n.t('menu.file.title'),
              role: 'fileMenu',
              submenu: [
                { label: i18n.t("menu.file.newProject"), click:()=>store.dispatch('new')},
                { label: i18n.t("menu.file.newProjectFrom"), 
                  submenu:[
                    { label: i18n.t("menu.file.gerberFolder"),enabled:false},
                    { label: i18n.t("menu.file.gerberZip"), click:()=>store.dispatch('openGerberZip')},
                  ]},
                { type: 'separator' },  
                { label: i18n.t("menu.file.openProject"), click:()=>store.dispatch('open') },
                ...(isMac ? [
                { label: i18n.t("menu.file.openRecent"), 
                  role: "recentDocuments",
                  submenu:[
                     { type: 'separator' },
                     { label: i18n.t("menu.file.clearRecent") , role: "clearRecentDocuments"},
                   ]
                }]:[]),
                { type: 'separator' },  
                { id:"save", label: i18n.t("menu.file.save"), click:()=>store.dispatch('save'), enabled:false},
                { label: i18n.t("menu.file.saveAs"), click:()=>store.dispatch('saveAs')},
                { type: 'separator' },  
                { id:"import", label: i18n.t("menu.file.import"), click:()=>store.dispatch('importGerber'), enabled:false }, 
                { type: 'separator' }, 
                { id:"close", label: i18n.t("menu.file.closeProject"), click:()=>store.dispatch('close'), enabled:false},
                  ...(isMac ? [                   
                ]:[
                  { type: 'separator' },  
                  { label: i18n.t("menu.app.preferencies"), click:()=>router.push('/preferencies')},
                ]),
                { type: 'separator' },  
                isMac ? { role: 'close' } : { role: 'quit' }
              ]
            },
            {
              label: i18n.t('manu.edit.title'),
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
                    label: i18n.t('manu.edit.speech.title'),
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
              label: i18n.t('manu.view.title'),
              role: 'viewMenu',
              submenu: [
                ...(
                (process.env.NODE_ENV !== 'production')?  
                [
                  { role: 'reload' },
                  { role: 'forceReload' },
                  { role: 'toggleDevTools' }
                ]:[]
                ),
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
              ]
            },
            {
              label: i18n.t('manu.project.title'),
              id: 'project',
              submenu: [
                { label: i18n.t("menu.project.properties"), enabled:false ,click:()=>router.push('/project') },
                { label: i18n.t('menu.project.wizard'), enabled:false ,click:()=>router.push('/wizard/config') },
                { type: 'separator' },
                { label: i18n.t('menu.project.run'), enabled:false },
              ]
            },
            {
              label: i18n.t('menu.window.title'),
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
                  label: i18n.t('manu.help.learn-more'),
                  click: async () => {
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