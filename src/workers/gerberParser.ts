import { expose } from "threads/worker"
import { IPlotterData, IPlotterDataArc, IPlotterDataCircle, IPlotterDataFill, IPlotterDataLine, IPlotterDataPad, IPlotterDataRect, IPlotterDataShape, IPlotterDataSize, IPlotterDataStroke, IPlotterDataTypes } from "@/models/plotterData";
import * as stm from "readable-stream";
import gerberParser from "gerber-parser";
import gerberPlotter from "gerber-plotter";
import * as jsts from "jsts";
import { INumberDictionary } from "@/models/dictionary";
import { GeoJSON, Feature, FeatureCollection, Geometry } from "geojson";
import { line } from "d3";


export interface IGerberParserOption {
    unionDraw: boolean;
    filetype?: "gerber" | "drill"
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
                        unionOverlapping(g_geometry);
                    }
                    // Go on.

                    const single_geometry = factory.createGeometryCollection(g_geometry);

                    let geojson: GeoJSON = {
                        "type": "FeatureCollection",
                        "features": [] as Feature[],
                    } as FeatureCollection;

                    for (let i = 0; i < single_geometry.getNumGeometries(); i++) {
                        //  console.log(single_geometry.getGeometryN(i));
                        geojson.features.push({
                            "type": "Feature",
                            "properties": {
                                "userData": single_geometry.getGeometryN(i).getUserData(),
                                //                       component: "pcb"
                            },
                            "geometry": writer.write(single_geometry.getGeometryN(i)) as Geometry
                        } as Feature);
                    }
                    //console.log(geojson);
                    resolve({ geojson: geojson });
                });
        });
    },
}

// Real Work

function unionOverlapping(a_geometry: jsts.geom.Geometry[]): jsts.geom.Geometry[] {
    // console.log("Start Geometries:", a_geometry.length);
    let startg;
    do {
        startg = a_geometry.length;
        a_geometry.forEach((geom, index, all) => {
            if (geom.isGeometryCollection()) {
                console.error("Geom is an collection!", geom);
            }
            if (geom.getUserData() === "*h*") {
                all.splice(index, 1);
            } else {
                all[index] = all
                    // Filter only intersect or near geometries
                    .filter((e, i) => {
                        //  console.log(geom.intersects(e),geom.distance(e))
                        return index != i && (geom.intersects(e) /*|| geom.isWithinDistance(e,0.001)*/);
                    })
                    // Union intersect or near geometries
                    .reduce((prev, next, i, ax) => {
                        next.setUserData("*h*");
                        /*
                        let union = prev;
                        if(prev.distance(next) != 0){
                            union = union.union(factory.createLineString([prev.getCoordinate(),next.getCoordinate()]));
                        }
                        */
                        const union = prev.union(next);
                        if (union.isGeometryCollection()) {
                            console.log("Union is a GeometryCollection!");
                            ax.push(next);
                            return prev;
                        } else {
                            return union;
                        }
                    }, geom);
            }
        });
        //    console.log("Geometries:", a_geometry.length);
    } while (startg != a_geometry.length);
    return a_geometry;
}

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

                const gsf: jsts.util.GeometricShapeFactory = new jsts.util.GeometricShapeFactory(factory);
                gsf.setCentre(new jsts.geom.Coordinate(rect.cx, rect.cy));
                gsf.setHeight(rect.height);
                gsf.setWidth(rect.width);
                const srect = gsf.createRectangle();
                /*
                const srect = factory.createLineString([
                    new jsts.geom.Coordinate(rect.cx - rect.width / 2, rect.cy - rect.height / 2),
                    new jsts.geom.Coordinate(rect.cx + rect.width / 2, rect.cy - rect.height / 2),
                    new jsts.geom.Coordinate(rect.cx + rect.width / 2, rect.cy + rect.height / 2),
                    new jsts.geom.Coordinate(rect.cx - rect.width / 2, rect.cy + rect.height / 2),
                    new jsts.geom.Coordinate(rect.cx - rect.width / 2, rect.cy - rect.height / 2),
                ]);
                */
                srect.setUserData("rect");
                if (rect.r > 0) {
                    // FIXME: Implement round corners
                    console.warn("Unsupported round Rectangle!");
                }
                return [srect/*.convexHull()*/];
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


                const gsf: jsts.util.GeometricShapeFactory = new jsts.util.GeometricShapeFactory(factory);
                gsf.setCentre(new jsts.geom.Coordinate(circle.cx, circle.cy));
                gsf.setSize(circle.r * 2);
                gsf.setNumPoints(60);
                const scircle = gsf.createCircle();


                //const scircle = factory.createPoint(new jsts.geom.Coordinate(circle.cx, circle.cy)).buffer(circle.r, 60, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                scircle.setUserData("circle");
                return [scircle];
            }
            break;
        case IPlotterDataTypes.ARC:
            {
                //console.log(JSON.stringify(obj));
                const arc = obj as IPlotterDataArc;
                const gsf: jsts.util.GeometricShapeFactory = new jsts.util.GeometricShapeFactory(factory);
                gsf.setSize(arc.radius * 2);
                gsf.setNumPoints(60); // Total num of points from config?
                gsf.setCentre(new jsts.geom.Coordinate(arc.center[0], arc.center[1]));
                let sarc: jsts.geom.LineString;
                if (arc.dir !== "cw") {
                    console.warn(`Arch direction ${arc.dir} arch not implemented!`);
                }
                //                   sarc = gsf.createArc(arc.sweep + arc.end[2] ,arc.sweep +arc.start[2]);
                let ext = arc.start[2] - arc.end[2];
                if (ext < 0) ext = Math.abs(Math.PI + ext);
                //console.log(`Acr from  ${arc.start[2]} to ${ext}`);
                sarc = gsf.createArc(arc.start[2] - arc.sweep, ext);

                // Log
                console.log(sarc.getCoordinateN(0), sarc.getCoordinateN(sarc.getCoordinates().length - 1), arc.start, arc.end);

                sarc.setUserData("arc");
                return [sarc];
            }
            break;
        case IPlotterDataTypes.STROKE:
            {
                const stroke = obj as IPlotterDataStroke;
                let lineStrings: jsts.geom.Geometry[] = stroke.path.reduce((acc, data, index, all) => {
                    return acc.concat(...iPlotterToModel(data));
                }, [] as jsts.geom.Geometry[]);

                //console.log("All Linstring geometry:",lineStrings.length);
                unionOverlapping(lineStrings);
                //console.log("Reduced geometry:",lineStrings.length);


                /*
                if(lineStrings.length == 1 && lineStrings[0].isValid()){
                    console.log(JSON.stringify(lineStrings[0],undefined,2));
                }
                */


                lineStrings = lineStrings.map(lineString =>
                    lineString.buffer(stroke.width / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND)
                );

                return lineStrings;
            }
            break;
        case IPlotterDataTypes.FILL:
            {
                const fill = obj as IPlotterDataFill;
                try {
                    const fpoly = factory.createLineString([
                        new jsts.geom.Coordinate(fill.path[0].start[0], fill.path[0].start[1]),
                        ...fill.path.map(path => new jsts.geom.Coordinate(path.end[0], path.end[1]))
                    ]);
                    const convex = fpoly.convexHull();
                    convex.setUserData("fill");
                    return [convex];
                } catch (error) {
                    console.error(error);
                    return [];
                }
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
            console.warn("Unknown Object", obj, JSON.stringify(obj));
            return [];
            break;
    }
}


export type GerberParser = typeof _gerberParser;
expose(_gerberParser);