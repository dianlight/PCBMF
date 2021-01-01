import { expose } from "threads/worker"
import * as jsts from "jsts";
import { featureCollectionToGeometries, geometryToFeature } from "@/utils/geometriesToFeatures";
import { GeoJSON, FeatureCollection, Feature, Geometry } from "geojson";
import { GCodeParser } from '@/parsers/gcodeparser';
import { Tooldb } from "@/typings/tooldb";

export type ThiefWorkMode = "Outline" | "Box" | "Line" | "Spiral" | "Voronoi";

export interface IThiefWorkOption {
    name: string,
    unit: 'mm',
    drillPark: { x: number, y: number },
    feedrate: number,
    safeHtravel: number,
    dthickness: number,
    tools: Tooldb[],
    mode: ThiefWorkMode | undefined,
    cycles: number
}

export interface IThiefWorkResult {
    geojson: GeoJSON;
    gcode: string;
}

let _options: IThiefWorkOption = {
    /* Option Defaults */
    name: 'no-name',
    unit: 'mm',
    drillPark: { x: 0, y: 0 },
    feedrate: 50,
    safeHtravel: 10,
    dthickness: 1,
    tools: [],
    mode: "Line",
    cycles: 1
}

let factory = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel(jsts.geom.PrecisionModel.FLOATING_SINGLE));

const _thiefWork = {
    create(options: IThiefWorkOption, data: FeatureCollection): Promise<IThiefWorkResult> {

        Object.assign(_options, options);
        const reader = new jsts.io.GeoJSONReader();
        const writer = new jsts.io.GeoJSONWriter();
        // Gcode
        const code = new GCodeParser({
            name: _options.name,
            unit: _options.unit,
            start: _options.drillPark,
            finish: _options.drillPark,
            positioning: 'absolute',
            feedrate: _options.feedrate, // FIXME: From config or tool?
            lines: false, // FIXME: From config
            clearance: _options.safeHtravel, // FIXME: From config safe travel height
            precision: 3 // FIXME: From config
        });

        return new Promise<IThiefWorkResult>((resolve, reject) => {
            console.log("Working on ", data.features.length, "features!");

            const geometries = featureCollectionToGeometries(data, reader);

            switch (_options.mode) {
                case "Box":
                    {
                    }
                    break;
                case "Line": {
                    /*
                    const geometry = factory.createGeometryCollection(geometries).convexHull()
                    .buffer(_options.dthief / 2, 60 /*$fn from config?* /, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                   geometry.setUserData("thief");
                    data.features.push(
                        geometryToFeature(
                            geometry
                            , {
                                "width": Math.abs(_options.dthief),
                                "cut_deep": _options.dthickness
                            }, writer)
                    );
                    */
                }
                    break;
                case "Spiral": {
                }
                    break;
                case "Outline": {

                    _options.tools
                        .sort((a, b) => (a.size || 0) - (b.size || 0))
                        .forEach(tool => {
                            for (let i = 0; i < _options.cycles; i++) {
                                const geometry = factory.createGeometryCollection(geometries)
                                    .union()
                                    .buffer((tool.size || 1) / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                                geometry.setUserData("thief");
                                console.log("After buffer");
                                data.features.push(
                                    geometryToFeature(
                                        geometry
                                        , {
                                            "width": tool.size,
                                            "cut_deep": _options.dthickness
                                        }, writer)
                                );
                                geometries.push(geometry);
                            }
                        });

                }
                    break;
                case "Voronoi":
                    break;
                default:
                    console.warn("thief mode ", _options.mode, " not implemented!");
                    break
            }


            // GCODE
            if (_options.dthickness) {
                const point = factory.createPoint(new jsts.geom.Coordinate(_options.drillPark.x, _options.drillPark.y));
                data.features
                    .filter(feature => feature.properties!.userData === "thief")
                    .map(feature => reader.read(feature.geometry))
                    .sort((a, b) => a.distance(point) - b.distance(point)/* + b.distance(a)*/)
                    .forEach(i_gometry => code.parse(i_gometry, _options.dthickness as number));
            }

            const gcode = String(code);
            //            console.log(gcode);

            // End
            resolve({
                geojson: data,
                gcode: gcode
            });
        });
    },
}

export type ThiefWork = typeof _thiefWork;
expose(_thiefWork);