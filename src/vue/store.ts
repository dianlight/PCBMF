import Vue from "vue";
import Vuex, { Plugin, Store } from "vuex";
import { OpenDialogReturnValue, SaveDialogReturnValue, remote, BrowserWindow, Menu, MenuItem, ipcRenderer } from "electron";
import router from "./router";
import AdmZip from "adm-zip";
import { getField, updateField } from 'vuex-map-fields';
import VuexPersistence from 'vuex-persist';
import { IProject } from "@/models/project";
import path from "path";
import fs from 'fs';

import crypto from "crypto";
import { PcbLayer } from "@/models/pcblayer";


Vue.use(Vuex);

const vuexPersist = new VuexPersistence<IProject>({
    strictMode: true, // This **MUST** be set to true
    storage: sessionStorage,
    //    reducer: (state) => ({ dog: state.dog }),
    //    filter: (mutation) => mutation.type === 'dogBark'
});


class VuexDirtyStatus {
    dirty = false;
    prevState = "";

    plugin: Plugin<IProject> = (store) => {
        store.subscribe((mutation, state) => {
            let newDirty = false;
            switch (mutation.type) {
                case "md5sign":
                    return;
                case 'save':
                case 'open':
                case 'setProjectName':
                    newDirty = false;
                    break;
                default:
                    if (this.dirty) return;
                    newDirty = true;
                    break;
            }
            const actual = crypto.createHash('sha1').update(JSON.stringify(state)).digest("hex");
            if (actual !== this.prevState) {
                //              console.log("Mutato oggetto!", mutation.type, actual, this.prevState,
                //              crypto.createHash('sha1').update(JSON.stringify(state)).digest("hex"));
                this.prevState = actual;
                this.dirty = newDirty;
                void ipcRenderer.invoke("dirty", this.dirty);
                store.commit("md5sign", actual);
            }
        })
    }

    isDirty(): boolean {
        return this.dirty;
    }

}

export const vuexDirtyStatus = new VuexDirtyStatus();


export default new Vuex.Store<IProject>({
    state:
    {
        md5: undefined,
        basedir: undefined,
        name: undefined,
        layers: [],
        config: {
            useOutline: true,
            pcb: {
                blankType: undefined,
                height: undefined,
                width: undefined
            },
            isolations: [],
            drills: [],
            outlines: [],
            coppers: [],
        }
    },
    plugins: [vuexPersist.plugin, vuexDirtyStatus.plugin],
    strict: process.env.NODE_ENV !== 'production',
    getters: {
        getField
    },
    mutations: {
        RESTORE_MUTATION: vuexPersist.RESTORE_MUTATION,
        updateField,
        md5sign(state, md5: string) {
            state.md5 = md5;
        },
        openGerber(state, filePath: string) {
            switch (path.extname(filePath).toLowerCase()) {
                case "":
                    console.log("OpenFolder?");
                    break;
                case ".zip": {
                    const zip = new AdmZip(filePath);
                    const zipEntries = zip.getEntries();

                    zipEntries.map((zipe, index) => ({
                        id: index,
                        name: zipe.name.replace(/[^a-zA-Z]/g, "_"),
                        enabled: true,
                        filename: zipe.name,
                        gerber: zipe.getData(),
                        side: undefined,
                        type: undefined
                    }))
                        .forEach(pcb => (this as unknown as Store<IProject>).commit("addGerber", pcb));
                }
                    break;
                case ".gtl":
                case ".gbl":
                case ".gto":
                case ".gts":
                case ".gbs":
                case ".gko":
                case ".drl":
                default:
                    fs.readFile(filePath, (err, data) => {
                        (this as unknown as Store<IProject>).commit("addGerber", {
                            id: state.layers?.length,
                            name: path.basename(filePath).replace(/[^a-zA-Z]/g, "_"),
                            enabled: true,
                            filename: path.basename(filePath),
                            gerber: data,
                            side: undefined,
                            type: undefined
                        });
                    });
                    break;
            }
            //            state.currentFile = filePath;
            //            console.log(this,state.layers);
        },
        updateLayer(state, layer: PcbLayer) {
            const clayer = state.layers?.find(clayer => clayer.filename === layer.filename);
            if (clayer) {
                clayer.enabled = layer.enabled;
                clayer.side = layer.side;
                clayer.type = layer.type;
            } else {
                console.error("Wrong Match!", layer, state.layers);
            }
        },
        setProjectName(state, cpath: string | undefined) {
            if (cpath) {
                state.basedir = path.dirname(cpath);
                state.name = path.basename(cpath, path.extname(cpath));
                void ipcRenderer.invoke("changeTitle", state.name);
                ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("project") as MenuItem).submenu?.items.forEach(menu => menu.enabled = true);
                ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("save") as MenuItem).enabled = true;
                ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("import") as MenuItem).enabled = true;
                ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("close") as MenuItem).enabled = true;
            } else {
                state.basedir = undefined;
                state.name = undefined;
                void ipcRenderer.invoke("changeTitle", undefined);
                ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("project") as MenuItem).submenu?.items.forEach(menu => menu.enabled = false);
                ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("save") as MenuItem).enabled = false;
                ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("import") as MenuItem).enabled = false;
                ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("close") as MenuItem).enabled = false;
            }
        },
        new(state) {
            void ipcRenderer.invoke("changeTitle", undefined);
            Object.assign(state, {
                basedir: undefined,
                name: undefined,
                currentFile: undefined,
                layers: [],
                config: {
                    useOutline: true,
                    pcb: {
                        blankType: undefined,
                        height: undefined,
                        width: undefined
                    },
                    isolations: [],
                    drills: [],
                    outlines: [],
                    coppers: [],
                }
            });
            ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("project") as MenuItem).submenu?.items.forEach(menu => menu.enabled = true);
            ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("import") as MenuItem).enabled = true;
            ((remote.Menu.getApplicationMenu() as Menu).getMenuItemById("close") as MenuItem).enabled = true;
        },
        open(state, filePath: string) {
            const zip = new AdmZip(filePath);
            Object.assign(state, JSON.parse(zip.getEntry('project').getData().toString(),
                function (k, v) {
                    if (v !== null &&
                        typeof v === "object" &&
                        "type" in v &&
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        v.type === "Buffer" &&
                        "data" in v &&
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        Array.isArray(v.data)) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        return Buffer.from(v.data);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return v;
                }
            ));
            remote.app.addRecentDocument(filePath);
        },
        save(state) {
            const zip = new AdmZip();
            zip.addFile("project",
                Buffer.from(JSON.stringify(this.state)),
                "Main project file");
            zip.writeZip(path.join(state.basedir as string, (state.name as string) + ".pcbmf"));
            remote.app.addRecentDocument(path.join(state.basedir as string, (state.name as string) + ".pcbmf"));
        },
        removeGerber(state, pcb: PcbLayer) {
            state.layers?.splice(state.layers.findIndex(layer => layer.filename === pcb.filename), 1);
        },
        addGerber(state, pcb: PcbLayer) {
            const index = state.layers?.findIndex(layer => layer.filename === pcb.filename);
            console.log(pcb.filename, index);
            if (index != undefined && index >= 0) {
                pcb.id = index;
                state.layers?.splice(index, 1, pcb);
            } else {
                pcb.id = state.layers?.length || 0;
                state.layers?.push(pcb);
            }
        },
    },
    actions: {
        open(context, payload) {
            if (payload) {
                context.commit('open', payload);
                context.commit('setProjectName', payload);
                if (router.currentRoute.path !== '/project')
                    void router.push('/project');
            } else {
                context.commit('new');
                void remote.dialog.showOpenDialog({ filters: [{ name: "PCBMF Progject", extensions: ['pcbmf', 'PCBMF'] }], properties: ['openFile'] })
                    .then((value: OpenDialogReturnValue) => {
                        if (!value.canceled) {
                            context.commit('open', value.filePaths[0]);
                            context.commit('setProjectName', value.filePaths[0]);
                            if (router.currentRoute.path !== '/project')
                                void router.push('/project');
                        }
                    });
            }
        },
        importGerber(context) {
            void remote.dialog.showOpenDialog({
                filters: [
                    { name: "All supported", extensions: ['zip', 'drl', 'gtl', 'gbl', 'gto', 'gts', 'gbs', 'gko'] },
                    { name: "Gerber Zip", extensions: ['zip'] },
                    { name: "Gerber Files", extensions: ['gtl', 'gbl', 'gto', 'gts', 'gbs', 'gko'] },
                    { name: "Drill Files", extensions: ['drl'] },
                ], properties: ['openFile', 'multiSelections']
            })
                .then((value: OpenDialogReturnValue) => {
                    if (!value.canceled) {
                        value.filePaths.forEach(path => {
                            context.commit('openGerber', path);
                        });
                        if (router.currentRoute.path !== '/project')
                            void router.push('/project');
                    }
                });
        },
        openGerberZip(context) {
            context.commit('new');
            void remote.dialog.showOpenDialog({ filters: [{ name: "Gerber Zip", extensions: ['zip'] }], properties: ['openFile'] })
                .then((value: OpenDialogReturnValue) => {
                    if (!value.canceled) {
                        context.commit('setProjectName', value.filePaths[0]);
                        context.commit('openGerber', value.filePaths[0]);
                        if (router.currentRoute.path !== '/wizard/config')
                            void router.push('/wizard/config');
                    }
                });
        },
        new(context) {
            context.commit('new');
            if (router.currentRoute.path !== '/project')
                void router.push('/project');
        },
        save(context) {
            context.commit('save');
        },
        saveAs(context) {
            void remote.dialog.showSaveDialog({ filters: [{ name: "PCBMF Progject", extensions: ['pcbmf', 'PCBMF'] }], properties: ['showOverwriteConfirmation', 'createDirectory'] })
                .then((value: SaveDialogReturnValue) => {
                    if (!value.canceled) {
                        const cpath = path.normalize(value.filePath as string);
                        context.commit('setProjectName', cpath);
                        context.commit('save');
                    }
                });
        },
        close(context) {
            if (vuexDirtyStatus.isDirty()) {
                void remote.dialog.showMessageBox(remote.BrowserWindow.getFocusedWindow() as BrowserWindow, {
                    message: "Save project before close?",
                    buttons: ["Save", "Ignore", "Abort"]
                }).then(value => {
                    if (value.response == 0) {
                        console.log("Save before new");
                        context.commit('save');
                    } else if (value.response == 2) {
                        return;
                    }
                    context.commit('new');
                    if (router.currentRoute.path !== '/')
                        void router.push('/');
                });
            } else {
                context.commit('new');
                if (router.currentRoute.path !== '/')
                    void router.push('/');
            }
        }
    },
});
