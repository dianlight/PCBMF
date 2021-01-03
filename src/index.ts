import { app, ipcMain, BrowserWindow } from 'electron';
import log from "electron-log";
import path from "path";
import SerialPort from "serialport";
import { fork, spawn, ChildProcess } from "child_process";
import yaml from "yaml";
import fs from "fs";
import FSStore from "@/fsstore";
import packagejson from "../package.json";
declare const MAIN_WINDOW_WEBPACK_ENTRY: any;


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

/** Auto Update Feature **NEED APP SIGNED** */
require('update-electron-app')({
  logger: log
});


/* SerialPort.list().then((ports) => {
  if (ports.length === 0) {
    console.info('No ports discovered');
  }

  console.log(ports);
}).catch((err) => {
  console.error(err.message);
}); */

let mainWindow:BrowserWindow;

async function createWindow() {
  let opts = {
    height: 600,
    width: 800,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      nodeIntegrationInWorker: true,
      //      preload: path.join(__dirname, 'preload.js')
    }
  }


  Object.assign(opts, await FSStore.get('winBounds'));
  //console.log("winBounds:",opts);
  // Create the browser window.
  mainWindow = new BrowserWindow(opts);
  mainWindow.setTitle(packagejson.productName);

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (process.env.NODE_ENV !== 'production') {
    // Open the DevTools.
    require('vue-devtools').install()
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', mainWindow.show)

  // save window size and position
  mainWindow.on('close', () => {
    FSStore.set('winBounds', mainWindow.getBounds())
  })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  //  if (process.platform !== 'darwin') {
  app.quit();
  //  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});



// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
ipcMain.handle('SerialPort.List', (event, ...args) => {
  return SerialPort.list();
});

const tight_path = path.join(__dirname, "node_modules", "tightcnc", "bin", "tightcnc-server.js");

console.info("CurrendDir:", __dirname);
console.log("tmp path is:", app.getPath("temp"));

const tightcnc_conf = path.join(app.getPath("temp"), "tightcnc.conf");

const tightcnc_env = Object.assign(process.env, {
  "TIGHTCNC_CONFIG": tightcnc_conf
});

//console.log(process.argv[0]);


ipcMain.handle('StartTightCNC', (event, ...args) => {
  console.log(tightcnc_env['TIGHTCNC_CONFIG']);
  //  console.log("0",typeof args[0], yaml.stringify(args[0]));
  //  console.log("1",typeof args[1], args[1]);
  fs.writeFileSync(tightcnc_conf, yaml.stringify(args[0]));
  //  const tightcnc = spawn(process.argv[0], [tight_path], {
  const tightcnc = fork(tight_path, {
    env: tightcnc_env,
    silent: true,
    //    stdio: ['pipe','pipe', 'ipc']
  }).on("error", (error) => {
    console.error("TightCNC Error:", error);
  }).on("close", (code) => {
    console.error("TightCNC Exit code", code);
  });

  tightcnc.stderr?.on('data', (data: Buffer) => {
    console.error("E:", data.toString());
  });

  tightcnc.stdout?.on('data', (data: Buffer) => {
    console.info("O", data.toString());
  });

  app.on('quit', () => {
    tightcnc.kill("SIGTERM");
  });

  // MacOs Specific
  app.on("open-file", (event,path)=>{
    console.log("Richiesto openfile",path);
    ipcMain.emit("open",[path])
  })

  return tightcnc.pid;
});

ipcMain.handle("changeTitle",(event,...args) => {
  if(args.length == 0 || !args[0]){
    mainWindow.setTitle(packagejson.productName+" | ");
  } else {
    mainWindow.setTitle(packagejson.productName+" | "+args[0]);
  }
});

ipcMain.handle("dirty",(event,...args) => {
  let title = mainWindow.getTitle();
  console.log("Message for file dirty?",args[0]);
  if(args[0]){
    mainWindow.setTitle(title.replace(" | "," |*"));
  } else {
    mainWindow.setTitle(title.replace(" |*"," | "))
  }
});

/**
 * Save a TMP file.
 *
ipcMain.handle('saveTempFile', (event, ...args) => {

});
*/
