import { JobWorker } from "./jobWorker";
import makerjs, { chain, IChain, IModel, IPath, IPathLine, IPathMap, IPoint, isPath, isPathCircle, model } from "makerjs";
import { IPlotterData, IPlotterDataCircle, IPlotterDataFill, IPlotterDataLine, IPlotterDataPad, IPlotterDataRect, IPlotterDataShape, IPlotterDataSize, IPlotterDataStroke, IPlotterDataTypes } from "@/models/plotterData";
import { IPlotterToSvgResult, IPlotterToSvgOption } from "./plotterToSvg.model";

class PlotterToSvgWorker extends JobWorker<IPlotterToSvgOption|IPlotterData,IPlotterToSvgResult> {

    options: IPlotterToSvgOption = {
        /* Option Defaults */
        useFill:true,
        useFillPitch: 0.05
    }
    gmodel: IModel = {};
    gumodel: IModel = {};
    shapes: IModel[] = [];
    deferredmodel: IModel = {};

    abort(): void {
        throw new Error("Method not implemented.");
    }

    create(data: IPlotterToSvgOption): void {
        Object.assign(this.options,data);
        this.gmodel = {};
        this.shapes = [];
        this.inchunks = this.outchunks = 0;
    }

    reset(data: IPlotterToSvgOption): void {
        this.gmodel = {};
        this.shapes = [];
        this.inchunks = this.outchunks = 0;
    }

    load(data: IPlotterData): boolean {
       // let submodel: makerjs.IModel = {};
        let submodel = this.iPlotterToModel(/*submodel,*/ data) as IModel;
        makerjs.model.addModel(this.gmodel,submodel,"lay_",false);
        if(submodel.notes === "no_union"){
           makerjs.model.addModel(this.gumodel,submodel,"no_union_",false);
        } else if(submodel.notes === "deferred"){
            makerjs.model.addModel(this.deferredmodel,submodel,"deferred_",false);
        } else {
            this.gumodel = makerjs.model.combineUnion(makerjs.model.clone(this.gumodel),makerjs.model.clone(submodel));
        }
        /*
        if (Object.keys(submodel).length != 0 && submodel !== {}) {
            makerjs.model.addModel(this.gmodel, submodel, "load_", false);
            /*
            if (submodel.notes !== undefined) {
                //  console.log("-->", JSON.stringify(submodel.notes));
                if (submodel.notes === "outline") {
                    makerjs.model.addModel(gmodel, submodel, "data_", false);
                }
            } else {
                //  console.log(JSON.stringify(submodel));
                gmodel = makerjs.model.combineUnion(gmodel, submodel);
            }
            * /
        }  
        */
        this.outchunks++;
        return true;
    }
    commit() {
    
        //makerjs.model.originate(this.gmodel);
        //makerjs.model.simplify(this.gmodel);
    

        // Union of the model
        let smodel:IModel = {
            layer: "green"
        };
        const umodel:IModel = {
            layer: "red"
        };
        const omodel:IModel = {
            layer: "blue"
        }
        // const map = makerjs.model.findChains(this.gmodel) as IChain[];

        /*
        makerjs.model.walk(this.gmodel,{
            "onPath": (ctx)=>{
                if(ctx.modelContext.models && Object.entries(ctx.modelContext.models).length > 0)
                    console.log(ctx.routeKey,ctx.modelContext.paths);
                let found = false;
                for(let pathId in ctx.modelContext.paths) {
//                    console.log(ctx.modelContext.paths[pathId]);
                    makerjs.model.walk(smodel,{
                        "onPath": (ctx2)=>{
                            let found2 = false;
                            for(let pathId2 in ctx2.modelContext.paths) {
//                                console.log(ctx2.modelContext.paths[pathId2]); 
                                if(makerjs.path.intersection(
                                    ctx!.modelContext!.paths![pathId],
                                    ctx2.modelContext.paths[pathId2]
                                    )){
                                        found2=true;
                                        break;
                                    }                           
                            } 
                            if(found2){     
                                smodel = makerjs.model.combineUnion(ctx2.modelContext,ctx.modelContext);
                                found=true;
                            }
                        }
                    });                    
                } 
                if(!found){
                    makerjs.model.addModel(smodel, ctx.modelContext,"walk_",false);
                }     
            }
        });
        */
        /*
        map.forEach( (chain) => {
            if(!chain.endless){
                console.warn("Open Path found!",chain);
                chain.links.forEach( link => {
                    makerjs.model.addPath(omodel,link.walkedPath.pathContext,"ochian_",false);
                });
            } else {
                chain.links.forEach( link => {
                    makerjs.model.addPath(umodel,link.walkedPath.pathContext,"chian_",false);
                });
            }
        });
        */

        makerjs.model.originate(this.gumodel);
        makerjs.model.simplify(this.gumodel);
        
        
/*
        const signer = new makerjs.models.Ellipse(0.1,0.1);
        (signer as IModel).layer="red"; 
        makerjs.model.walk(this.gumodel,{
            "onPath": (wgpath)=>{
                makerjs.model.walk(this.deferredmodel,{
                    "onPath": (wdpath) => {
                        const intrs = makerjs.path.intersection(wgpath.pathContext,wdpath.pathContext);
                        if(intrs){
                            intrs.intersectionPoints.forEach(point => {
                                const csigner = makerjs.model.move(
                                    makerjs.model.clone(signer),point);
                                makerjs.model.addModel(this.gmodel, csigner, "sing_", false);   
                                // Cut path!
                               // makerjs.path.breakAtPoint(wgpath.pathContext,point);            
                            });
                            //makerjs.model.combineUnion(wgpath.modelContext,wdpath.modelContext);                        
                        }
                    },
                });
            }
});
*/


        this.gumodel.layer = "orange";
        this.gmodel.layer = "gray";
        makerjs.model.addModel(this.gmodel,this.gumodel,"chian",false);
       // makerjs.model.addModel(this.gmodel,smodel,"chian",false);
        //makerjs.model.addModel(this.gmodel,umodel,"chian",false);
        //makerjs.model.addModel(this.gmodel,omodel,"chian",false);
        

        /*
        makerjs.model.walk(this.gmodel,{
            "onPath": (ctx)=>{
                let found = false;
                map.forEach( (path) => {
                    if(!path.endless){
                        console.warn("Open Path found!",path);
                    } else {
                        path.links.forEach( link => {
                            if(makerjs.path.intersection(ctx.pathContext,link.walkedPath.pathContext)){
                                / * * /
                            }
                        });
                    }
                });
                if(!found){
                    makerjs.model.addModel()
                }
            }
        });
        */

        /*
        let outline = undefined;
        if(options.outlineTick){
            const outl = options.outlineTick > 0?options.outlineTick:-options.outlineTick;
            console.log("Apply outline:",options.outlineTick);
            outline = makerjs.model.outline(gmodel,outl/2,0,options.outlineTick > 0?false:true);
        }
        */
       /*
        let gcode:String = "";
        if(outline){
            outline.layer="outline";
            makerjs.model.addModel(gmodel,outline,"isolation",true);
           // json = makerjs.exporter.toJson(outline,{accuracy:4});

            // Generate GCODE
        //    const arcprecision = .2; // FIXME: from config maximum lenght between points.
            const code = new GCodeParser({
                // Define the script name
                name: options.name,
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
                precision: 3 // FIXME: From config
              });
            const cut_deep = options.cutdepth; // FIXME: From model cut deep  
            
            function orderPath(cpoints:makerjs.IPoint[]) {

                function isEqual(value:makerjs.IPoint, other:makerjs.IPoint):boolean {
                    if(!value)return false;
                    return  value[0].toFixed(code.options.precision) == other[0].toFixed(code.options.precision) 
                       && value[1].toFixed(code.options.precision) == other[1].toFixed(code.options.precision)
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
                        } else if(makerjs.isPathArc(path[1]) || makerjs.isPathArcInBezierCurve(path[1])){
                           // const pathArc = path[1] as unknown as makerjs.IPathArc;
                            const points = makerjs.path.toKeyPoints(path[1],1/(10*code.options.precision));
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
                            * /
                        } else if(makerjs.isPathCircle(path[1])){
                            const pathCircle = path[1] as unknown as makerjs.IPathCircle;
                            const segments = pathCircle.radius*2*Math.PI / (1/10*code.options.precision);
                            const points = makerjs.path.toPoints(pathCircle,segments);
                            const opoints = orderPath(points);
                            if(opoints && opoints[0]){
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
                            code.feedLinear({
                                x: opoints[0][0],
                                y: opoints[0][1],  
                                z: -cut_deep                                          
                            });    
                        }                                
                        /*
                        } else if(makerjs.isPathArcInBezierCurve(path[1])){
                            // TODO: Please implements
                            * /
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
        */      

        // Outline -- FIXME: Export to another worker!
        /*
        const chains = makerjs.model.findChains(this.gmodel) as IChain[];
        let o_model:IModel = {};
        chains.forEach( (chain) => {

            const points = makerjs.chain.toKeyPoints(chain);
            const a = points.map( point=> [point[0],point[1], 0]);
            const b =makerjs.path.toKeyPoints(makerjs.path.move(new makerjs.paths.Circle(0.1),points[0]))
            .map( point=> [point[0],point[1], 0]);
            const outline = msum.faces(a,b) as [][];
            console.log(outline);
            
            outline.forEach( (opoint,index,all) => {
                if(index > 0){
                    makerjs.model.addPath(o_model,new makerjs.paths.Line(all[index-1],opoint),"out_",false);
                }
            });      
        });
        
        o_model.layer="red";
        makerjs.model.addModel(this.gmodel,o_model,"o_model_",false);
        */
        // \Outline


        const svg = makerjs.exporter.toSVG(this.gmodel,
          {
            units: makerjs.unitType.Millimeter,
        });

        /* 
        this.outchunks == this.inchunks;
        this.sendProgress();
        */
        return { svg, model:this.gmodel };
    }

    cc:number=0;

    // Real Work
    iPlotterToModel(
        obj: IPlotterData,
        ): makerjs.IModel | makerjs.IPath {
        switch (obj.type) {
            case IPlotterDataTypes.POLARITY:
                // Unknown?!?!?
                return {}
                break;
            case IPlotterDataTypes.LINE: {
                const line = obj as IPlotterDataLine;
                return new makerjs.paths.Line(line.start, line.end);
            }
                break;
            case IPlotterDataTypes.RECT:
                {
                    const rect = obj as IPlotterDataRect;
                    if (rect.r > 0) {
                        return makerjs.model.move(
                            new makerjs.models.RoundRectangle(
                                rect.width,
                                rect.height,
                                rect.r
                            ),
                            [rect.cx - rect.width / 2, rect.cy - rect.height / 2]
                        );
                    } else {
                        return makerjs.model.move(
                            new makerjs.models.Rectangle(rect.width, rect.height),
                            [rect.cx - rect.width / 2, rect.cy - rect.height / 2]
                        );
                    }
                }
                break;
            case IPlotterDataTypes.PAD:
                {
                    const pad = obj as IPlotterDataPad;
                    return makerjs.model.move(makerjs.model.clone(this.shapes[pad.tool]), [
                        pad.x,
                        pad.y,
                    ]); 
                }
                break;
            case IPlotterDataTypes.CIRCLE:
                {
                    const circle = obj as IPlotterDataCircle;
                    return new makerjs.paths.Circle([circle.cx, circle.cy], circle.r);
                }
                break;
            case IPlotterDataTypes.STROKE:
                {
                    const stroke = obj as IPlotterDataStroke;
                    let submodel: makerjs.IModel = {};
                    stroke.path.forEach((data: IPlotterData) => {
                       //  this.iPlotterToModel(submodel, data);
                       const rtd = this.iPlotterToModel(data);
                       if( isPath( rtd)){
                           makerjs.model.addPath(submodel,rtd as IPath,"path_",false);
                       } else {
                           submodel = makerjs.model.combineUnion(submodel,rtd as IModel);
                       }
                    });
                    return makerjs.model.outline(submodel, stroke.width / 2);
                }
                break;
            case IPlotterDataTypes.FILL:
                {
                    if(!this.options.useFill ) return {};
                    this.cc++;
                    const fill = obj as IPlotterDataFill;
                    let submodel: makerjs.IModel = {};
                //    submodel.layer = "Fill"+Math.random();
                //    console.log(submodel.layer);
                    let dir = 'bo';
                    if(fill.path[0].start[0] >= fill.path[0].end[0] &&
                        fill.path[0].start[1] >= fill.path[0].end[1] ) {
                            dir='clock';
                            submodel.layer="red";
                        } else {
                            dir="unclock";
                            submodel.layer="green";
                        }
                    fill.path.forEach((data: IPlotterData) => {
                        const rtd = this.iPlotterToModel(data);
                        if( isPath(rtd)){
                            const lpath = rtd as IPathLine;
                        //    console.log("Path",lpath, (lpath.end[0]-lpath.origin[0]).toPrecision(2),(lpath.end[1]-lpath.origin[1]).toPrecision(2));
                            makerjs.model.addPath(submodel,rtd as IPath,"path_",false);
                        } else {
                           // submodel = makerjs.model.combineUnion(submodel,rtd as IModel);
                           console.log("Model",rtd);
                           makerjs.model.addModel(submodel,rtd as IModel,"fill_",false );
                        }
                    });
               //     submodel.notes = "deferred";//"no_union";
                    /*
                    const nm = makerjs.model.outline(submodel,this.options.useFillPitch,1,false);
                        nm.layer = 'green';
                        nm.notes = submodel.notes;
                        return nm;
                    */    
//                    console.log(makerjs.exporter.toSVG(submodel));
                      submodel.layer = makerjs.model.findSingleChain(submodel)!.endless?'green':'red';
                      return submodel;
                    /*
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
                }
                break;
            case IPlotterDataTypes.SHAPE:
                {
                    // Definisce un Tool!
                    const shape = obj as IPlotterDataShape;
                    let submodel: makerjs.IModel = {};
                    shape.shape.forEach((data: IPlotterData) => {
                        const rtd = this.iPlotterToModel(data);
                        if( isPath( rtd)){
                            makerjs.model.addPath(submodel,rtd as IPath,"path_",false);
                        } else {
                            submodel = makerjs.model.combineUnion(submodel,rtd as IModel);
                        }
                    });
                    if (submodel !== {}) this.shapes[shape.tool] = submodel;
                }
                return {};
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
                return {};
                break;
            default:
                console.log(obj, JSON.stringify(obj));
                return {};
                break;
        }
    }


}
{
    const ctx: Worker = self as any;
    new PlotterToSvgWorker(ctx);
}