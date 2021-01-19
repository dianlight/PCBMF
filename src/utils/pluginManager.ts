import { pluginContainer } from "@/ioc/ioc.config";
import { GenericPlugin } from "@/modules/genericPlugin";
import { PluginManager as LivePluginManager } from "live-plugin-manager";
import { remote } from "electron"
import { SubEvent } from 'sub-events';

export interface PluginManagerEvent {
    type: 'load'|'unload';
    key: string;
    plugin?: GenericPlugin;
}

export const eventManager:SubEvent<PluginManagerEvent> = new SubEvent()

export class PluginManager {

    manager = new LivePluginManager({
        cwd: remote.app.getPath("appData")
    });

    context = require.context("../modules", true, /\.plugin\.ts$/i);

    constructor(){
        this.loadLocalModules();
        // Hot updates
        if (module.hot) {
            module.hot.accept(this.context.id, () => {
                this.loadLocalModules();
                module.hot?.accept();
            });
        }
    }

    list():GenericPlugin[]{
        const plugins = pluginContainer.resolveAll("genericPlugin") as GenericPlugin[];
        return plugins;
        /*
            .sort( (a,b) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                return semverCompare(a.version,b.version) as number
            } )
        */
    }   
    
    // Automatic Module loader from src/module
    loadLocalModules():void {
    
       // console.log("Trovati i seguenti moduli da caricare:",this.context.keys());
    
        this.context.keys()
            .forEach(key => {
                console.log(`Loading Plugin: ${key}....`);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                const plugin:GenericPlugin = this.context(key)["default"] as GenericPlugin;
                this.register(key,plugin);
            
        });
    }        

    register(key:string,plugin:GenericPlugin):void{
        pluginContainer.unregister("genericPlugin",{tags: [key]});   
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        pluginContainer.register("genericPlugin",this.context(key)["default"],{ tags: [key]});                     
        eventManager.emit({
            type: 'load',
            key: key,
            plugin: plugin
        })    
    }

    unregister(key:string):void {
        pluginContainer.unregister("genericPlugin",{tags: [key]});   
        eventManager.emit({
            type: 'unload',
            key: key
        })    
    }

}