import { pluginContainer } from "@/ioc/ioc.config";
import { GenericPlugin } from "@/modules/genericPlugin";
import { PluginManager as LivePluginManager } from "live-plugin-manager";
import { remote } from "electron"
import { SubEvent } from 'sub-events';
import FSStore from "@/fsstore";

// Local Plugins
import GerberToGeoJSON from "@/modules/gerberToGeoJson/gerberToGeoJson.plugin";
import GeoJSONToGcode from "@/modules/geoJSONToGCode/geoJsonToGCode.plugin";

export interface PluginManagerEvent {
    type: 'load'|'unload';
    key: string;
    plugin?: PluginDescriptor;
}

export const eventManager:SubEvent<PluginManagerEvent> = new SubEvent()

/**
 * export interface IPluginInfo {

    readonly name: string;
    readonly description: string;
    readonly version: string;

}

 */
export interface PluginDescriptor extends GenericPlugin {
    enabled: boolean,
    repositoryType: 'internal'|'npm'|'github'|'path',
    installedVersion: string,
    repository: string,
  }  

export class PluginManager {

    plugins:Record<string,PluginDescriptor> = {}

    manager = new LivePluginManager({
        cwd: remote.app.getPath("appData")
    });

    constructor(){
        void FSStore.get("data.plugins", {} as Record<string,PluginDescriptor> ).then( (data)=>{
            this.plugins = data;
            this.loadLocalModules();
            this.loadRemoteModules();
        });
    }

    list():Record<string,PluginDescriptor>{
        return this.plugins;
    }   
    
    // Automatic Module loader from src/module
    loadLocalModules():void {
        this.register(GerberToGeoJSON.name,GerberToGeoJSON,{});
        this.register(GeoJSONToGcode.name,GeoJSONToGcode,{});
    }  
    
    load(plugin:PluginDescriptor): void {
        switch(plugin.repositoryType){
            case 'path':
                try {
                void this.loadPath(plugin.repository,plugin);
                } catch (error){
                    console.error(error);
                    plugin.enabled = false;
                    plugin.installedVersion = 'Error'
                }
                break;
            case 'npm':
                try {
                void this.loadNPM(plugin.name,plugin.version,plugin);
                } catch (error){
                    console.error(error);
                    plugin.enabled = false;
                    plugin.installedVersion = 'Error'
                }
                break;
            case 'github':
                try {
                void this.loadGitHub(plugin.repository,plugin);
                } catch (error){
                    console.error(error);
                    plugin.enabled = false;
                    plugin.installedVersion = 'Error'
                }
                break;
                default:
                throw new Error(`Type ${plugin.repositoryType} is not yet supported!`);    
        }
    }
    
    loadRemoteModules():void {
        Object.values(this.plugins)
            .filter( plugin => plugin.repository !== 'internal' && plugin.enabled)
            .forEach( plugin => {
                this.load(plugin);
            });
            /*
        FSStore.get("data.plugins", {} as Record<string,PluginDescriptor> ).then((data) => {
            Object.assign(data, this.pluginManager.list());
            this.plugins = data;
            console.log("---->", data);
          });
        FSStore.set("data.plugins", this.$data.plugins);
        */
    }

    async loadPath(pluginPath:string,descriptor:Partial<PluginDescriptor>):Promise<void>{
        const info = await this.manager.installFromPath(pluginPath);
     //   console.log("Original Info:",info);
        try {
            const plugin = this.manager.require(info.name) as GenericPlugin;
            descriptor.repository = pluginPath;
            descriptor.repositoryType='path';
            Object.assign(info,descriptor);
     //       console.log("evaluted info",info);
            this.register(info.name,plugin,info);
        } catch (error) {
            console.error(error);
            void this.manager.uninstall(info.name);
            throw error;
        }
    }

    async loadNPM(name:string,version:string|undefined,descriptor:Partial<PluginDescriptor>):Promise<void>{
        const info = await this.manager.installFromNpm(name,version);
     //   console.log(info);
        try {
            const plugin = this.manager.require(info.name) as GenericPlugin;
     //       console.log(plugin);
            descriptor.repository = "NPM Registry";
            descriptor.repositoryType='npm';
            Object.assign(info,descriptor);
            this.register(info.name,plugin,info);
        } catch (error) {
            console.error(error);
            void this.manager.uninstall(info.name);
            throw error;
        }
    }

    async loadGitHub(repository:string,descriptor:Partial<PluginDescriptor>):Promise<void>{
        const info = await this.manager.installFromGithub(repository);
     //   console.log(info);
        try {
            const plugin = this.manager.require(info.name) as GenericPlugin;
    //        console.log(plugin);
            descriptor.repository = repository;
            descriptor.repositoryType='github';
            Object.assign(info,descriptor);
            this.register(info.name,plugin,info);
        } catch (error) {
            console.error(error);
            void this.manager.uninstall(info.name);
            throw error;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private register(key:string,plugin:any,descriptor:Partial<PluginDescriptor>):void{
        pluginContainer.unregister("genericPlugin",{tags: [key]});   
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        pluginContainer.register("genericPlugin",plugin,{ tags: [key]}); 

   //     console.log("---->Go on--->",key,descriptor);
        // Check for load and pluginlist pouliation.
        (pluginContainer.resolveAll("genericPlugin") as GenericPlugin[])
         //   .map( (pp)=>{ console.log("**",pp); return pp})
            .filter( cplugin => cplugin.name === key ).forEach( cplugin=>{
                console.log("Registering plugin!",key);
                this.plugins[key] = {
                    description: cplugin.description,
                    enabled: true,
                    installedVersion: cplugin.version,
                    name: cplugin.name,
                    repository: descriptor.repository || 'internal',
                    repositoryType: descriptor.repositoryType || 'internal',
                    version: descriptor.version || cplugin.version
                }
            })

        void FSStore.set("data.plugins", this.plugins);    

        eventManager.emit({
            type: 'load',
            key: key,
        })
    }

    unload(key:string, uninstall:boolean):void {
        pluginContainer.unregister("genericPlugin",{tags: [key]});  
        this.plugins[key].enabled=false;
        if(uninstall)this.plugins = Object.values(this.plugins).filter(plugin=>plugin.name !== key)
            .reduce( (ret,plugin) => { ret[key]=plugin; return ret},{} as Record<string,PluginDescriptor>) 

        void FSStore.set("data.plugins", this.plugins);    

        eventManager.emit({
            type: 'unload',
            key: key
        })    
    }

}