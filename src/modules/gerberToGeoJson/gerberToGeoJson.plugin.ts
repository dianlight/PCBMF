import "reflect-metadata";
import { GenericPlugin } from "../genericPlugin";

export default class GerberToGeoJSON implements GenericPlugin {
    id = "pcbmf.internal.gerbertogeojson";
    version = "0.3.1";
}