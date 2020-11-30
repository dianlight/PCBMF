import Vue from "vue";
import Vuex from "vuex";
import { OpenDialogReturnValue, remote } from "electron";
import router from "./router";
import AdmZip from "adm-zip";
import { getField, updateField } from 'vuex-map-fields';
import VuexPersistence from 'vuex-persist';



Vue.use(Vuex);

interface State {
    currentFile: string|undefined,
    layers: {filename: string, gerber: Buffer}[]| undefined,
    config: {
        useOutline: boolean;
    }
}

export default new Vuex.Store<State>({
    state: {
        currentFile: undefined,
        layers: undefined,
        config: {
            useOutline: true,
        }
    },
    plugins: [new VuexPersistence().plugin],
    strict: process.env.NODE_ENV !== 'production',
    getters:{
        getField
    },
    mutations: {
        updateField,
        openGerber(state, filePath:string) {
            state.currentFile = filePath;

            const zip = new AdmZip(filePath);
            const zipEntries = zip.getEntries();
            state.layers = zipEntries.map(zipe => ({
                filename: zipe.name,
                gerber: zipe.getData()
            }));
            console.log(state.layers);
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
                    console.log("Dialog Open!",value);
                    if(!value.canceled){
                        context.commit('openGerber',value.filePaths[0]);
                        if(router.currentRoute.path !== '/wizard/config')
                            router.push('/wizard/config');
                    }
                });

        }
    },
});
