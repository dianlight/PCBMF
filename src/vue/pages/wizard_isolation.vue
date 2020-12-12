<template>
  <el-container
    direction="vertical"
  >
    <el-row v-for="copper in coppers" :key="copper.filename"
            v-loading="options[copper.filename].busy"
            element-loading-text="Processing..."
            element-loading-spinner="el-icon-loading"
            element-loading-background="rgba(0, 0, 0, 0.8)"
    >
      <el-col :span="18">
        {{ copper.filename }} Layer:{{ copper.side }}
        {{ options[copper.filename].renderTime }}ms
        <el-tabs type="border-card">
          <el-tab-pane label="SVG">
            <svg-viewer
              :panzoom="true"
              _class="fullframe"
              :data="svgs[copper.filename]"
            ></svg-viewer>
          </el-tab-pane>
          <el-tab-pane label="GCODE">
            <g-code :gcgrid="true" :width="width" :height="height"></g-code>
          </el-tab-pane>
        </el-tabs>
      </el-col>
      <el-col :span="6">
        <el-form ref="form" label-width="120px">
          <el-form-item label="Show Border">
            <el-switch
              v-model="options[copper.filename].showOutline"
              @input="redrawpcb(copper, options[copper.filename])"
            ></el-switch>
          </el-form-item>
          <el-form-item label="Use Fill Elements">
            <el-switch
              v-model="options[copper.filename].useFill"
              @input="redrawpcb(copper, options[copper.filename])"
            ></el-switch>
          </el-form-item>
          <el-form-item label="Fill Elements Outline">
            <el-input-number
              size="mini"
              v-model="options[copper.filename].useFillPitch"
              :min="0.0001"
              :max="1"
              :precision="4"
              :step="0.001"
              :disabled="!options[copper.filename].useFill"
              @change="redrawpcb(copper, options[copper.filename])"
            ></el-input-number>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </el-container>
</template>

<script lang="ts">
import Vue from "vue";
import store from "../store";
//import pcbStackup from "pcb-stackup";
import gerberToSvg from "gerber-to-svg";
import whatsThatGerber from "whats-that-gerber";
import { mapGetters, mapMutations, mapState } from "vuex";
import { mapFields } from "vuex-map-fields";
import { ElTable } from "element-ui/types/table";
import FSStore from "@/fsstore";
import Component from "vue-class-component";
import { VModel } from "vue-property-decorator";
import GCode from "@/vue/components/gcode.vue";
import SvgViewer from "@/vue/components/svgviewer.vue";
import fs from "fs";
import { PcbLayers } from "@/models/pcblayer";
import { GerberSide, GerberType } from "whats-that-gerber";
import makerjs from "makerjs";
import { Duplex } from "stream";
import gerberParser from "gerber-parser";
import gerberPlotter from "gerber-plotter";
import colornames from "colornames";
import {
  IPlotterData,
  IPlotterDataCircle,
  IPlotterDataFill,
  IPlotterDataLine,
  IPlotterDataPad,
  IPlotterDataPolarity,
  IPlotterDataRect,
  IPlotterDataShape,
  IPlotterDataSize,
  IPlotterDataStroke,
  IPlotterDataTypes,
} from "@/models/plotterData";
import { IWorkerData, IWorkerDataType } from "@/models/workerData";
import PlotterWorker from "worker-loader!../../workers/plotterDataToModel.worker";

let svg_top: string, svg_bottom: string;

interface IDictionary<T> {
  [index: string]: T;
}

/* interface IShapeDictionary {
  [index: number]: makerjs.IModel;
} */

interface Options {
  showOutline: boolean;
  renderTime: number;
  useFill: boolean;
  useFillPitch: number;
  busy: boolean;
}

@Component({
  components: {
    GCode,
    SvgViewer,
  },
  computed: {
    ...mapFields(["layers", "config.pcb.width", "config.pcb.height"]),
  },
})
export default class WizardIsolation extends Vue {
  coppers: PcbLayers[] = [];
  svgs: IDictionary<String> = {};

  options: IDictionary<Options> = {};

  mounted() {
    //
    this.coppers = (this.$store.state.layers as PcbLayers[]).filter(
      (layer) => layer.type === whatsThatGerber.TYPE_COPPER && layer.enabled
    );
    this.coppers.forEach((copper) => {
      this.options[copper.filename] = {
        showOutline: false,
        renderTime: 0,
        useFill: false,
        useFillPitch: 0.01,
        busy: true,
      };
      this.redrawpcb(copper);
    });
  }

  /* shapes: IShapeDictionary = {};
  cindex: number = 0;

  iPlotterToModel(
    model: makerjs.IModel,
    obj: IPlotterData,
    options: Options
  ):void {
    switch (obj.type) {
      case IPlotterDataTypes.POLARITY:
        // Unknown?!?!?
        break;
      case IPlotterDataTypes.LINE:{
        const line = obj as IPlotterDataLine;
        makerjs.model.addPath(
          model,
          new makerjs.paths.Line(line.start, line.end),
          "l_" + this.cindex++
        );}
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
              "rr_" + this.cindex++
            );
          } else {
            makerjs.model.addModel(
              model,
              makerjs.model.move(
                new makerjs.models.Rectangle(rect.width, rect.height),
                [rect.cx - rect.width / 2, rect.cy - rect.height / 2]
              ),
              "rq_" + this.cindex++
            );
          }
        }
        break;
      case IPlotterDataTypes.PAD:
        {
          const pad = obj as IPlotterDataPad;
          makerjs.model.addModel(
            model,
            makerjs.model.move(makerjs.model.clone(this.shapes[pad.tool]), [
              pad.x,
              pad.y,
            ]),
            "pad_" + this.cindex++
          );
        }
        break;
      case IPlotterDataTypes.CIRCLE:
        {
          const circle = obj as IPlotterDataCircle;
          makerjs.model.addPath(
            model,
            new makerjs.paths.Circle([circle.cx, circle.cy], circle.r),
            "c_" + this.cindex++
          );
        }
        break;
      case IPlotterDataTypes.STROKE:
        {
          const stroke = obj as IPlotterDataStroke;
          let submodel: makerjs.IModel = {};
          stroke.path.forEach((data: IPlotterData) => {
            this.iPlotterToModel(submodel, data, options);
          });
          if (submodel !== {}) {
            makerjs.model.addModel(
              model,
              makerjs.model.outline(submodel, stroke.width / 2),
              "stroke_" + this.cindex++
            );
          }
        }
        break;
      case IPlotterDataTypes.FILL:
        {
          const fill = obj as IPlotterDataFill;
          let submodel: makerjs.IModel = {};
          fill.path.forEach((data: IPlotterData) => {
            this.iPlotterToModel(submodel, data, options);
          });
          if (submodel !== {} && options.useFill) {
            // Check chain
            const chain = makerjs.model.findSingleChain(submodel);
            console.log("Fill Chain is:", chain.endless);
            makerjs.model.addModel(
              model,
              makerjs.model.outline(submodel, options.useFillPitch, 1, false),
              "fill_" + this.cindex++
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
            this.iPlotterToModel(submodel, data, options);
          });
          if (submodel !== {}) this.shapes[shape.tool] = submodel;
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
            makerjs.model.addModel(model, submodel, "outline_" + this.cindex++);
          }
        }
        break;
      default:
        console.log(obj, JSON.stringify(obj));
        break;
    }
  } */

  redrawpcb(layer: PcbLayers) {
    this.options[layer.filename].busy = true;
    this.options[layer.filename].renderTime = 0;
    this.$forceUpdate();
    // return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const _layer = JSON.parse(JSON.stringify(layer), (k, v) => {
      if (
        v !== null &&
        typeof v === "object" &&
        "type" in v &&
        v.type === "Buffer" &&
        "data" in v &&
        Array.isArray(v.data)
      ) {
        return Buffer.from(v.data);
      }
      return v;
    });
    // console.log("C-Rendering: ", _layer);

    const stream = new Duplex();
    stream.push((_layer as PcbLayers).gerber);
    stream.push(null);

    var parser = gerberParser({
      filetype: "gerber",
    });
    var plotter = gerberPlotter({
      optimizePaths: false,
      plotAsOutline: false, // or mm?!?!?
    });

    plotter.on("warning", function (w) {
      console.warn("plotter warning at line " + w.line + ": " + w.message);
    });

    plotter.once("error", function (e) {
      console.error("plotter error: " + e.message);
    });

    let model: makerjs.IModel = {
      origin: [0, 0],
      units: makerjs.unitType.Millimeter,
    };

    let index = 0;
    const plotterWorker = new PlotterWorker();

    plotterWorker.postMessage({ type: IWorkerDataType.START, data: this.options[layer.filename] });
    plotterWorker.onmessage = (event) => { 
        console.log("From Render Warker!",event);
        const data = event.data as IWorkerData<string>;
          if(data.type === IWorkerDataType.END){
          this.svgs[layer.filename] = (event.data as IWorkerData<string>).data;
          this.options[layer.filename].renderTime = Date.now() - startTime;
          this.options[layer.filename].busy = false;
          this.$forceUpdate();
        }
      };

    stream
      .pipe(parser)
      .pipe(plotter)
      .on("error", (error) => console.error(error))
      .on("data", (obj: IPlotterData) => {

        plotterWorker.postMessage({ type: IWorkerDataType.CHUNK, data: obj});

/*
        // console.log(this.iPlotterToModel(obj));
        let submodel: makerjs.IModel={};
        this.iPlotterToModel(submodel, obj, this.options[layer.filename]);
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

        if (Object.keys(submodel).length != 0 && submodel !== {}) {
          if (index < 10000) {
            //   console.log("Submodel",JSON.stringify(submodel), colornames.all()[index].value);
            // TMP
            / *
              submodel.layer = colornames.all()[index].value;
              makerjs.model.addModel(model, submodel, "data_" + index, true);
              * /

            if (submodel.notes !== undefined) {
            //  console.log("-->", JSON.stringify(submodel.notes));
              if (submodel.notes === "outline") {
                makerjs.model.addModel(model, submodel, "data_" + index, true);
              }
            } else {
            //  console.log(JSON.stringify(submodel));
              submodel.layer = colors[index % colors.length];
              model = makerjs.model.combineUnion(model, submodel);
            }
          }
          index++;
          //          makerjs.model.addModel(model,makerjs.model.outline(submodel,0.1,0),lindex, true);
        }
        */

        //        else if( submodel) model = makerjs.model.combine(model,submodel);

        //        if(submodel){
        //          const chains: makerjs.IChainsMap = makerjs.model.findChains(submodel,{
        //          byLayers: true,
        //          unifyBeziers: true,
        //          contain: true,
        //        }) as makerjs.IChainsMap;
        //        console.log(chains);
        //        Object.entries(chains).forEach( (chain, indexm, carray) => {
        //         model.models[lindex+"_"+indexm] = makerjs.chain.toNewModel(chain[1],false);
        //       });

        //       }
      })
      .on("end", () => {
        plotterWorker.postMessage({ type: IWorkerDataType.END});
      
/*
        makerjs.model.originate(model);
        makerjs.model.simplify(model);

        (this.svgs[layer.filename] = makerjs.exporter.toSVG(model)),
          {
            units: makerjs.unitType.Millimeter,
          };
        this.options[layer.filename].renderTime = Date.now() - startTime;
        this.loading = false;
        this.$forceUpdate();
*/        
        /*
    gerberToSvg(_layer.gerber, {
      filetype: 'gerber',
      optimizePaths: true,
      plotAsOutline: false,
      attributes: {
        width: "100%",
      },
    },(error, svg) => {
        if(error) console.error(error);
        this.svgs[layer.filename] = svg;
        this.$forceUpdate();
      });
*/
      });
  }
}
</script>

<style>
.fullframe svg {
  height: 100%;
  width: 100%;
}
/*
:root {
  overflow-y: auto;
}
.emulate-root {
  background: var(--foreground);
  display: flex;
  height: 100%;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
}
.menu-icon {
  left: 5px;
  position: absolute !important;
  top: 5px;
  z-index: 5;
}
.v-list {
  max-height: 80vh;
}
.v-navigation-drawer {
  z-index: 10;
}
*/
</style>