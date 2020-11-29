/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import { ipcRenderer } from "electron";
import tableify from "tableify";
import "xel/themes/macos.css";
import "xel/xel.min.js";
import './index.css';
import fs from "fs";
import path from "path";
import pcbStackup from "pcb-stackup";
import AdmZip from "adm-zip";
import Vue from "vue";
import { TightCNC } from "./tightcnc/ThightCNC";
import yaml from "yaml";
import menubar from "./vue/menubar.vue";
import { ApplicationMenu } from "./os/ApplicationMenu";

console.log('👋 This message is being logged by "renderer.js", included via webpack');

/*
ipcRenderer.invoke("SerialPort.List").then((ports) => {
    document.getElementById('error').textContent = ''
    if (ports.length === 0) {
        document.getElementById('error').textContent = 'No ports discovered'
    }
    const tableHTML = tableify(ports)
    document.getElementById('ports').innerHTML = tableHTML
}).catch((err) => {
    document.getElementById('error').textContent = err.message;
});
*/
// ZipTest
const zip = new AdmZip("/Users/ltarantino/Documents/factory/my-new-app/test/zip/Gerber_PCB_2020-11-15_21-25-43_2020-11-21_00-18-45.zip");
const zipEntries = zip.getEntries();
const layers = zipEntries.map( zipe => ({
    filename: zipe.name,
    gerber: zipe.getData()
}));

pcbStackup(layers, {
    useOutline: false
}).then(stackup => {
//    document.getElementById('topsvg').innerHTML = stackup.top.svg;
//    document.getElementById('bottomsvg').innerHTML = stackup.bottom.svg;
//    console.log(stackup.top.svg);
//    console.log(stackup.bottom.svg);
}).catch( (err)=> console.error(err));

//const tight_path = path.join(__dirname, "node_modules","tightcnc","bin","tightcnc-server.js");


var config:TightCNC.Config = {
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
            usedAxes: [ true, true, true ],
            homableAxes: [ true, true, true ]
        }
    }
}
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

new ApplicationMenu("PCB Mini Factory");

const appvue = new Vue({
    el: '#app',
    data: {
        message: "yamlstr"
    },
    template: `
        <div>
            <menubar/>
        </div>
    `,
    components: {
        menubar,
    }
});


