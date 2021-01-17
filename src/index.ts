import { app, ipcMain, BrowserWindow, session } from 'electron';
import log from "electron-log";
import path from "path";
import SerialPort from "serialport";
import { fork } from "child_process";
import yaml from "yaml";
import fs from "fs";
import "@/fsstore";
import packagejson from "../package.json";
import { EvWindow } from "evwt/background";
import update from "update-electron-app";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Log config
Object.assign(console, log.functions);

if (process.env.NODE_ENV !== 'production') {
  log.transports.file.level = false;
  log.transports.console.level = "debug";
} else {
  log.transports.file.level = "verbose";
  log.transports.console.level = false;
}


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

/** Auto Update Feature **NEED APP SIGNED** */
update({
  repo: "dianlight/PCBMF",
  logger: log
});


let mainWindow:BrowserWindow;

/*
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
*/

// eslint-disable-next-line @typescript-eslint/require-await
async function createWindow():Promise<void> {
  const options = {
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
  };
  const restoreId = 'main';
  const evWindow = new EvWindow(restoreId,options);
  mainWindow = evWindow.browserWindow;
  mainWindow.setTitle(packagejson.productName);

  // and load the index.html of the app.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (process.env.NODE_ENV !== 'production') {
    // Open the DevTools.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    require('vue-devtools')
    .install()
    mainWindow.webContents.openDevTools();
  }

  // eslint-disable-next-line @typescript-eslint/unbound-method
  mainWindow.once('ready-to-show', mainWindow.show)
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// eslint-disable-next-line @typescript-eslint/no-misused-promises
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
    void createWindow();
  }
});

// MacOs Specific
app.on('will-finish-launching',(event:any)=>{
//  console.log("App Event",event);
  app.on("open-file", (event,path)=>{
//    console.log("Richiesto openfile",path);
    mainWindow.webContents.send("open",[path])
    event.preventDefault();
  })
  /*
  app.on("open-url", (event,path)=>{
    console.log("Richiesto openUrl",path);
    ipcMain.emit("open",[path])
  })
  */
});




// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
ipcMain.handle('SerialPort.List', () => {
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

  return tightcnc.pid;
});

ipcMain.handle("changeTitle",(event,...args) => {
  if(args.length == 0 || !args[0]){
    mainWindow.setTitle(packagejson.productName+" | ");
  } else {
    mainWindow.setTitle(`${packagejson.productName} | ${args[0] as string}`);
  }
});

ipcMain.handle("dirty",(event,...args) => {
  const title = mainWindow.getTitle();
//  console.log("Message for file dirty?",args[0]);
  if(args[0]){
    mainWindow.setTitle(title.replace(" | "," |*"));
  } else {
    mainWindow.setTitle(title.replace(" |*"," | "))
  }
});

ipcMain.handle('wokerLisy', (/*event, ...args*/): number => {
  console.log(session.defaultSession.serviceWorkers.getAllRunning());
  return Object.keys(session.defaultSession.serviceWorkers.getAllRunning()).length;
});

