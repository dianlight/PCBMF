import { IPlotterData, IPlotterDataArc, IPlotterDataCircle, IPlotterDataFill, IPlotterDataLine, IPlotterDataPad, IPlotterDataPolarity, IPlotterDataPoly, IPlotterDataRect, IPlotterDataShape, IPlotterDataSize, IPlotterDataStroke, IPlotterDataTypes } from "@/models/plotterData";
import * as stm from "readable-stream";
import gerberParser from "gerber-parser";
import gerberPlotter from "gerber-plotter";
import * as jsts from "jsts";
import { GeoJSON, Feature, FeatureCollection, Geometry } from "geojson";
import { IProgressiveResult } from "@/utils/workerUtils";
import { Transform, TransformCallback, TransformOptions } from "stream";

export interface IGerberParserOption {
    unionDraw: boolean;
    filetype?: "gerber" | "drill"
}

export interface IGerberParserResult extends IProgressiveResult {

    geojson: GeoJSON | undefined;
}

export type FeatureUserData = {
    type: string,
    polarity: "dark" | "clear",
    layer: number,
}

class PlotterToJstsStrem extends Transform {

    factory = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel(jsts.geom.PrecisionModel.FLOATING_SINGLE));
    shapes: Record<number, jsts.geom.Geometry> = {};
    polarity: "dark" | "clear" = "dark";
    layer = 0;

    constructor(opts?: TransformOptions) {
        super(Object.assign(opts || {}, {
            readableObjectMode: true,
            writableObjectMode: true
        }));
    }

    _transform(obj: IPlotterData, encoding: BufferEncoding, callback: TransformCallback): void {
        switch (obj.type) {
            case IPlotterDataTypes.POLARITY: {
                const polarity = obj as IPlotterDataPolarity;
                //console.log(polarity);
                this.polarity = polarity.polarity;
                // Not implemented for now. Not usefull from EasyEDA
                callback();
            }
                break;
            case IPlotterDataTypes.LINE: {
                const line = obj as IPlotterDataLine;
                //console.log(line);
                const sline = this.factory.createLineString(
                    [new jsts.geom.Coordinate(line.start[0], line.start[1]),
                    new jsts.geom.Coordinate(line.end[0], line.end[1])]);
                sline.setUserData({ type: "line", polarity: this.polarity, layer: this.layer++ } as FeatureUserData);
                callback(undefined, sline);
            }
                break;
            case IPlotterDataTypes.RECT:
                {
                    const rect = obj as IPlotterDataRect;
                    //console.log(rect);
                    const gsf: jsts.util.GeometricShapeFactory = new jsts.util.GeometricShapeFactory(this.factory);
                    gsf.setCentre(new jsts.geom.Coordinate(rect.cx, rect.cy));
                    gsf.setHeight(rect.height);
                    gsf.setWidth(rect.width);
                    const srect = gsf.createRectangle();
                    if (rect.r > 0) {
                        // FIXME: Implement round corners
                        console.warn("Unsupported round Rectangle!");
                    }
                    srect.setUserData({ type: "rect", polarity: this.polarity, layer: this.layer++ } as FeatureUserData);
                    callback(undefined, srect);
                }
                break;
            case IPlotterDataTypes.PAD:
                {
                    const pad = obj as IPlotterDataPad;
                    //console.log(pad);
                    const move = new jsts.geom.util.AffineTransformation();
                    move.translate(pad.x, pad.y);
                    //  console.log(pad.tool,this.shapes,this.shapes[pad.tool]);
                    if (this.shapes[pad.tool]) {
                        const padshape = this.shapes[pad.tool].copy();
                        padshape.apply(move);
                        padshape.setUserData({ type: "pad", polarity: this.polarity, layer: this.layer++ } as FeatureUserData);
                        callback(undefined, padshape);
                    } else {
                        console.warn("Missing Pad/Shape:", pad.tool);
                        callback();
                    }
                }
                break;
            case IPlotterDataTypes.CIRCLE:
                {
                    const circle = obj as IPlotterDataCircle;
                    //console.log(circle);
                    const gsf: jsts.util.GeometricShapeFactory = new jsts.util.GeometricShapeFactory(this.factory);
                    gsf.setCentre(new jsts.geom.Coordinate(circle.cx, circle.cy));
                    gsf.setSize(circle.r * 2);
                    gsf.setNumPoints(60);
                    const scircle = gsf.createCircle();

                    //const scircle = factory.createPoint(new jsts.geom.Coordinate(circle.cx, circle.cy)).buffer(circle.r, 60, jsts.operation.buffer.BufferParameters.CAP_ROUND);
                    scircle.setUserData({ type: "circle", polarity: this.polarity, layer: this.layer++ } as FeatureUserData);
                    callback(undefined, scircle);
                }
                break;
            case IPlotterDataTypes.ARC:
                {
                    //console.log(JSON.stringify(obj));
                    const arc = obj as IPlotterDataArc;
                    //console.log(arc);
                    const gsf: jsts.util.GeometricShapeFactory = new jsts.util.GeometricShapeFactory(this.factory);
                    gsf.setSize(arc.radius * 2);
                    gsf.setNumPoints(60); // Total num of points from config?
                    gsf.setCentre(new jsts.geom.Coordinate(arc.center[0], arc.center[1]));
                    //  let sarc: jsts.geom.LineString;
                    if (arc.dir !== "cw") {
                        console.warn(`Arch direction ${arc.dir} arch not implemented!`);
                    }
                    //                   sarc = gsf.createArc(arc.sweep + arc.end[2] ,arc.sweep +arc.start[2]);
                    let ext = arc.start[2] - arc.end[2];
                    if (ext < 0) ext = Math.abs(Math.PI + ext);
                    //console.log(`Acr from  ${arc.start[2]} to ${ext}`);
                    const sarc = gsf.createArc(arc.start[2] - arc.sweep, ext);

                    // Log
                    console.log(sarc.getCoordinateN(0), sarc.getCoordinateN(sarc.getCoordinates().length - 1), arc.start, arc.end);

                    sarc.setUserData({ type: "arc", polarity: this.polarity, layer: this.layer++ } as FeatureUserData);
                    callback(undefined, sarc);
                }
                break;
            case IPlotterDataTypes.STROKE:
                {
                    const stroke = obj as IPlotterDataStroke;
                    //console.log(stroke);

                    let lineStrings: jsts.geom.Geometry[] = [];
                    stroke.path.forEach((data) => {
                        this._transform(data, encoding, (error, result) => {
                            if (!error) {
                                lineStrings.push(result);
                            } else {
                                throw error;
                            }
                        });
                    });

                    /*
                    let lineStrings: jsts.geom.Geometry[] = stroke.path.reduce((acc, data) => {
                        return acc.concat(...this.iPlotterToModel(data));
                    }, [] as jsts.geom.Geometry[]);
                    */

                    //console.log("All Linstring geometry:",lineStrings.length);
                    //this.unionOverlapping(lineStrings);
                    //console.log("Reduced geometry:",lineStrings.length);

                    lineStrings = lineStrings.map(lineString =>
                        lineString.buffer(stroke.width / 2, 60 /*$fn from config?*/, jsts.operation.buffer.BufferParameters.CAP_ROUND)
                    );

                    const lineStringc = this.factory.createGeometryCollection(lineStrings);
                    lineStringc.setUserData({type:"lineString",polarity:this.polarity, layer: this.layer++} as FeatureUserData);
                    callback(undefined,lineStringc);
                }
                break;
            case IPlotterDataTypes.FILL:
                {
                    const fill = obj as IPlotterDataFill;
                    //console.log(fill);
                    //const gsf: jsts.util.GeometricShapeFactory = new jsts.util.GeometricShapeFactory(this.factory);
                    
                    const fpoly = this.factory.createLinearRing([
                        new jsts.geom.Coordinate(fill.path[0].start[0], fill.path[0].start[1]),
                        ...fill.path.map(path => new jsts.geom.Coordinate(path.end[0], path.end[1])),
                        new jsts.geom.Coordinate(fill.path[0].start[0], fill.path[0].start[1]),
                    ]);
                    const convex = this.factory.createPolygon(fpoly,[]); //.convexHull();
                    
                    convex.setUserData({type:"fill",polarity:this.polarity, layer: this.layer++} as FeatureUserData);
                    callback(undefined, convex);

                }
                break;
            case IPlotterDataTypes.SHAPE:
                {
                    // Definisce un Tool!
                    const shape = obj as IPlotterDataShape;
                    //console.log(shape);
                    const submodel: jsts.geom.Geometry[] = [];
                    shape.shape.forEach((data: IPlotterData) => {
                        //   submodel.push(...this.iPlotterToModel(data));
                        this._transform(data, encoding, (error, result) => {
                            if (!error) {
                                submodel.push(result);
                            } else {
                                throw error;
                            }
                        });
                    });
                    if (submodel.length > 0) {
                        this.shapes[shape.tool] = submodel.reduce((prev, next) => prev.union(next));
                        this.shapes[shape.tool].setUserData({type:"shape",polarity:this.polarity, layer: this.layer++} as FeatureUserData);
                    }
                }
                callback();
                break;
            case IPlotterDataTypes.SIZE:
                {
                    const size = obj as IPlotterDataSize;
                    console.warn("Ignored size:",size);
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
                callback();
                break;
                case IPlotterDataTypes.POLY:
                    {
                        const poly = obj as IPlotterDataPoly;
                        console.warn("Unknown Data Poly: ",poly);
                        callback();
                    }  
                break;      
            default:
                console.error("Unknown Object", obj, JSON.stringify(obj));
                throw new Error("Unknown Gerber Data!");
                break;
        }
    }
    _flush(callback: TransformCallback): void {
        callback();
    }


}

export class GerberParser {

    _perc = 0;
    _abort = false;

    options: IGerberParserOption = {
        /* Option Defaults */
        unionDraw: true,
        filetype: "gerber"
    }


    factory = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel(jsts.geom.PrecisionModel.FLOATING_SINGLE));
    g_geometry: jsts.geom.Geometry[] = [];
//    shapes: Record<number, jsts.geom.Geometry> = {};


    constructor(data: IGerberParserOption) {
        Object.assign(this.options, data);
    }

    stop(): void {
        console.log("Richiesta terminazione di tutto!");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        console.log("Terminiamo", this._abort);
        this._abort = true;
        //            (self as unknown as Worker).terminate();
    }

    commit(buffer: Buffer): Promise<IGerberParserResult> {
        const parser = gerberParser({
            filetype: this.options.filetype,
        });
        const plotter = gerberPlotter({
            optimizePaths: true,
            plotAsOutline: false, // or mm?!?!?
        });

        plotter.on("warning", function (w) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
            console.warn(`plotter warning at line ${w.line}: ${w.message}`);
        });

        plotter.once("error", function (e) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
            console.error(`plotter error: ${e.message}`);
        });


        const plotterToJstsStrem = new PlotterToJstsStrem();

        const stream: stm.Duplex = new stm.Duplex();
        stream.push(buffer);
        stream.push(null);
        return new Promise<IGerberParserResult>(resolve => {
            const result: IGerberParserResult = {
                perc: 0,
                geojson: undefined,
            };
            //  WorkerUtils.startProgress(self as  unknown as Worker,observer);
            stream
                .pipe(parser)
                .pipe(plotter)
                .pipe(plotterToJstsStrem)
                .on("error", (error) => console.error(error))
                .on("data", (geom: jsts.geom.Geometry) => {
                    if (geom) this.g_geometry.push(geom);
                    else console.warn("Empty Geometry!");
                })
                /*                    
                                    .on("data", (obj: IPlotterData) => {
                                        const rgeom = this.iPlotterToModel(obj);
                                        rgeom.filter((geom) => geom.isGeometryCollection()).forEach((geom) => {
                                            console.warn(geom.getUserData(), geom.isGeometryCollection());
                                        })
                                        if (rgeom) this.g_geometry.push(...rgeom);
                                       // WorkerUtils.sendProgress(100/this.g_geometry.length*rgeom.length);
                                       this._perc = 100/this.g_geometry.length*rgeom.length;
                                       
                                    })
                */
                .on("end", () => {
                    const writer = new jsts.io.GeoJSONWriter();

                    console.log("Pre merge geometry");

                    // Union overlapping geometry
                    //if (this.options.unionDraw) {
                    //    //   WorkerUtils.sendProgress(50);
                    //    this._perc = 50;
                    //    this.unionOverlapping(this.g_geometry);
                    //}
                    // Go on.

                    console.log("Post merge geometry");
                    const single_geometry = this.factory.createGeometryCollection(this.g_geometry);

                    const geojson: GeoJSON = {
                        "type": "FeatureCollection",
                        "features": [] as Feature[],
                    } as FeatureCollection;

                    for (let i = 0; i < single_geometry.getNumGeometries(); i++) {
                    //    console.log(single_geometry.getGeometryN(i));
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
                    resolve({ perc: 100, geojson: geojson });
                    /*
                                        result.perc=100;
                                        */
                    result.geojson = geojson;
                    /*
                    observer.next(result);
                    observer.complete();
                    */
                    //                   WorkerUtils.sendCompleted(observer,result);
                });
        });
    }

    // Real Work
/*
    unionOverlapping(a_geometry: jsts.geom.Geometry[]): jsts.geom.Geometry[] {
        setImmediate(() => this._perc = 50);
        console.log("Start Geometries:", a_geometry.length, this._perc, this._abort);
        let startg;
        do {
            startg = a_geometry.length;
            a_geometry.forEach((geom, index, all) => {
                if (this._abort) throw new Error("Abort Requested!");
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
                            return index != i && (geom.intersects(e) /*|| geom.isWithinDistance(e,0.001)* /);
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
                            //                        console.log("Preunion",i,ax.length,index,all.length);
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                            //   (self as any).postMessage({type:"progress",perc:100/all.length*index} as ThreadProgressData) 
                            /*
                               if(observer)observer.next({
                                   geojson: undefined,
                                   perc: 100/all.length*index,
                               });
                               * /
                            // WorkerUtils.sendProgress(100/all.length*index);
                            this._perc = 100 / all.length * index;
                            if (this._abort) throw new Error("Abort Requested!");

                            const union = prev.union(next);
                            //                        console.log("PostUnion",i,ax.length,all.length);
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
            //            WorkerUtils.sendProgress(100-Math.abs(startg-a_geometry.length));
            this._perc = 100 - Math.abs(startg - a_geometry.length);
            if (this._abort) throw new Error("Abort Requested!");
            console.log("Geometries:", startg, a_geometry.length);
        } while (startg > a_geometry.length);
        return a_geometry;
    }

    iPlotterToModel(
        obj: IPlotterData,
    ): jsts.geom.Geometry[] {
        switch (obj.type) {
            case IPlotterDataTypes.POLARITY: {
                const polarity = obj as IPlotterDataPolarity;
                console.log(polarity);
                // Not implemented for now. Not usefull from EasyEDA
                return [];
            }
                break;
            case IPlotterDataTypes.LINE: {
                const line = obj as IPlotterDataLine;
                console.log(line);
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
                    console.log(rect);
                    const gsf: jsts.util.GeometricShapeFactory = new jsts.util.GeometricShapeFactory(this.factory);
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
                    * /
                    srect.setUserData("rect");
                    if (rect.r > 0) {
                        // FIXME: Implement round corners
                        console.warn("Unsupported round Rectangle!");
                    }
                    return [srect/*.convexHull()* /];
                }
                break;
            case IPlotterDataTypes.PAD:
                {
                    const pad = obj as IPlotterDataPad;
                    console.log(pad);
                    const move = new jsts.geom.util.AffineTransformation();
                    move.translate(pad.x, pad.y);
                    //  console.log(pad.tool,this.shapes,this.shapes[pad.tool]);
                    if (this.shapes[pad.tool]) {
                        const padshape = this.shapes[pad.tool].copy();
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
                    console.log(circle);
                    const gsf: jsts.util.GeometricShapeFactory = new jsts.util.GeometricShapeFactory(this.factory);
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
                    console.log(arc);
                    const gsf: jsts.util.GeometricShapeFactory = new jsts.util.GeometricShapeFactory(this.factory);
                    gsf.setSize(arc.radius * 2);
                    gsf.setNumPoints(60); // Total num of points from config?
                    gsf.setCentre(new jsts.geom.Coordinate(arc.center[0], arc.center[1]));
                    //  let sarc: jsts.geom.LineString;
                    if (arc.dir !== "cw") {
                        console.warn(`Arch direction ${arc.dir} arch not implemented!`);
                    }
                    //                   sarc = gsf.createArc(arc.sweep + arc.end[2] ,arc.sweep +arc.start[2]);
                    let ext = arc.start[2] - arc.end[2];
                    if (ext < 0) ext = Math.abs(Math.PI + ext);
                    //console.log(`Acr from  ${arc.start[2]} to ${ext}`);
                    const sarc = gsf.createArc(arc.start[2] - arc.sweep, ext);

                    // Log
                    console.log(sarc.getCoordinateN(0), sarc.getCoordinateN(sarc.getCoordinates().length - 1), arc.start, arc.end);

                    sarc.setUserData("arc");
                    return [sarc];
                }
                break;
            case IPlotterDataTypes.STROKE:
                {
                    const stroke = obj as IPlotterDataStroke;
                    console.log(stroke);
                    let lineStrings: jsts.geom.Geometry[] = stroke.path.reduce((acc, data) => {
                        return acc.concat(...this.iPlotterToModel(data));
                    }, [] as jsts.geom.Geometry[]);

                    //console.log("All Linstring geometry:",lineStrings.length);
                    this.unionOverlapping(lineStrings);
                    //console.log("Reduced geometry:",lineStrings.length);


                    /*
                    if(lineStrings.length == 1 && lineStrings[0].isValid()){
                        console.log(JSON.stringify(lineStrings[0],undefined,2));
                    }
                    * /


                    lineStrings = lineStrings.map(lineString =>
                        lineString.buffer(stroke.width / 2, 60 /*$fn from config?* /, jsts.operation.buffer.BufferParameters.CAP_ROUND)
                    );

                    return lineStrings;
                }
                break;
            case IPlotterDataTypes.FILL:
                {
                    const fill = obj as IPlotterDataFill;
                    console.log(fill);
                    try {
                        const fpoly = this.factory.createLineString([
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
                    console.log(shape);
                    const submodel: jsts.geom.Geometry[] = [];
                    shape.shape.forEach((data: IPlotterData) => {
                        submodel.push(...this.iPlotterToModel(data));
                    });
                    if (submodel.length > 0) {
                        this.shapes[shape.tool] = submodel.reduce((prev, next) => prev.union(next));
                        this.shapes[shape.tool].setUserData("shape");
                    }
                }
                return [];
                break;
            case IPlotterDataTypes.SIZE:
                {
                    const size = obj as IPlotterDataSize;
                    console.log(size);
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
                                        * /
                }
                return [];
                break;
            default:
                console.warn("Unknown Object", obj, JSON.stringify(obj));
                return [];
                break;
        }
    }
*/
}
