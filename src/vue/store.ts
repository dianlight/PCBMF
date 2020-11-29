import Vue from "vue";
import Vuex from "vuex";
import { OpenDialogReturnValue, remote } from "electron";


Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        currentFile: undefined
    },
    mutations: {
        openGerber(state, filePath:string) {
            state.currentFile = filePath;
            console.log("New state",state);
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
                    }
                });

        }
    }
});
