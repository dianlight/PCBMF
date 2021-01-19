import { Slider } from "element-ui";
import "reflect-metadata";
import { GenericPlugin } from "../genericPlugin";

export default class GerberToGeoJSON implements GenericPlugin {
    name= "GerberToGeoJSON";
    description= "Read Gerber/Dritll file and create the GeoJSON data";
    version = "0.3.1";
}