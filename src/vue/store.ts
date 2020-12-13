import Vue from "vue";
import Vuex from "vuex";
import { OpenDialogReturnValue, remote } from "electron";
import router from "./router";
import AdmZip from "adm-zip";
import { getField, updateField } from 'vuex-map-fields';
import VuexPersistence from 'vuex-persist';
import { PcbLayers } from "@/models/pcblayer";


Vue.use(Vuex);

interface IDictionary<T> {
    [index: string]: T;
  }

interface State {
    currentFile: string | undefined,
    layers: PcbLayers[] | undefined,
    config: {
        useOutline: boolean;
        pcb: {
            blankType: string | undefined,
            height: number | undefined,
            width: number | undefined
        },
        isolation: {
            toolType: IDictionary<any> | undefined,
            dthickness: IDictionary<number> | undefined,
            doutline: IDictionary<number> | undefined,
        }
    }
}

export default new Vuex.Store<State>({
    state:
    {
        currentFile: undefined,
        layers: undefined,
        config: {
            useOutline: true,
            pcb: {
                blankType: undefined,
                height: undefined,
                width: undefined
            },
            isolation: {
                toolType: {},
                dthickness: {},
                doutline: {}
            }
        }
    },
    plugins: [new VuexPersistence().plugin],
    strict: process.env.NODE_ENV !== 'production',
    getters: {
        getField
    },
    mutations: {
        updateField,
        openGerber(state, filePath: string) {
            state.currentFile = filePath;

            const zip = new AdmZip(filePath);
            const zipEntries = zip.getEntries();
            state.layers = zipEntries.map(zipe => ({
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
