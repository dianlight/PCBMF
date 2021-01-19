import { Container, listFacility } from "shelf-dependency";
import { PluginManager } from "@/utils/pluginManager";


const pluginContainer = new Container();
pluginContainer.use(listFacility);
pluginContainer.register("pluginManager",PluginManager);


export { pluginContainer };