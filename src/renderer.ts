

import { ipcRenderer } from "electron";
import './index.css';
import Vue from "vue";
import vueNcform from "@ncform/ncform";
import { TightCNC } from "./tightcnc/ThightCNC";
//import yaml from "yaml";
import { ApplicationMenu } from "./os/ApplicationMenu";
import router from "./vue/router";
import store from "./vue/store";
import app from "./vue/components/app.vue";

import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import ncformStdComps from '@ncform/ncform-theme-elementui';
//import axios from 'axios';
import hljs from "highlight.js";
import "highlight.js/styles/github.css"
//import gcode "highlight.js/lib/languages/gcode"; 
//import ThreeDViewer from "vue-3d-viewer";
import { i18n } from "./vue/i18n";

hljs.registerLanguage("gcode",require("highlight.js/lib/languages/gcode"));

const locale = require('element-ui/lib/locale/lang/en');

Vue.use(ElementUI, {locale});
Vue.use(vueNcform, {extComponents: ncformStdComps, lang: i18n });
Vue.use(hljs.vuePlugin);
//(window as any).hljs = hljs;


ipcRenderer.addListener("open",(args)=>{
    store.dispatch('open',args[0]);
});

//Vue.use(ThreeDViewer);

// Worker Test
/*
const worker = new Worker();

worker.postMessage({ a: 1 });
worker.onmessage = (event) => { console.log("From Warker!",event)};


(window as any).$http = Vue.prototype.$http = axios;
*/

//const tight_path = path.join(__dirname, "node_modules","tightcnc","bin","tightcnc-server.js");


var config: TightCNC.Config = {
    enableServer: true,
    authKey: "123Minni",
    controller: TightCNC.Controllers.grbl,
    host: "http://localhost",
    serverPort: 12345,
    controllers: {
        grbl: {
            baudRate: 115200,
            dataBits: 8,
            parity: "none",
            port: '/dev/null',
            stopBits: 1,
            usedAxes: [true, true, true],
            homableAxes: [true, true, true]
        }
    }
}
/*
ipcRenderer.invoke("StartTightCNC",config).then((pid) => {
    console.log("PID",pid);
    const tight_client = new TightCNC.Client(config);
    tight_client.op("getStatus").then( (result)=> {
        console.log(result)
    }).catch( (err)=>{
        console.error(err);
    });
}).catch((err) => {
    document.getElementById('error').textContent = err.message;
});
*/

new ApplicationMenu("PCB Mini Factory");

/**
 * Locales support
 */

const appvue = new Vue({
    i18n,
    el: '#app',
    router,
    store,
    render: h => h(app),
});




