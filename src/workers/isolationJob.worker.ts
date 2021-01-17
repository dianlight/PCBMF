import * as jsts from "jsts";
import { GeoJSON, FeatureCollection, Feature, Geometry } from "geojson";
import { GCodeParser } from '@/parsers/gcodeparser';
import { FeatureUserData } from "@/parsers/gerberParser.worker";

export interface IIsolationWorkOption {
    name: string,
    unit: 'mm',
    drillPark: { x: number, y: number },
    feedrate: number,
    safeHtravel: number,
    dthickness: number | undefined,
    doutline: number | undefined,
}

export interface IIsolationWorkResult {
    geojson: GeoJSON;
    gcode: string;
}


export class IsolationJob {

    factory = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel(jsts.geom.PrecisionModel.FLOATING_SINGLE));

    options: IIsolationWorkOption = {
        /* Option Defaults */
        name: 'no-name',
        unit: 'mm',
        drillPark: { x: 0, y: 0 },
        feedrate: 50,
        safeHtravel: 10,
        dthickness: undefined,
        doutline: undefined,
    }

    constructor(options: IIsolationWorkOption) {
        Object.assign(this.options, options);
    }

    isolate(data: FeatureCollection): Promise<IIsolationWorkResult> {


        const reader = new jsts.io.GeoJSONReader();
        const writer = new jsts.io.GeoJSONWriter();
        // Gcode
        const code = new GCodeParser({
            name: this.options.name,
            unit: this.options.unit,
            start: this.options.drillPark,
            finish: this.options.drillPark,
            positioning: 'absolute',
            feedrate: this.options.feedrate,
            lines: false, // FIXME: From config
            clearance: this.options.safeHtravel,
            precision: 3 // FIXME: From config
        });

        return new Promise<IIsolationWorkResult>((resolve, reject) => {
            console.log("Working on ", data.features.length, "features!");
            if (!this.options.doutline) reject(new Error("need dOutline to perform isolation work!"));


            const i_geometries = data.features
                .filter((feature) => (feature?.properties?.userData as FeatureUserData).polarity === 'dark')
                .map((feature) => reader.read(feature.geometry))
                .map((geometry) => geometry
            //        .buffer(this.options.doutline as number / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND)
                );

            // This work well if no copper area fill is defined.    
            const final = this.factory.createGeometryCollection(i_geometries)//.union();
            data.features.push({
                "type": "Feature",
                "properties": {
                    "userData": {
                        type: "isolation",
                        polarity: "dark",
                        layer: +Infinity
                    } as FeatureUserData,
                    "width": Math.abs(this.options.doutline as number),
                    "cut_deep": this.options.dthickness
                },
                "geometry": writer.write(final
                  .buffer(this.options.doutline as number / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND)
//                       .union()
                    ) as Geometry
            } as Feature);    

            /*

            const o_geometries = data.features
                .filter((feature) => (feature?.properties?.userData as FeatureUserData).polarity === 'clear')
                .map((feature) => reader.read(feature.geometry))
                .map((geometry) => geometry
                //    .buffer(this.options.doutline as number / -2, 60 /*$fn from config?* /, jsts.operation.buffer.BufferParameters.CAP_ROUND)
                );

            data.features.push(...o_geometries.map( geom => ({
                "type": "Feature",
                "properties": {
                    "userData": {
                        type: "isolation",
                        polarity: "dark",
                        layer: +Infinity
                    } as FeatureUserData,
                    "width": Math.abs(this.options.doutline as number),
                    "cut_deep": this.options.dthickness
                },
                "geometry": writer.write(geom
           //       .buffer(this.options.doutline as number / -2, 60 /*$fn from config?* /, jsts.operation.buffer.BufferParameters.CAP_ROUND)
           //            .union()
                    ) as Geometry
            } as Feature
            )));    
            */
                

            // Split in crossing groups ( Under revision )
            /*
            const splitted = i_geometries.reduce((ret, cur,/*index,all* /) => {
                const ccur = cur
                .buffer(0, 60 /*$fn from config?* /, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                for (let i = 0; i < ret.length; i++) {
                    const relif = this.factory.createGeometryCollection(ret[i]).union()
                    .buffer(0, 60 /*$fn from config?* /, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                //console.log("Curt is valid?",cur.isValid(),relif.isValid());   
                    if (ccur.intersects(relif) && !relif.covers(ccur)
                     ) {
                        ret[i].push(ccur);
                        return ret;
                    }
                }
                ret.push([ccur]);
                return ret;
            }, [] as jsts.geom.Geometry[][]);

            console.log("Geometries Group are:",splitted.length);

    
            
            
            splitted
           // .filter( (val,index)=> index == 1)
            .map( (geometries,index) => {
                console.log(`Geom ${index} -> ${geometries.length}`);
                return this.factory.createGeometryCollection(geometries)
            } )
            .forEach(final => {
                //  const final = this.factory.createGeometryCollection(i_geometries)//.union();
                data.features.push({
                    "type": "Feature",
                    "properties": {
                        "userData": {
                            type: "isolation",
                            polarity: "dark",
                            layer: +Infinity
                        } as FeatureUserData,
                        "width": Math.abs(this.options.doutline as number),
                        "cut_deep": this.options.dthickness
                    },
                    "geometry": writer.write(final
                      .buffer(this.options.doutline as number / 2, 60 /*$fn from config?* /, jsts.operation.buffer.BufferParameters.CAP_ROUND)
                        .union()
                        ) as Geometry
                } as Feature);
            });
            */
            

            
            //console.log("Perform internal isolation backup!");
            
            /*
            // Internal isolation track
            data.features.push(...i_geometries
                .filter( geometry=>final.contains(geometry) )
                .map( geometry => ({
                    "type": "Feature",
                     "properties": {
                    "userData": {
                        type: "isolation",
                        polarity: "dark",
                        layer: +Infinity
                    } as FeatureUserData,
                    "width": Math.abs(this.options.doutline as number),
                    "cut_deep": this.options.dthickness
                },
                "geometry": writer.write(geometry) as Geometry
                } as Feature)));   
            */
            
            /*
            data.features.forEach((feature, index, all) => {
                const o_geometry = reader.read(feature.geometry);
                if (o_geometry.getUserData() !== "isolation" && this.options.doutline) {
                    const i_geometry = o_geometry.buffer(this.options.doutline / 2, 60 /*$fn from config?* /, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                    i_geometry.setUserData({
                        type: "isolation",
                        polarity: "dark",
                        layer: +Infinity
                    } as FeatureUserData);
                    all.push({
                        "type": "Feature",
                        "properties": {
                            "userData": i_geometry.getUserData(),
                            "width": Math.abs(this.options.doutline),
                            "cut_deep": this.options.dthickness
                        },
                        "geometry": writer.write(i_geometry) as Geometry
                    } as Feature);
                }
            });
            */
            

            // GCODE
            if (this.options.dthickness) {
                const point = this.factory.createPoint(new jsts.geom.Coordinate(this.options.drillPark.x, this.options.drillPark.y));
                data.features
                    .filter(feature => feature.properties?.userData === "isolation")
                    .map(feature => reader.read(feature.geometry))
                    .sort((a, b) => a.distance(point) - b.distance(point)/* + b.distance(a)*/)
                    .forEach(i_gometry => code.parse(i_gometry, this.options.dthickness as number));
            }

            const gcode = String(code);
            //            console.log(gcode);

            // End
            resolve({
                geojson: data,
                gcode: gcode
            });
        });
    }
}
