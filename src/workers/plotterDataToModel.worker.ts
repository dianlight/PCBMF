import { IPlotterData, IPlotterDataCircle, IPlotterDataFill, IPlotterDataLine, IPlotterDataPad, IPlotterDataRect, IPlotterDataShape, IPlotterDataSize, IPlotterDataStroke, IPlotterDataTypes } from "@/models/plotterData";
import makerjs, { IPath, IPathMap, isPath, isPathCircle } from "makerjs";
import { IWorkerData, IWorkerDataType } from "@/models/workerData";
import { GCodeParser } from '@/parsers/gcodeparser';
//import fs from "fs";
//import path from "path";
//import temp from "temp";

interface IShapeDictionary {
    [index: number]: makerjs.IModel;
}

interface Options {
    showOutline: boolean;
    renderTime: number;
    useFill: boolean;
    useFillPitch: number;
    outlineTick: number;
}


{
    const ctx: Worker = self as any;

    let options: Options;
    let gmodel: makerjs.IModel = {}

    let shapes: IShapeDictionary = {};
    let cindex: number = 0;

    function iPlotterToModel(
        model: makerjs.IModel,
        obj: IPlotterData,
        options: Options
    ): void {
        switch (obj.type) {
            case IPlotterDataTypes.POLARITY:
                // Unknown?!?!?
                break;
            case IPlotterDataTypes.LINE: {
                const line = obj as IPlotterDataLine;
                makerjs.model.addPath(
                    model,
                    new makerjs.paths.Line(line.start, line.end),
                    "l_" + cindex++
                );
            }
                break;
            case IPlotterDataTypes.RECT:
                {
                    const rect = obj as IPlotterDataRect;
                    if (rect.r > 0) {
                        makerjs.model.addModel(
                            model,
                            makerjs.model.move(
                                new makerjs.models.RoundRectangle(
                                    rect.width,
                                    rect.height,
                                    rect.r
                                ),
                                [rect.cx - rect.width / 2, rect.cy - rect.height / 2]
                            ),
                            "rr_" + cindex++
                        );
                    } else {
                        makerjs.model.addModel(
                            model,
                            makerjs.model.move(
                                new makerjs.models.Rectangle(rect.width, rect.height),
                                [rect.cx - rect.width / 2, rect.cy - rect.height / 2]
                            ),
                            "rq_" + cindex++
                        );
                    }
                }
                break;
            case IPlotterDataTypes.PAD:
                {
                    const pad = obj as IPlotterDataPad;
                    makerjs.model.addModel(
                        model,
                        makerjs.model.move(makerjs.model.clone(shapes[pad.tool]), [
                            pad.x,
                            pad.y,
                        ]),
                        "pad_" + cindex++
                    );
                }
                break;
            case IPlotterDataTypes.CIRCLE:
                {
                    const circle = obj as IPlotterDataCircle;
                    makerjs.model.addPath(
                        model,
                        new makerjs.paths.Circle([circle.cx, circle.cy], circle.r),
                        "c_" + cindex++
                    );
                }
                break;
            case IPlotterDataTypes.STROKE:
                {
                    const stroke = obj as IPlotterDataStroke;
                    let submodel: makerjs.IModel = {};
                    stroke.path.forEach((data: IPlotterData) => {
                        iPlotterToModel(submodel, data, options);
                    });
                    if (submodel !== {}) {
                        makerjs.model.addModel(
                            model,
                            makerjs.model.outline(submodel, stroke.width / 2),
                            "stroke_" + cindex++
                        );
                    }
                }
                break;
            case IPlotterDataTypes.FILL:
                {
                    const fill = obj as IPlotterDataFill;
                    let submodel: makerjs.IModel = {};
                    fill.path.forEach((data: IPlotterData) => {
                        iPlotterToModel(submodel, data, options);
                    });
                    if (submodel !== {} && options.useFill) {
                        // Check chain
                        const chain = makerjs.model.findSingleChain(submodel);
                        console.log("Fill Chain is:", chain.endless);
                        makerjs.model.addModel(
                            model,
                            makerjs.model.outline(submodel, options.useFillPitch, 1, false),
                            "fill_" + cindex++
                        );
                    }
                }
                break;
            case IPlotterDataTypes.SHAPE:
                {
                    // Definisce un Tool!
                    const shape = obj as IPlotterDataShape;
                    let submodel: makerjs.IModel = {};
                    shape.shape.forEach((data: IPlotterData) => {
                        iPlotterToModel(submodel, data, options);
                    });
                    if (submodel !== {}) shapes[shape.tool] = submodel;
                }
                break;
            case IPlotterDataTypes.SIZE:
                {
                    const size = obj as IPlotterDataSize;
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
                }
                break;
            default:
                console.log(obj, JSON.stringify(obj));
                break;
        }
    }


    // Respond to message from parent thread
    ctx.addEventListener("message", (event) => {
       // console.log("From main", event)
        const data = event.data as IWorkerData<IPlotterData | Options>;
        switch (data.type) {
            case IWorkerDataType.ABORT:
            case IWorkerDataType.START:
            case IWorkerDataType.RESET:
                options = data.data as Options;
                gmodel = {};
                cindex = 0;
                shapes = [];
                break;
            case IWorkerDataType.CHUNK:
                let submodel: makerjs.IModel = {};
                iPlotterToModel(submodel, data.data as IPlotterData, options);
                if (Object.keys(submodel).length != 0 && submodel !== {}) {
                    if (submodel.notes !== undefined) {
                        //  console.log("-->", JSON.stringify(submodel.notes));
                        if (submodel.notes === "outline") {
                            makerjs.model.addModel(gmodel, submodel, "data_", false);
                        }
                    } else {
                        //  console.log(JSON.stringify(submodel));
                        gmodel = makerjs.model.combineUnion(gmodel, submodel);
                    }
                }
                break;
            case IWorkerDataType.END:
                makerjs.model.originate(gmodel);
                makerjs.model.simplify(gmodel);

                console.log("Apply outline:",options.outlineTick);
                const outline = makerjs.model.outline(gmodel,options.outlineTick/2,0,false);
               // let json = {};
                let gcode:String = "";
                if(outline){
                    outline.layer="outline";
                    makerjs.model.addModel(gmodel,outline,"isolation",true);
                   // json = makerjs.exporter.toJson(outline,{accuracy:4});

                    // Generate GCODE
                    const arcprecision = 60; // FIXME: from config
                    const code = new GCodeParser({
                        // Define the script name
                        name: '123',
                        // Define the scale to use (default is mm)
                        unit: 'mm',
                        // Define the starting x and y position
                        start: {x:0, y:0},
                        finish: {x:0, y:0}, // FIXME: Config Parking 
                        positioning: 'absolute',
                        feedrate: 50, // FIXME: From config or tool?
                        lines: false, // FIXME: From config
                        // Set the clearance height to 10cm
                        clearance: 10, // FIXME: From config travel height
                        precision: 4 // FIXME: From config
                      });
                    const cut_deep = 1; // FIXME: From model cut deep  
                    
                    function orderPath(cpoints:makerjs.IPoint[]) {

                        function isEqual(value:any, other:any):boolean {
                            return JSON.stringify(value) == JSON.stringify(other);
                        }

                        const state = code.getState();
                         
                        const near = makerjs.point.closest(
                            [state.position.x as number,state.position.y as number,state.position.z as number]
                            ,cpoints);
                        

                        if(isEqual(cpoints[0],near)){
                            return cpoints;
                        } else if(isEqual(cpoints[cpoints.length-1],near)){
                            return cpoints.reverse();
                        } else {
                            // FIXME: Find the new start!
                            return cpoints;
                        }
                    }


                    makerjs.model.walk(outline, {
                        beforeChildWalk: (wp):boolean=>{
                           // console.log(wp);
                            if(wp.childModel.paths){
                                Object.entries(wp.childModel.paths).forEach( (path)=>{
                                if(makerjs.isPathLine(path[1])){
                                    const pathLine = path[1] as unknown as makerjs.IPathLine;
                                    const opoints = orderPath([pathLine.origin,pathLine.end]);
                                    code.feedRapid({
                                        x: opoints[0][0],
                                        y: opoints[0][1],
                                    });
                                    code.feedLinear({
                                        x: opoints[1][0],
                                        y: opoints[1][1],
                                        z: -cut_deep
                                    });
                                } else if(makerjs.isPathArc(path[1]) || makerjs.isPathCircle(path[1]) || makerjs.isPathArcInBezierCurve(path[1])){
                                   // const pathArc = path[1] as unknown as makerjs.IPathArc;
                                    const points = makerjs.path.toPoints(path[1],arcprecision);
                                    const opoints = orderPath(points);
                                    code.feedRapid({
                                        x: opoints[0][0],
                                        y: opoints[0][1],                                            
                                    });
                                    opoints.forEach( (point, index)=>{
                                        if(index > 0)
                                        code.feedLinear({
                                            x: point[0],
                                            y: point[1],
                                            z: -cut_deep
                                        })
                                    });
                                    /*
                                    const cord = new makerjs.paths.Chord(pathArc);
                                    // Find Matching Path from 2 points.
                                    code.feedRapid({
                                        x: cord.origin[0],
                                        y: cord.origin[1],                                            
                                    });
                                    code.feedArch({
                                        x: cord.end[0],
                                        y: cord.end[1], 
                                        z: -cut_deep,
                                        i:pathArc.origin[0]-cord.origin[0],
                                        j:cord.origin[1]-pathArc.origin[0],
                                    })
                                    */
                                   /*
                                } else if(makerjs.isPathCircle(path[1])){
                                    // TODO: Please implements
                                } else if(makerjs.isPathArcInBezierCurve(path[1])){
                                    // TODO: Please implements
                                    */
                                } else {
                                    console.warn("Unknown path type", path);
                                }
                                });

                            } else {
                                console.error("Empty Paths for ",wp);
                            }
                            return false;
                        }
                    });
                    gcode = String(code);
                    //console.log(String(code));
                    // END
                }        
                const svg = makerjs.exporter.toSVG(gmodel,
                  {
                    units: makerjs.unitType.Millimeter,
                });
                ctx.postMessage({ type: IWorkerDataType.END, data: {svg:svg,gcode:gcode} });        
                break;
            default:
                console.error("Unknown worker command!", data);
                break;
        }
    });
}