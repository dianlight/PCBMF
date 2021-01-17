import { IProject } from "@/models/project";
import { Module } from "vuex";
import { IRootState } from "../store";
import { getField, updateField } from 'vuex-map-fields';
import { PcbLayer } from "@/models/pcblayer";
import { ipcRenderer , Menu, MenuItem, remote } from "electron";
import localforage from "localforage";


import AdmZip from "adm-zip";
import path from "path";

// Module
export const projectModule: Module<IProject, IRootState> = {
    namespaced: true,
    state: ()=>(
        {
            md5: undefined,
            basedir: undefined,
            name: undefined,
            layers: [],
            config: {
                useOutline: true,
                blankType: undefined,
                pcbSize: {
                    x: undefined,
                    y: undefined
                },
                isolations: {},
                drills: {},
                outlines: {},
                coppers: {},
            }
        } as IProject), 
        mutations: {
//            RESTORE_MUTATION: vuexProjectPersist.RESTORE_MUTATION,  
            updateField,
            md5sign(state: IProject, md5: string):void {
                state.md5 = md5;
            },
            updateLayer(state: IProject, layer: PcbLayer):void {
                const clayer = state.layers?.find(clayer => clayer.filename === layer.filename);
                if (clayer) {
                    clayer.enabled = layer.enabled;
                    clayer.side = layer.side;
                    clayer.type = layer.type;
                } else {
                    console.error("Wrong Match!", layer, state.layers);
                }
            },    
            setProjectName(state: IProject, cpath: string | undefined):void {
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
            new(state:IProject):void {
                void localforage.clear();
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
            open(state:IProject, filePath: string):void {
                void localforage.clear();
                const zip = new AdmZip(filePath);
                Object.assign(state, JSON.parse(zip.getEntry('project.json').getData().toString(),
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
                console.log(state);
                remote.app.addRecentDocument(filePath);
            },
            save(state:IProject):void {
                const zip = new AdmZip();
                zip.addFile("project.json",
                    Buffer.from(JSON.stringify(state)),
                    "Main project file");
                zip.writeZip(path.join(state.basedir as string, (state.name as string) + ".pcbmf"));
                remote.app.addRecentDocument(path.join(state.basedir as string, (state.name as string) + ".pcbmf"));
            },
            removeGerber(state:IProject, pcb: PcbLayer):void {
                state.layers?.splice(state.layers.findIndex(layer => layer.filename === pcb.filename), 1);
            },
            addGerber(state:IProject, pcb: PcbLayer):void {
                const index = state.layers?.findIndex(layer => layer.filename === pcb.filename);
                if (index != undefined && index >= 0) {
                    pcb.id = index;
                    state.layers?.splice(index, 1, pcb);
                } else {
                    pcb.id = state.layers?.length || 0;
                    state.layers?.push(pcb);
                }
            },
    
        },  
        getters: {
            getField
        },
    
};
