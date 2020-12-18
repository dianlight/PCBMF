import Vue from "vue";
import Vuex from "vuex";
import { OpenDialogReturnValue, remote } from "electron";
import router from "./router";
import AdmZip from "adm-zip";
import { getField, updateField } from 'vuex-map-fields';
import VuexPersistence from 'vuex-persist';
import { PcbLayers } from "@/models/pcblayer";
import { IProject } from "@/models/project";


Vue.use(Vuex);

const vuexPersist = new VuexPersistence<any>({
    strictMode: true, // This **MUST** be set to true
    storage: sessionStorage,
//    reducer: (state) => ({ dog: state.dog }),
//    filter: (mutation) => mutation.type === 'dogBark'
});

export default new Vuex.Store<IProject>({
    state:
    {
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
        }
    },
    plugins: [vuexPersist.plugin],
    strict: process.env.NODE_ENV !== 'production',
    getters: {
        getField
    },
    mutations: {
        RESTORE_MUTATION: vuexPersist.RESTORE_MUTATION,
        updateField,
        openGerber(state, filePath: string) {
            state.currentFile = filePath;

            const zip = new AdmZip(filePath);
            const zipEntries = zip.getEntries();
            state.layers = zipEntries.map((zipe,index) => ({
                id: index,
                name: zipe.name.replace(/[^a-zA-Z]/g, "_"),
                enabled: true,
                filename: zipe.name,
                gerber: zipe.getData(),
                side: undefined,
                type: undefined
            }));
            //console.log(state.layers);
        },
        updateLayer(state, layer: any) {
            let clayer = state!.layers?.find(clayer => clayer.filename === layer.filename);
            if(clayer){
                clayer.enabled = layer.enabled;
                clayer.side = layer.side;
                clayer.type = layer.type;
            } else {
                console.error("Wrong Match!", layer, state.layers);
            }
        },
        /*
        update_gerber(state, values){
            console.log("--> Store received!", values);
            Object.assign(state.gerber,values);
        }
        */
    },
    actions: {
        openGerber(context) {
            const { dialog } = remote;
            dialog.showOpenDialog({ filters: [{ name: "Gerber Zip", extensions: ['zip', 'ZIP'] }], properties: ['openFile'] })
                .then((value: OpenDialogReturnValue) => {
                   // console.log("Dialog Open!", value);
                    if (!value.canceled) {
                        context.commit('openGerber', value.filePaths[0]);
                        if (router.currentRoute.path !== '/wizard/config')
                            router.push('/wizard/config');
                    }
                });

        }
    },
});
