import { expose } from "threads/worker"
import * as jsts from "jsts";
import { featureCollectionToGeometries, geometryToFeature } from "@/utils/geometriesToFeatures";
import { GeoJSON, FeatureCollection } from "geojson";
import { GCodeParser } from '@/parsers/gcodeparser';
//import hull from "hull.js";
import concavamen from "concaveman";

export type OutlineWorkMode = "Buffer" | "MergedBuffer" | "Scale" | "ConvexHull" | "Hull" | "Box";

export interface IOutlineWorkOption {
    name: string,
    unit: 'mm',
    drillPark: { x: number, y: number },
    feedrate: number,
    safeHtravel: number,
    dthickness: number,
    doutline: number,
    mode: OutlineWorkMode | undefined,
    scale: number | undefined,
}

export interface IOutlineWorkResult {
    geojson: GeoJSON;
    gcode: string;
}

const _options: IOutlineWorkOption = {
    /* Option Defaults */
    name: 'no-name',
    unit: 'mm',
    drillPark: { x: 0, y: 0 },
    feedrate: 50,
    safeHtravel: 10,
    dthickness: 1,
    doutline: 1,
    mode: "Scale",
    scale: 1
}

const factory = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel(jsts.geom.PrecisionModel.FLOATING_SINGLE));

const _outlineWork = {
    create(options: IOutlineWorkOption, data: FeatureCollection): Promise<IOutlineWorkResult> {

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

        return new Promise<IOutlineWorkResult>((resolve) => {
            console.log("Working on ", data.features.length, "features!");

            const geometries = featureCollectionToGeometries(data, reader);

            switch (_options.mode) {
                case "Hull": {
                    const coordinates = factory.createGeometryCollection(geometries)
                        .union()
                        .getCoordinates();

//                    var hullPoints = hull(coordinates.map( (coord)=>[coord.x,coord.y]),1) as unknown as number[][];
                    const hullPoints = concavamen(coordinates.map( (coord)=>[coord.x,coord.y]));
//                    console.log(JSON.stringify(hullPoints));

                    const geometry = factory.createPolygon(
                        factory.createLinearRing(hullPoints.map( hp=>new jsts.geom.Coordinate(hp[0],hp[1]))),
                        []
                        )
                        .buffer(_options.doutline / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND);
    


                   geometry.setUserData("outline");
                    data.features.push(
                        geometryToFeature(
                            geometry
                            , {
                                "width": Math.abs(_options.doutline),
                                "cut_deep": _options.dthickness
                            }, writer)
                    );
                }
                    break;
                case "ConvexHull": {
                    const geometry = factory.createGeometryCollection(geometries).convexHull()
                    .buffer(_options.doutline / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                   geometry.setUserData("outline");
                    data.features.push(
                        geometryToFeature(
                            geometry
                            , {
                                "width": Math.abs(_options.doutline),
                                "cut_deep": _options.dthickness
                            }, writer)
                    );
                }
                    break;
                case "Scale":{
                    const geometry = factory.createGeometryCollection(geometries).union()

                    const center = geometry.getCentroid().getCoordinate();

                    geometry.apply(
                            jsts.geom.util.AffineTransformation.scaleInstance(_options.scale || 1,_options.scale || 1,center.x,center.y)
                            );
                    geometry.setUserData("outline");
                    data.features.push(
                        geometryToFeature(
                            geometry
                            , {
                                "width": Math.abs(_options.doutline),
                                "cut_deep": _options.dthickness
                            }, writer)
                    );
                }
                break;
                case "Box": {
                    const geometry = factory.createGeometryCollection(geometries).getEnvelope()
                        .buffer(_options.doutline / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                    geometry.setUserData("outline");
                    data.features.push(
                        geometryToFeature(
                            geometry
                            , {
                                "width": Math.abs(_options.doutline),
                                "cut_deep": _options.dthickness
                            }, writer)
                    );
                }
                    break;
                case "MergedBuffer": {
                    const geometry = factory.createGeometryCollection(geometries)
                        .buffer(_options.doutline / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                    geometry.setUserData("outline");
                    data.features.push(
                        geometryToFeature(
                            geometry
                            , {
                                "width": Math.abs(_options.doutline),
                                "cut_deep": _options.dthickness
                            }, writer)
                    );
                }
                    break;
                case "Buffer":
                    geometries.forEach(element => {
                        const geometry = element.buffer(_options.doutline / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                        geometry.setUserData("outline");
                        data.features.push(
                            geometryToFeature(
                                geometry
                                , {
                                    "width": Math.abs(_options.doutline),
                                    "cut_deep": _options.dthickness
                                }, writer)
                        );
                    });
                    break;
                default:
                    console.warn("Outline mode ", _options.mode, " not implemented!");
                    break
            }


            // GCODE
            if (_options.dthickness) {
                const point = factory.createPoint(new jsts.geom.Coordinate(_options.drillPark.x, _options.drillPark.y));
                data.features
                    .filter(feature => feature.properties?.userData === "outline")
                    .map(feature => reader.read(feature.geometry))
                    .sort((a, b) => a.distance(point) - b.distance(point)/* + b.distance(a)*/)
                    .forEach(i_gometry => code.parse(i_gometry, _options.dthickness ));
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

export type OutlineWork = typeof _outlineWork;
expose(_outlineWork);