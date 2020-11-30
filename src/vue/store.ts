import Vue from "vue";
import Vuex from "vuex";
import { OpenDialogReturnValue, remote } from "electron";
import router from "./router";
import AdmZip from "adm-zip";


Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        currentFile: undefined,
        layers: undefined
    },
    mutations: {
        openGerber(state, filePath:string) {
            state.currentFile = filePath;

            const zip = new AdmZip(filePath);
            const zipEntries = zip.getEntries();
            state.layers = zipEntries.map(zipe => ({
                filename: zipe.name,
                gerber: zipe.getData()
            }));
            console.log(state.layers);
        }
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
    }
});
