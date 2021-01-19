import "reflect-metadata";
import { GenericPlugin } from "../genericPlugin";

export default class GeoJSONToGcode implements GenericPlugin {
    name= "GeoJSONToGcode";
    description= "Create drill/mill GCODE from GeoJSON data";
    version = "0.1.10";
}
