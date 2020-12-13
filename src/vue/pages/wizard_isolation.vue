<template>
  <el-container direction="vertical">
    <el-row
      v-for="copper in coppers"
      :key="copper.filename"
      type="flex"
      align="middle"
      v-loading="options[copper.filename].busy"
      element-loading-text="Processing..."
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.8)"
    >
      <el-col :span="16">
        <h4>
          {{ copper.filename }}
          <small
            >Side: {{ copper.side }} Render Time:
            {{ options[copper.filename].renderTime }}ms</small
          >
        </h4>

        <el-tabs type="border-card">
          <el-tab-pane label="SVG">
            <svg-viewer
              :panzoom="true"
              _class="fullframe"
              :data="svgs[copper.filename]"
              :style="{'--isolation-width': (doutline[copper.filename]*2)+'mm' }"
            ></svg-viewer>
          </el-tab-pane>
          <el-tab-pane label="GCODE">
            <g-code :gcgrid="true" :width="width" :height="height"></g-code>
          </el-tab-pane>
        </el-tabs>
      </el-col>
      <el-col :span="8">
        <h1></h1>
        <el-form ref="form" label-width="11em">
          <el-form-item label="Show Border">
            <el-switch
              v-model="options[copper.filename].showOutline"
              @input="redrawpcb(copper)"
            ></el-switch>
          </el-form-item>
          <el-form-item label="Use Fill Elements">
            <el-switch
              v-model="options[copper.filename].useFill"
              @input="redrawpcb(copper)"
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
              @change="redrawpcb(copper)"
            ></el-input-number>
          </el-form-item>
          <el-form-item label="Isolation Tool">
            <el-select v-if="toolType[copper.filename]"  v-model="toolType[copper.filename]" value-key="name" placeholder="Select" @change="toolChange(copper)" size="mini">
              <el-option
                v-for="item in toolTypes"
                :key="item.name"
                :label="item.name"
                :value="item"
              >
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="Isolation thickness">
            <el-input-number
              size="mini"
              v-model="dthickness[copper.filename]"
              :min="0"
              :max="5"
              :precision="4"
              :step="0.001"
              :disabled="Object.keys(toolType).length == 0 || !toolType[copper.filename].name || toolType[copper.filename].type === 'V-Shape'"
              @change="redrawpcb(copper)"
            ></el-input-number>
          </el-form-item>          
          <el-form-item label="Isolation width">
            <el-input-number
              size="mini"
              v-model="doutline[copper.filename]"
              :min="0.0001"
              :max="5"
              :precision="4"
              :step="0.001"
              :disabled="Object.keys(toolType).length == 0 || !toolType[copper.filename].name || toolType[copper.filename].type !== 'V-Shape'"
              @change="redrawpcb(copper)"
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
import PlotterWorker from "_/workers/plotterDataToModel.worker";

let svg_top: string, svg_bottom: string;

interface IDictionary<T> {
  [index: string]: T;
}

interface Options {
  showOutline: boolean;
  outlineTick: number;
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
    ...mapFields([
      "layers",
      "config.pcb.width",
      "config.pcb.height",
      "config.isolation.toolType",
      "config.isolation.dthickness",
      "config.isolation.doutline",
    ]),
  },
})
export default class WizardIsolation extends Vue {
  coppers: PcbLayers[] = [];
  svgs: IDictionary<String> = {};

  toolTypes: any[] = [];
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
        outlineTick: 0.1
      };
      if(!this.$store.state.config.isolation.toolType[copper.filename])
        this.$store.state.config.isolation.toolType[copper.filename]={};
      this.redrawpcb(copper);
    });

    new Promise((resolve) => {
      FSStore.get("data.tool.types", []).then((data) => {
     //   console.log("---->", data);
        this.toolTypes = data;
      });
    });   
  }


  toolChange(layer: PcbLayers) {
    const tool = this.$store.state.config.isolation.toolType[layer.filename];
  //  console.log(tool);
    // FIXME: Implement tool.size calculation for V-Shape tool
    this.$store.state.config.isolation.dthickness[layer.filename] = 0.0;
    this.$store.state.config.isolation.doutline[layer.filename] = tool.size;
  }

  redrawpcb(layer: PcbLayers) {
    const isow = this.$store.state.config.isolation.doutline[layer.filename];
    if(isow) this.options[layer.filename].outlineTick = isow;
    this.options[layer.filename].busy = true;
    this.options[layer.filename].renderTime = 0;
    this.$forceUpdate();
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
      optimizePaths: true,
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

    plotterWorker.postMessage({
      type: IWorkerDataType.START,
      data: this.options[layer.filename],
    });
    plotterWorker.onmessage = (event) => {
      console.log("From Render Warker!", event);
      const data = event.data as IWorkerData<{svg:string,json:string}>;
      if (data.type === IWorkerDataType.END) {
        this.svgs[layer.filename] = (event.data as IWorkerData<{svg:string,json:string}>).data.svg;
        this.$store.state.isol
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
        plotterWorker.postMessage({ type: IWorkerDataType.CHUNK, data: obj });
      })
      .on("end", () => {
        plotterWorker.postMessage({ type: IWorkerDataType.END });
      });
  }
}
</script>

<style>
.fullframe svg {
  height: 100%;
  width: 100%;
}

svg #outline {
  stroke: red;
  stroke-width: var(--isolation-width);
  stroke-linecap: round;
}
</style>