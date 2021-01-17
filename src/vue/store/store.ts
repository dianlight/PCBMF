import Vue from "vue";
import Vuex, { ActionTree, ModuleTree, Plugin, Store } from "vuex";
import { OpenDialogReturnValue, SaveDialogReturnValue, remote, BrowserWindow, ipcRenderer } from "electron";
import router from "@/vue/router";
import AdmZip from "adm-zip";
import { getField, updateField } from 'vuex-map-fields';
import VuexPersistence, { AsyncStorage } from 'vuex-persist';
import { IProject } from "@/models/project";
import path from "path";
import fs from 'fs';
import localforage from "localforage";

import crypto from "crypto";

import { projectModule } from "./modules/project";


Vue.use(Vuex);

export interface IRootState {
    root: boolean;
    version: string;
}

const modules: ModuleTree<IRootState> = {
    project: projectModule,
}

// Cancel old storage
void localforage.clear();

const vuexProjectPersist = new VuexPersistence<IProject>({
    key: "project",
    strictMode: true, // This **MUST** be set to true
    storage: localforage as AsyncStorage,
    asyncStorage: true,
    modules: ['project']
    // reducer: (state) => ({ dog: state.dog }),
    //    filter: (mutation) => mutation.type === 'dogBark'
});

/*
const vuexPersist = new VuexPersistence<IRootState>({
    strictMode: true, // This **MUST** be set to true
    storage: sessionStorage,    
    //    reducer: (state) => ({ dog: state.dog }),
    //    filter: (mutation) => mutation.type === 'dogBark'
});
*/


class VuexDirtyStatus {
    dirty = false;
    prevState = "";

    plugin: Plugin<IRootState> = (store) => {
        store.subscribe((mutation, state) => {
            let newDirty = false;
           // console.log("->",mutation);
            switch (mutation.type) {
                case "project/md5sign":
                    return;
                case 'project/save':
                case 'project/open':
                case 'project/setProjectName':
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
                store.commit("project/md5sign", actual);
            }
        })
    }

    isDirty(): boolean {
        return this.dirty;
    }

}

export const vuexDirtyStatus = new VuexDirtyStatus();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default new Vuex.Store<any>({
    modules: modules,
    plugins: [vuexProjectPersist.plugin,/*vuexPersist.plugin,*/ vuexDirtyStatus.plugin ],
    strict: process.env.NODE_ENV !== 'production',
    getters: {
        getField
    },
    mutations: {
        RESTORE_MUTATION: vuexProjectPersist.RESTORE_MUTATION,  
        updateField,
        openGerber(state, filePath: string):void {
            switch (path.extname(filePath).toLowerCase()) {
                case "":
                    console.warn("OpenFolder?");
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
                        .forEach(pcb => (this as unknown as Store<IProject>).commit("project/addGerber", pcb));
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
                        this.commit("project/addGerber", {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
                            id: state.project.layers?.length,
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
    },
    actions: {
        open(context, payload):void {
            //console.log("Request Open!")
            if (payload) {
                context.commit('project/open', payload);
                context.commit('project/setProjectName', payload);
                if (router.currentRoute.path !== '/project')
                    void router.push('/project');
            } else {
                context.commit('project/new');
                void remote.dialog.showOpenDialog({ filters: [{ name: "PCBMF Progject", extensions: ['pcbmf', 'PCBMF'] }], properties: ['openFile'] })
                    .then((value: OpenDialogReturnValue) => {
                        if (!value.canceled) {
                            context.commit('project/open', value.filePaths[0]);
                            context.commit('project/setProjectName', value.filePaths[0]);
                            if (router.currentRoute.path !== '/project')
                                void router.push('/project');
                        }
                    });
            }
        },
        importGerber(context):void {
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
            context.commit('project/new');
            void remote.dialog.showOpenDialog({ filters: [{ name: "Gerber Zip", extensions: ['zip'] }], properties: ['openFile'] })
                .then((value: OpenDialogReturnValue) => {
                    if (!value.canceled) {
                        context.commit('project/setProjectName', value.filePaths[0]);
                        context.commit('project/openGerber', value.filePaths[0]);
                        if (router.currentRoute.path !== '/wizard/config')
                            void router.push('/wizard/config');
                    }
                });
        },
        new(context):void {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            context.commit('project/new');
            if (router.currentRoute.path !== '/project')
                void router.push('/project');
        },
        save(context):void {
            context.commit('project/save');
        },
        saveAs(context):void {
            void remote.dialog.showSaveDialog({ filters: [{ name: "PCBMF Progject", extensions: ['pcbmf', 'PCBMF'] }], properties: ['showOverwriteConfirmation', 'createDirectory'] })
                .then((value: SaveDialogReturnValue) => {
                    if (!value.canceled) {
                        const cpath = path.normalize(value.filePath as string);
                        context.commit('project/setProjectName', cpath);
                        context.commit('project/save');
                    }
                });
        },
        close(context):void {
            if (vuexDirtyStatus.isDirty()) {
                void remote.dialog.showMessageBox(remote.BrowserWindow.getFocusedWindow() as BrowserWindow, {
                    message: "Save project before close?",
                    buttons: ["Save", "Ignore", "Abort"]
                }).then(value => {
                    if (value.response == 0) {
                    //    console.log("Save before new");
                        context.commit('project/save');
                    } else if (value.response == 2) {
                        return;
                    }
                    context.commit('project/new');
                    if (router.currentRoute.path !== '/')
                        void router.push('/');
                });
            } else {
                context.commit('project/new');
                if (router.currentRoute.path !== '/')
                    void router.push('/');
            }
        }
    } as ActionTree<IProject,IRootState>,
});