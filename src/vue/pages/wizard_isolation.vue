<template>
  <el-container direction="vertical">
    <el-row
      v-for="isolation in isolations"
      :key="isolation.layer"
      type="flex"
      align="middle"
      v-loading="!options[isolation.layer] || options[isolation.layer].busy"
      element-loading-text="Processing..."
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.8)"
    >
      <el-col :span="16">
        <h4>
          {{ isolation.layer }}
          <small
            >Render Time:
            {{
              options[isolation.layer]
                ? options[isolation.layer].renderTime
                : "-"
            }}ms</small
          >
        </h4>

        <el-tabs type="border-card">
          <el-tab-pane label="Model">
            <svg-viewer
              :panzoom="true"
              _class="fullframe"
              :data="isolation.svg"
              :style="{ '--isolation-width': isolation.doutline * 2 + 'mm' }"
            ></svg-viewer>
          </el-tab-pane>
          <el-tab-pane label="Work (3d)" :disabled="!isolation.gcode" lazy>
            <g-code
              :data="isolation.gcode"
              :gcgrid="true"
              :width="width"
              :height="height"
            ></g-code>
          </el-tab-pane>
          <el-tab-pane label="Gcode" :disabled="!isolation.gcode">
            <highlightjs
              language="gcode"
              :code="isolation.gcode || 'Loading...'"
            />
          </el-tab-pane>
        </el-tabs>
      </el-col>
      <el-col :span="8">
        <h1></h1>
        <el-form ref="form" label-width="11em">
          <el-form-item label="Show Border">
            <el-switch
              v-model="isolation.showOutline"
              @input="redrawpcb(isolation)"
            ></el-switch>
          </el-form-item>
          <el-form-item label="Use Fill Elements">
            <el-switch
              v-model="isolation.useFill"
              @input="redrawpcb(isolation)"
            ></el-switch>
          </el-form-item>
          <el-form-item label="Fill Elements Outline">
            <el-input-number
              size="mini"
              v-model="isolation.useFillPitch"
              :min="0.0001"
              :max="1"
              :precision="4"
              :step="0.001"
              :disabled="!isolation.useFill"
              @change="redrawpcb(isolation)"
            ></el-input-number>
          </el-form-item>
          <el-form-item label="Isolation Tool">
            <el-select
              v-model="isolation.toolType"
              value-key="name"
              placeholder="Tool..."
              @change="toolChange(isolation)"
              size="mini"
            >
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
              v-model="isolation.dthickness"
              :min="0"
              :max="5"
              :precision="4"
              :step="0.1"
              :disabled="!isolation.toolType"
              @change="changeThickness(isolation)"
            ></el-input-number>
          </el-form-item>
          <el-form-item label="Isolation width">
            <el-input-number
              size="mini"
              v-model="isolation.doutline"
              :min="0.0001"
              :max="5"
              :precision="4"
              :step="0.001"
              :disabled="true"
              @change="redrawpcb(isolation)"
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
import { mapFields, mapMultiRowFields } from "vuex-map-fields";
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
import * as Trigonomerty from "@/utils/trigonometry";
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
import { IProject, IProjectIsolation } from "@/models/project";
import { Store } from "vuex";
import { Tooldb } from "@/typings/tooldb";
import { IPlotterOptions } from "@/workers/plotterDataToModel.worker";

interface IDictionary<T> {
  [index: string]: T;
}

interface Options {
  renderTime: number;
  busy: boolean;
}

@Component({
  components: {
    GCode,
    SvgViewer,
  },
  computed: {
    ...mapFields(["layers", "config.pcb.width", "config.pcb.height"]),
    ...mapMultiRowFields(["config.isolations"]),
  },
})
export default class WizardIsolation extends Vue {
  toolTypes: Tooldb[] = [];
  options: IDictionary<Options> = {};

  mounted() {
    this.$store.commit("updateField", {
      path: "config.isolations",
      value: (this.$store.state.layers as PcbLayers[])
        .filter((layer) => {
          return layer.type === whatsThatGerber.TYPE_COPPER && layer.enabled;
        })
        .map((layer) => {
          const ret: IProjectIsolation = {
            layer: layer.name,
            showOutline: false,
            useFill: false,
            useFillPitch: 0.005,
            toolType: undefined,
            dthickness: undefined,
            doutline: undefined,
            svg: undefined,
            gcode: undefined,
          };
          this.options[layer.name] = {
            renderTime: -1,
            busy: true,
          };
          this.redrawpcb(ret);
          return ret;
        }),
    });

    new Promise((resolve) => {
      FSStore.get("data.tool.types", []).then((data) => {
        this.toolTypes = data;
      });
    });
  }

  changeThickness(isolation: IProjectIsolation) {
    const index = (this.$store.state as IProject).config.isolations.findIndex(
      (iso) => iso.layer === isolation.layer
    );
    const state = (this.$store as Store<IProject>).state;
    const tool = isolation!.toolType;
    if (this.$store && this.$store.state) {
      if (tool && tool.type === "V-Shape") {
        this.$store.commit("updateField", {
          path: `config.isolations[${index}].doutline`,
          value: Trigonomerty.getTipDiamaterForVTool(
            tool.size as number,
            tool.angle as number,
            isolation.dthickness as number
          ),
        });
      } else if (tool) {
        this.$store.commit("updateField", {
          path: `config.isolations[${index}].doutline`,
          value: tool.size as number,
        });
      }
      this.redrawpcb(isolation);
    }
  }

  toolChange(isolation: IProjectIsolation) {
    const index = (this.$store.state as IProject).config.isolations.findIndex(
      (iso) => iso.layer === isolation.layer
    );
    const state = (this.$store as Store<IProject>).state;
    if (
      state &&
      state.config &&
      state.config.pcb &&
      state.config.pcb.blankType
    ) {
      this.$store.commit("updateField", {
        path: `config.isolations[${index}].dthickness`,
        value: state!.config!.pcb!.blankType.cthickness as number,
      });
      this.changeThickness(isolation);
    } else {
      console.error("Error instate object", state);
    }
  }

  redrawpcb(isolation: IProjectIsolation) {
    this.options[isolation.layer].busy = true;
    this.options[isolation.layer].renderTime = 0;
    this.$forceUpdate();
    const startTime = Date.now();

    const _layer = JSON.parse(
      JSON.stringify(
        (this.$store.state.layers as PcbLayers[]).filter(
          (layer) => layer.name === isolation.layer
        )[0]
      ),
      (k, v) => {
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
      }
    );

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
      data: {
        showOutline: isolation.showOutline,
        useFill: isolation.useFill,
        useFillPitch: isolation.useFillPitch,
        outlineTick: isolation.doutline,
      } as IPlotterOptions,
    });
    plotterWorker.onmessage = (event) => {
      //  console.log("From Render Warker!", event);
      const data = event.data as IWorkerData<{ svg: string; gcode: string }>;
      if (data.type === IWorkerDataType.END) {
        const index = (this.$store
          .state as IProject).config.isolations.findIndex(
          (iso) => iso.layer === isolation.layer
        );
        this.$store.commit("updateField", {
          path: `config.isolations.${index}.svg`,
          value: (event.data as IWorkerData<{ svg: string; gcode: string }>)
            .data.svg,
        });
        this.$store.commit("updateField", {
          path: `config.isolations.${index}.gcode`,
          value: (event.data as IWorkerData<{ svg: string; gcode: string }>)
            .data.gcode,
        });
        this.options[_layer.name].renderTime = Date.now() - startTime;
        this.options[_layer.name].busy = false;
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

.hljs {
  max-height: 40em;
}
</style>