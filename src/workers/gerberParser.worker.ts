import { JobWorker } from "./jobWorker";
//import makerjs, { chain, IChain, IModel, IPath, IPathLine, IPathMap, IPoint, isPath, isPathCircle, model } from "makerjs";
import { IPlotterData, IPlotterDataCircle, IPlotterDataFill, IPlotterDataLine, IPlotterDataPad, IPlotterDataRect, IPlotterDataShape, IPlotterDataSize, IPlotterDataStroke, IPlotterDataTypes } from "@/models/plotterData";
import { IGerberParserResult, IGerberParserOption } from "./gerberParser.model";
import { Duplex } from "stream";
import gerberParser from "gerber-parser";
import gerberPlotter from "gerber-plotter";
import * as jsts from "jsts";
//import geojson2svg from "geojson2svg";
//import geo2svg from "geo2svg";
import geojson2svg, { Renderer } from "geojson-to-svg";
import { write } from "fs";
import { geoAzimuthalEqualArea, precisionFixed } from "d3";
import { IDictionary,INumberDictionary } from "@/models/dictionary";
import { UNDERSCORE_TITLE_MODE } from "highlight.js";


class GerberParserWorker extends JobWorker<IGerberParserOption | Buffer, IGerberParserResult> {

    options: IGerberParserOption = {
        /* Option Defaults */
    }

    buffer: Buffer = Buffer.from(new ArrayBuffer(0));



    //    factory = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel(10 /** Precision From config */));
    factory = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel(jsts.geom.PrecisionModel.FLOATING_SINGLE));
    g_geometry: jsts.geom.Geometry[] = [];
    shapes:  INumberDictionary<jsts.geom.Geometry> = {};

    abort(): void {
        throw new Error("Method not implemented.");
    }

    create(data: IGerberParserOption): void {
        Object.assign(this.options, data);
        this.inchunks = this.outchunks = 0;
    }

    reset(data: IGerberParserOption): void {
        this.inchunks = this.outchunks = 0;
        this.buffer = Buffer.from(new ArrayBuffer(0));
    }

    load(data: Buffer): boolean {
        this.buffer = Buffer.concat([this.buffer, data]);
        return true;
    }

    commit(): IGerberParserResult | undefined {
        var parser = gerberParser({
            filetype: "gerber",
        });
        var plotter = gerberPlotter({
            optimizePaths: true,
            plotAsOutline: false, // or mm?!?!?
        });

        plotter.on("warning", function (w) {
            console.warn("plotter warning at line " + w.line + ": " + w.message);
        });

        plotter.once("error", function (e) {
            console.error("plotter error: " + e.message);
        });
        const stream: Duplex = new Duplex();
        stream.push(this.buffer);
        stream.push(null);
        stream
            .pipe(parser)
            .pipe(plotter)
            .on("error", (error: any) => console.error(error))
            .on("data", (obj: IPlotterData) => {
                this.inchunks++;
                const rgeom = this.iPlotterToModel(obj);
                rgeom.filter((geom)=>geom.isGeometryCollection()).forEach( (geom) => {
                    console.warn(geom.getUserData(),geom.isGeometryCollection());
                })
                if (rgeom) this.g_geometry.push(...rgeom);
                this.outchunks++;
            })
            .on("end", () => {
                if (this.inchunks == 0) return; // Abort or Havy Error
                const writer = new jsts.io.GeoJSONWriter();

                
                // Union overlapping geometry
                console.log("Start Geometries:", this.g_geometry.length);
                let startg;
                do {
                    startg = this.g_geometry.length;
                    this.g_geometry.forEach((geom, index, all) => {
                 //       console.log(index, all.length);
                        if(geom.isGeometryCollection()){
                            console.error("Geom is an collection!",geom);
                        }
                        all[index] = all.filter((e, i) => index != i && geom.intersects(e))
                            .map(value => {
                                all.splice(all.indexOf(value), 1);
                                return value;
                            })
                            .reduce((prev, next, i, ax) => {
//                                    console.log(prev,prev.isGeometryCollection(),next,next.isGeometryCollection());
                                    return prev.union(next);
                            }, geom);
                    });
                    console.log("Geometries:", this.g_geometry.length);
                } while (startg != this.g_geometry.length);


                // Go on.

                const single_geometry = this.factory.createGeometryCollection(this.g_geometry);
                //           const single_geometry = this.factory.createGeometryCollection(this.g_geometry);
                // console.log(single_geometry.getDimension());

                /*
    
                // Generate SVG
                const converter = geojson2svg({
                    viewportSize:{
                        width: 400,
                        height: 400                    
                    },
                    mapExtent:{
                        left: 0,
                        right: 400,
                        bottom: 0,
                        top: 400
                    },
                    output: 'svg', // 'path',
                    fitTo: 'width', // 'height,
                    explode: true,
    
    
                });
                */
                let geojson = {
                    "type": "FeatureCollection",
                    "features": []
                } as {
                    type: string,
                    features: any[]
                };
                for (let i = 0; i < single_geometry.getNumGeometries(); i++) {
                    geojson.features.push({
                        "type": "Feature",
                        "properties": {
                            "userData": single_geometry.getGeometryN(i).getUserData(),
                            //                       component: "pcb"
                        },
                        "geometry": writer.write(single_geometry.getGeometryN(i))
                    });
                }
                //    console.log(JSON.stringify(geojson));
                /*
                const geojson = writer.write(this.factory.createLineString([
                    new jsts.geom.Coordinate(0, 0),
                    new jsts.geom.Coordinate(400,0),
                    new jsts.geom.Coordinate(400,400),
                    new jsts.geom.Coordinate(0,400),
              //      new jsts.geom.Coordinate(0,0),
                ]));
                */

                /*
                const svg = 
                '<svg id="map" xmlns="http://www.w3.org/2000/svg" width="800" height="800" x="0" y="0" >'+
                converter.convert(geojson,{})[0];
                '</svg>';
                //
                */

                /*
                const option = {
                    size: [300, 300],           // size[0] is svg width, size[1] is svg height
                    padding: [10, 10, 10, 10],  // paddingTop, paddingRight, paddingBottom, paddingLeft, respectively
                    output: 'string',           // output type: 'string' | 'element'(only supported in browser)
                    precision: 3,               // svg coordinates precision
                    stroke: 'red',              // stroke color
                    strokeWidth: '1px',         // stroke width
                    background: '#ccc',         // svg background color, and as the fill color of polygon hole
                    fill: 'green',              // fill color
                    fillOpacity: 0.5,           // fill opacity
                    radius: 5                   // only for `Point`, `MultiPoint`
                };
                */

                /*
                var g = {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "LineString",
                                "coordinates": [
                                    [
                                        87.978515625,
                                        39.977120098439634
                                    ],
                                    [
                                        100.37109375,
                                        31.052933985705163
                                    ],
                                    [
                                        104.94140625,
                                        43.51668853502906
                                    ],
                                    [
                                        92.10937499999999,
                                        48.16608541901253
                                    ],
                                    [
                                        95.2734375,
                                        50.62507306341435
                                    ]
                                ]
                            }
                        },
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [
                                    [
                                        [
                                            108.017578125,
                                            40.78054143186033
                                        ],
                                        [
                                            112.763671875,
                                            32.10118973232094
                                        ],
                                        [
                                            125.41992187499999,
                                            35.10193405724606
                                        ],
                                        [
                                            120.58593749999999,
                                            45.460130637921004
                                        ],
                                        [
                                            111.796875,
                                            50.45750402042058
                                        ],
                                        [
                                            108.017578125,
                                            40.78054143186033
                                        ]
                                    ]
                                ]
                            }
                        },
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Point",
                                "coordinates": [
                                    79.453125,
                                    47.27922900257082
                                ]
                            }
                        },
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Point",
                                "coordinates": [
                                    87.71484375,
                                    41.77131167976407
                                ]
                            }
                        },
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Point",
                                "coordinates": [
                                    88.330078125,
                                    30.44867367928756
                                ]
                            }
                        },
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [
                                    [
                                        [
                                            80.33203125,
                                            41.376808565702355
                                        ],
                                        [
                                            73.037109375,
                                            35.67514743608467
                                        ],
                                        [
                                            87.71484375,
                                            36.66841891894786
                                        ],
                                        [
                                            84.111328125,
                                            44.465151013519616
                                        ],
                                        [
                                            80.33203125,
                                            41.376808565702355
                                        ]
                                    ]
                                ]
                            }
                        },
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "LineString",
                                "coordinates": [
                                    [
                                        124.1015625,
                                        42.61779143282346
                                    ],
                                    [
                                        128.935546875,
                                        47.39834920035926
                                    ],
                                    [
                                        116.01562499999999,
                                        53.69670647530323
                                    ],
                                    [
                                        98.87695312499999,
                                        56.511017504952136
                                    ],
                                    [
                                        89.56054687499999,
                                        52.696361078274485
                                    ],
                                    [
                                        72.24609375,
                                        53.85252660044951
                                    ],
                                    [
                                        67.412109375,
                                        42.61779143282346
                                    ],
                                    [
                                        62.57812500000001,
                                        47.15984001304432
                                    ]
                                ]
                            }
                        },
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Point",
                                "coordinates": [
                                    105.732421875,
                                    34.45221847282654
                                ]
                            }
                        },
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Point",
                                "coordinates": [
                                    63.984375,
                                    37.996162679728116
                                ]
                            }
                        },
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [
                                    [
                                        [
                                            68.115234375,
                                            24.686952411999155
                                        ],
                                        [
                                            78.134765625,
                                            24.686952411999155
                                        ],
                                        [
                                            78.134765625,
                                            34.45221847282654
                                        ],
                                        [
                                            68.115234375,
                                            34.45221847282654
                                        ],
                                        [
                                            68.115234375,
                                            24.686952411999155
                                        ]
                                    ]
                                ]
                            }
                        },
                        {
                            "type": "Feature",
                            "properties": {},
                            "geometry": {
                                "type": "LineString",
                                "coordinates": [
                                    [
                                        96.767578125,
                                        29.22889003019423
                                    ],
                                    [
                                        100.634765625,
                                        18.646245142670608
                                    ],
                                    [
                                        110.74218749999999,
                                        27.68352808378776
                                    ],
                                    [
                                        104.58984375,
                                        30.29701788337205
                                    ]
                                ]
                            }
                        }
                    ]
                };
                */


                // var svg = geo2svg(geojson, option);

                var svg = geojson2svg()
                    //            .type("component")
                    //            .styles({ pcb: { fill: "blue", stroke: "red"} })
                    //     transform-origin: 50% 50%;
                    //     transform: scale(1,-1);
                    //
                    .data(geojson)
                    .render();

                this.end({ svg: svg, geojson: geojson });
            });
        return
    }

    // Real Work
    private iPlotterToModel(
        obj: IPlotterData,
    ): jsts.geom.Geometry[] {
        switch (obj.type) {
            case IPlotterDataTypes.POLARITY:
                // Not implemented for now. Not usefull from EasyEDA
                return [];
                break;
            case IPlotterDataTypes.LINE: {
                const line = obj as IPlotterDataLine;
                const sline = this.factory.createLineString(
                    [new jsts.geom.Coordinate(line.start[0], line.start[1]),
                    new jsts.geom.Coordinate(line.end[0], line.end[1])]);
                sline.setUserData("line");    
                return [sline];
                }
                break;
            case IPlotterDataTypes.RECT:
                {
                    const rect = obj as IPlotterDataRect;
                    const srect = this.factory.createLineString([
                        new jsts.geom.Coordinate(rect.cx - rect.width / 2, rect.cy - rect.height / 2),
                        new jsts.geom.Coordinate(rect.cx + rect.width / 2, rect.cy - rect.height / 2),
                        new jsts.geom.Coordinate(rect.cx + rect.width / 2, rect.cy + rect.height / 2),
                        new jsts.geom.Coordinate(rect.cx - rect.width / 2, rect.cy + rect.height / 2),
                        new jsts.geom.Coordinate(rect.cx - rect.width / 2, rect.cy - rect.height / 2),
                    ]);
//                    console.log("I'm a collection?",srect.isGeometryCollection());
                    srect.setUserData("rect");
                    if (rect.r > 0) {
                        // FIXME: Implement round corners
                        console.warn("Unsupported round Rectangle!");
                    } 
//                    return [srect.buffer(0.1, 60, jsts.operation.buffer.BufferParameters.CAP_ROUND)];
                    return [srect.convexHull()];
                }
                break;
            case IPlotterDataTypes.PAD:
                {
                    const pad = obj as IPlotterDataPad;
                    /*
                    return makerjs.model.move(makerjs.model.clone(this.shapes[pad.tool]), [
                        pad.x,
                        pad.y,
                    ]);
                    return [this.shapes[pad.tool].clone()];
                    */
                    const move = new jsts.geom.util.AffineTransformation();
                    move.translate(pad.x,pad.y);
                  //  console.log(pad.tool,this.shapes,this.shapes[pad.tool]);
                    if(this.shapes[pad.tool]){
                        const padshape = this.shapes[pad.tool].copy();
                        padshape.apply(move);
                        padshape.setUserData("pad");
                        return [padshape];
                    } else {
                        console.warn("Missing Pad/Shape:",pad.tool);
                        return [];
                    }
                }
                break;
            case IPlotterDataTypes.CIRCLE:
                {
                    const circle = obj as IPlotterDataCircle;
                    const scircle = this.factory.createPoint(new jsts.geom.Coordinate(circle.cx, circle.cy)).buffer(circle.r, 60, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                    scircle.setUserData("circle");
                    //return new makerjs.paths.Circle([circle.cx, circle.cy], circle.r);
                    return [scircle];
                }
                break;
            case IPlotterDataTypes.STROKE:
                {
                    const stroke = obj as IPlotterDataStroke;
                    // let submodel: makerjs.IModel = {};
                    let lineStrings: jsts.geom.Geometry[] = [];
                    //                   let seq:jsts.geom.Coordinate[] = [];
                    let last_rtd: jsts.geom.Geometry | undefined;
                    stroke.path.forEach((data: IPlotterData, index, all) => {
                        //  this.iPlotterToModel(submodel, data);
                        this.iPlotterToModel(data).forEach((geom) => {
                            if (last_rtd && last_rtd.intersects(geom)) {
                                last_rtd = last_rtd.union(geom);
                                if (index === all.length - 1) {
                                    const tgeo = last_rtd.buffer(stroke.width / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                                    tgeo.setUserData("stroke");
                                    lineStrings.push(tgeo);
                                }
                            } else if (last_rtd) {
                                const tgeo = last_rtd.buffer(stroke.width / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                                tgeo.setUserData("singleString");
                                lineStrings.push(tgeo);
//                                lineStrings.push(last_rtd.buffer(stroke.width / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND));
                                last_rtd = geom;
                            } else {
                                last_rtd = geom;
                            }
                        });
                    });
                    return lineStrings;
                }
                break;
            case IPlotterDataTypes.FILL:
                {
                    /*
                    if (!this.options.useFill) return {};
                    this.cc++;
                    const fill = obj as IPlotterDataFill;
                    let submodel: makerjs.IModel = {};
                    //    submodel.layer = "Fill"+Math.random();
                    //    console.log(submodel.layer);
                    let dir = 'bo';
                    if (fill.path[0].start[0] >= fill.path[0].end[0] &&
                        fill.path[0].start[1] >= fill.path[0].end[1]) {
                        dir = 'clock';
                        submodel.layer = "red";
                    } else {
                        dir = "unclock";
                        submodel.layer = "green";
                    }
                    fill.path.forEach((data: IPlotterData) => {
                        const rtd = this.iPlotterToModel(data);
                        if (isPath(rtd)) {
                            const lpath = rtd as IPathLine;
                            //    console.log("Path",lpath, (lpath.end[0]-lpath.origin[0]).toPrecision(2),(lpath.end[1]-lpath.origin[1]).toPrecision(2));
                            makerjs.model.addPath(submodel, rtd as IPath, "path_", false);
                        } else {
                            // submodel = makerjs.model.combineUnion(submodel,rtd as IModel);
                            console.log("Model", rtd);
                            makerjs.model.addModel(submodel, rtd as IModel, "fill_", false);
                        }
                    });
                    submodel.notes = "deferred";//"no_union";
                    /*
                    const nm = makerjs.model.outline(submodel,this.options.useFillPitch,1,false);
                        nm.layer = 'green';
                        nm.notes = submodel.notes;
                        return nm;
                    * /
                    //                    console.log(makerjs.exporter.toSVG(submodel));
                    submodel.layer = makerjs.model.findSingleChain(submodel)!.endless ? 'green' : 'red';
                    return submodel;
                    / *
                    if (submodel !== {} && this.options.useFill) {
                        makerjs.model.addModel(model,submodel,"fill_",false);
                        / *
                        // Check chain
                        const chain = makerjs.model.findSingleChain(submodel);
                        console.log("Fill Chain is:", chain.endless);
                        makerjs.model.addModel(
                            model,
                            makerjs.model.outline(submodel, options.useFillPitch, 1, false),
                            "fill_" + cindex++
                        );
                        * /
                    }
                    */
                    return [];
                }
                break;
            case IPlotterDataTypes.SHAPE:
                {
                    // Definisce un Tool!
                    const shape = obj as IPlotterDataShape;
                    let submodel: jsts.geom.Geometry[] = [];
                    shape.shape.forEach((data: IPlotterData) => {
                        submodel.push(...this.iPlotterToModel(data));
                    });
                    if (submodel.length > 0){
                        this.shapes[shape.tool] = submodel.reduce( (prev,next,index,all)=>prev.union(next));
                        this.shapes[shape.tool].setUserData("shape");
                    }
                }
                return [];
                break;
            case IPlotterDataTypes.SIZE:
                {
                    const size = obj as IPlotterDataSize;
                    /*
                    if (options.showOutline) {
                        let submodel: makerjs.IModel = makerjs.model.layer(
                            makerjs.model.move(
                                new makerjs.models.Rectangle(size.box[2], size.box[3]),
                                [size.box[0], size.box[1]]
                            ),
                            "red"
                        );
                        submodel.units =
                            size.units === "mm"
                                ? makerjs.unitType.Millimeter
                                : makerjs.unitType.Inch;
                        // console.log(submodel_sx);
                        submodel.notes = "outline";
                        model.notes = "outline";
                        makerjs.model.addModel(model, submodel, "outline_" + cindex++);
                    }
                    */
                }
                return [];
                break;
            default:
                console.log(obj, JSON.stringify(obj));
                return [];
                break;
        }
    }


}
{
    const ctx: Worker = self as any;
    new GerberParserWorker(ctx);
}