import { expose } from "threads/worker"
import { IPlotterData, IPlotterDataCircle, IPlotterDataFill, IPlotterDataLine, IPlotterDataPad, IPlotterDataRect, IPlotterDataShape, IPlotterDataSize, IPlotterDataStroke, IPlotterDataTypes } from "@/models/plotterData";
import * as stm from "readable-stream";
import gerberParser from "gerber-parser";
import gerberPlotter from "gerber-plotter";
import * as jsts from "jsts";
import { INumberDictionary } from "@/models/dictionary";
import { GeoJSON, Feature, FeatureCollection, Geometry } from "geojson";


export interface IGerberParserOption {
    unionDraw: boolean;
    filetype?: "gerber"|"drill"
}

export interface IGerberParserResult {
    geojson: GeoJSON;
}

let options: IGerberParserOption = {
    /* Option Defaults */
    unionDraw: true,
    filetype: "gerber"
}

let buffer: Buffer = Buffer.from(new ArrayBuffer(0));

let factory = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel(jsts.geom.PrecisionModel.FLOATING_SINGLE));
let g_geometry: jsts.geom.Geometry[] = [];
let shapes: INumberDictionary<jsts.geom.Geometry> = {};


const _gerberParser = {
    create(data: IGerberParserOption): void {
        Object.assign(options, data);
    },

    load(data: Buffer): boolean {
        buffer = Buffer.concat([buffer, data]);
        return true;
    },

    commit(): Promise<IGerberParserResult> {
        var parser = gerberParser({
            filetype: options.filetype,
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


        const stream: stm.Duplex = new stm.Duplex();
        stream.push(buffer);
        stream.push(null);
        return new Promise<IGerberParserResult>((resolve, reject) => {
            stream
                .pipe(parser)
                .pipe(plotter)
                .on("error", (error: any) => console.error(error))
                .on("data", (obj: IPlotterData) => {
                    const rgeom = iPlotterToModel(obj);
                    rgeom.filter((geom) => geom.isGeometryCollection()).forEach((geom) => {
                        console.warn(geom.getUserData(), geom.isGeometryCollection());
                    })
                    if (rgeom) g_geometry.push(...rgeom);
                })
                .on("end", () => {
                    const writer = new jsts.io.GeoJSONWriter();


                    // Union overlapping geometry
                    if (options.unionDraw) {
                        console.log("Start Geometries:", g_geometry.length);
                        let startg;
                        do {
                            startg = g_geometry.length;
                            g_geometry.forEach((geom, index, all) => {
                                if (geom.isGeometryCollection()) {
                                    console.error("Geom is an collection!", geom);
                                }
                                if(geom.getUserData()==="*h*"){
                                     all.splice(index,1);
                                } else {
                                all[index] = all
                                    .filter((e, i) => index != i && geom.intersects(e))
                                    .reduce((prev, next, i, ax) => {
                                        next.setUserData("*h*");
                                        return prev.union(next);
                                    }, geom);
                                }
                            });
                            console.log("Geometries:", g_geometry.length);
                        } while (startg != g_geometry.length);
                    }
                    // Go on.

                    const single_geometry = factory.createGeometryCollection(g_geometry);

                    let geojson:GeoJSON = {
                        "type":"FeatureCollection",
                        "features":[] as Feature[],
                    } as FeatureCollection;
                    
                    for (let i = 0; i < single_geometry.getNumGeometries(); i++) {
                        geojson.features.push({
                            "type": "Feature",
                            "properties": {
                                "userData": single_geometry.getGeometryN(i).getUserData(),
                                //                       component: "pcb"
                            },
                            "geometry": writer.write(single_geometry.getGeometryN(i)) as Geometry
                        } as Feature);
                    }
                    //    console.log(JSON.stringify(geojson));
                    /*
                    const geojson = writer.write(factory.createLineString([
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
                    //console.log(geojson);
                    resolve({ geojson: geojson });
                });
        });
    },
}

// Real Work
function iPlotterToModel(
    obj: IPlotterData,
): jsts.geom.Geometry[] {
    switch (obj.type) {
        case IPlotterDataTypes.POLARITY:
            // Not implemented for now. Not usefull from EasyEDA
            return [];
            break;
        case IPlotterDataTypes.LINE: {
            const line = obj as IPlotterDataLine;
            const sline = factory.createLineString(
                [new jsts.geom.Coordinate(line.start[0], line.start[1]),
                new jsts.geom.Coordinate(line.end[0], line.end[1])]);
            sline.setUserData("line");
            return [sline];
        }
            break;
        case IPlotterDataTypes.RECT:
            {
                const rect = obj as IPlotterDataRect;
                const srect = factory.createLineString([
                    new jsts.geom.Coordinate(rect.cx - rect.width / 2, rect.cy - rect.height / 2),
                    new jsts.geom.Coordinate(rect.cx + rect.width / 2, rect.cy - rect.height / 2),
                    new jsts.geom.Coordinate(rect.cx + rect.width / 2, rect.cy + rect.height / 2),
                    new jsts.geom.Coordinate(rect.cx - rect.width / 2, rect.cy + rect.height / 2),
                    new jsts.geom.Coordinate(rect.cx - rect.width / 2, rect.cy - rect.height / 2),
                ]);
                srect.setUserData("rect");
                if (rect.r > 0) {
                    // FIXME: Implement round corners
                    console.warn("Unsupported round Rectangle!");
                }
                return [srect.convexHull()];
            }
            break;
        case IPlotterDataTypes.PAD:
            {
                const pad = obj as IPlotterDataPad;
                const move = new jsts.geom.util.AffineTransformation();
                move.translate(pad.x, pad.y);
                //  console.log(pad.tool,this.shapes,this.shapes[pad.tool]);
                if (shapes[pad.tool]) {
                    const padshape = shapes[pad.tool].copy();
                    padshape.apply(move);
                    padshape.setUserData("pad");
                    return [padshape];
                } else {
                    console.warn("Missing Pad/Shape:", pad.tool);
                    return [];
                }
            }
            break;
        case IPlotterDataTypes.CIRCLE:
            {
                const circle = obj as IPlotterDataCircle;
                const scircle = factory.createPoint(new jsts.geom.Coordinate(circle.cx, circle.cy)).buffer(circle.r, 60, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                scircle.setUserData("circle");
                return [scircle];
            }
            break;
        case IPlotterDataTypes.STROKE:
            {
                const stroke = obj as IPlotterDataStroke;
                let lineStrings: jsts.geom.Geometry[] = [];
                let last_rtd: jsts.geom.Geometry | undefined;
                stroke.path.forEach((data: IPlotterData, index, all) => {
                    //  this.iPlotterToModel(submodel, data);
                    iPlotterToModel(data).forEach((geom) => {
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
                const fill = obj as IPlotterDataFill;
                const fpoly = factory.createLinearRing([
                    new jsts.geom.Coordinate(fill.path[0].start[0], fill.path[0].start[1]),
                    ...fill.path.map(path => new jsts.geom.Coordinate(path.end[0], path.end[1]))
                ]);
                const convex = fpoly.convexHull();
                convex.setUserData("fill");
                return [convex];
            }
            break;
        case IPlotterDataTypes.SHAPE:
            {
                // Definisce un Tool!
                const shape = obj as IPlotterDataShape;
                let submodel: jsts.geom.Geometry[] = [];
                shape.shape.forEach((data: IPlotterData) => {
                    submodel.push(...iPlotterToModel(data));
                });
                if (submodel.length > 0) {
                    shapes[shape.tool] = submodel.reduce((prev, next, index, all) => prev.union(next));
                    shapes[shape.tool].setUserData("shape");
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


export type GerberParser = typeof _gerberParser;
expose(_gerberParser);