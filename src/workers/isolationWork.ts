import { expose } from "threads/worker"
import * as jsts from "jsts";
import {GeoJSON, FeatureCollection, Feature, Geometry} from "geojson";
import { GCodeParser } from '@/parsers/gcodeparser';

export interface IIsolationWorkOption {
    name: string,
    unit: 'mm',
    drillPark: {x:number,y:number},
    feedrate: number,
    safeHtravel: number,
    dthickness:number | undefined,
    doutline: number | undefined,
}

export interface IIsolationWorkResult {
    geojson: GeoJSON;
    gcode: string;
}

const _options: IIsolationWorkOption = {
    /* Option Defaults */
    name: 'no-name',
    unit: 'mm',
    drillPark: {x:0,y:0},
    feedrate: 50,
    safeHtravel: 10,
    dthickness: undefined,
    doutline: undefined,
}

const factory = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel(jsts.geom.PrecisionModel.FLOATING_SINGLE));

const _isolationWork = {
    create(options: IIsolationWorkOption,data: FeatureCollection): Promise<IIsolationWorkResult> {

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
    
        return new Promise<IIsolationWorkResult>((resolve) => {
            console.log("Working on ",data.features.length, "features!");
            data.features.forEach( (feature,index,all) => {
                const o_geometry = reader.read(feature.geometry);
//                console.log(JSON.stringify(o_geometry));
                if(o_geometry.getUserData() !== "isolation" && _options.doutline){
                    const i_geometry = o_geometry.buffer(_options.doutline/2,60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                    i_geometry.setUserData("isolation");
                    all.push({
                        "type": "Feature",
                        "properties": {
                            "userData": i_geometry.getUserData(),
                            "width": Math.abs(_options.doutline),
                            "cut_deep": _options.dthickness
                        },
                        "geometry": writer.write(i_geometry) as Geometry
                    } as Feature);
//                    if(_options.dthickness){
//                        // TODO: Order Geometry from distance from drillPark.?
//                        code.parse(i_geometry, _options.dthickness);
//                    }
                }
            });

            // GCODE
            if(_options.dthickness){
            const point = factory.createPoint(new jsts.geom.Coordinate(_options.drillPark.x,_options.drillPark.y));
            data.features
                .filter( feature => feature.properties?.userData === "isolation")
                .map( feature => reader.read(feature.geometry))
                .sort( (a,b)=> a.distance(point) - b.distance(point)/* + b.distance(a)*/ )
                .forEach( i_gometry => code.parse(i_gometry, _options.dthickness as number));
            }

            const gcode = String(code);
//            console.log(gcode);

            // End
            resolve({
                geojson:data,
                gcode:gcode
            });
        });
    },
}

export type IsolationWork = typeof _isolationWork;
expose(_isolationWork);