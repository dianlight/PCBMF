import Store from "electron-store";
import { ipcMain, ipcRenderer } from 'electron';
import {isRenderer} from '@/os/isElectron';

class fsstore {
    private store!: Store;

    constructor() {
        if (!isRenderer()) {
            this.store = new Store();
            ipcMain.handle('getStoreValue', (_event, key, defaultValue) => {
                return this.store.get(key,defaultValue);
            });
            ipcMain.handle('setStoreValue', (_event, key, value) => {
                return this.store.set(key,value);
            });
        }
    }

    public async get<T>(key: string, defaultValue?:T): Promise<T> {
        if (isRenderer()) {
            return ipcRenderer.invoke('getStoreValue', key,defaultValue) as Promise<T>;
        } else {
            return new Promise<T>((resolve) => {
                resolve(this.store.get(key,defaultValue) as T);
            });
        }
    }

    public async set<T>(key:string|Partial<T>, value?:T):Promise<T|void>{
        if (isRenderer()) {
            return ipcRenderer.invoke('setStoreValue', key, value) as Promise<T>;
        } else {
            return new Promise<void>((resolve) => {
                if(value){
                this.store.set(key as string,value);
                } else {
                    this.store.set(key as Partial<T>);
                }
                resolve();
            });
        }
    }

}

export default new fsstore();
