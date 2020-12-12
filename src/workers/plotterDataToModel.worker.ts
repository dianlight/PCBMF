import { IPlotterData, IPlotterDataCircle, IPlotterDataFill, IPlotterDataLine, IPlotterDataPad, IPlotterDataRect, IPlotterDataShape, IPlotterDataSize, IPlotterDataStroke, IPlotterDataTypes } from "@/models/plotterData";
import makerjs from "makerjs";
import { IWorkerData, IWorkerDataType } from "@/models/workerData";
import { Switch } from "element-ui";

interface IShapeDictionary {
    [index: number]: makerjs.IModel;
}

interface Options {
    showOutline: boolean;
    renderTime: number;
    useFill: boolean;
    useFillPitch: number;
}


{
    const ctx: Worker = self as any;

    let options: Options;
    let gmodel: makerjs.IModel = {}

    // Post data to parent thread
    //ctx.postMessage({ foo: "foo" });

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
        console.log("From main", event)
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
                /*
                const colors = [
                    "green",
                    "orange",
                    "red",
                    "gray",
                    "darkgreen",
                    "brown",
                    "blue",
                    "darkyellow",
                    "purple",
                ];
                */
                if (Object.keys(submodel).length != 0 && submodel !== {}) {
                    if (submodel.notes !== undefined) {
                        //  console.log("-->", JSON.stringify(submodel.notes));
                        if (submodel.notes === "outline") {
                            makerjs.model.addModel(gmodel, submodel, "data_", false);
                        }
                    } else {
                        //  console.log(JSON.stringify(submodel));
                        //  submodel.layer = colors[index % colors.length];
                        gmodel = makerjs.model.combineUnion(gmodel, submodel);
                    }
                }
                break;
            case IWorkerDataType.END:
                makerjs.model.originate(gmodel);
                makerjs.model.simplify(gmodel);
        
                const svg = makerjs.exporter.toSVG(gmodel,
                  {
                    units: makerjs.unitType.Millimeter,
                });
                ctx.postMessage({ type: IWorkerDataType.END, data: svg });
                break;
            default:
                console.error("Unknown worker command!", data);
                break;
        }
    });
}