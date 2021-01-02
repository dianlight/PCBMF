<template>
  <el-container direction="vertical">
    <h1 v-if="coppers.length == 0">No copper layer to process</h1>
    <el-row
      v-for="copper in coppers"
      :key="copper.layer"
      type="flex"
      align="middle"
      v-loading="!options[copper.layer] || options[copper.layer].busy"
      element-loading-text="Processing..."
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.8)"
    >
      <el-col :span="16">
        <h4>
          {{ copper.layer }}
          <small
            >Render Time:
            {{
              options[copper.layer] ? options[copper.layer].renderTime : "-"
            }}ms</small
          >
        </h4>

        <el-tabs type="border-card">
          <el-tab-pane label="Model">
            <geo-json-viewer
              :panzoom="true"
              _class="fullframe"
              :data.sync="copper.geojson"
            ></geo-json-viewer>
          </el-tab-pane>
          <el-tab-pane label="Work (3d)" :disabled="!copper.gcode" lazy>
            <g-code
              :data="copper.gcode"
              :gcgrid="true"
              :width="width"
              :height="height"
            ></g-code>
          </el-tab-pane>
          <el-tab-pane label="Gcode" :disabled="!copper.gcode">
            <highlightjs
              language="gcode"
              :code="copper.gcode || 'Loading...'"
            />
          </el-tab-pane>
        </el-tabs>
      </el-col>
      <el-col :span="8">
        <h1></h1>
        <el-form :model="copper" ref="formx" label-width="11em">
          <el-form-item
            label="Union elements"
            :rules="[
              {
                required: true,
                trigger: 'change',
                type: 'enum',
                enum: [true],
                message: '*Debug Option please Enable*',
              },
            ]"
          >
            <el-switch
              v-model="copper.unionDraw"
              @input="redrawpcb(copper)"
            ></el-switch>
          </el-form-item>
          <el-form-item
            label="Margin"
            :rules="[{ required: true, trigger: 'change' }]"
            prop="margin"
          >
            <el-select
              v-model="copper.margin"
              value-key="name"
              placeholder="Margins..."
              @change="redrawpcb(copper)"
              size="mini"
              clearable
            >
              <el-option label="Envelope" value="Envelope" />
              <el-option label="ConvexHull" value="ConvexHull" />
              <el-option label="Board" value="Board"/>
            </el-select>
          </el-form-item>
          <el-form-item
            label="Thief Mode"
            :rules="[{ required: true, trigger: 'change' }]"
            prop="mode"
          >
            <el-select
              v-model="copper.mode"
              value-key="name"
              placeholder="Mode..."
              @change="redrawpcb(copper)"
              size="mini"
              clearable
            >
              <el-option label="Outline" value="Outline" />
              <el-option label="Box (not yet implemented)" value="Box" :disabled="true" />
              <el-option label="Line (not yet implemented)" value="Line" :disabled="true"/>
              <el-option label="Spiral (not yet implemented)" value="Spiral" :disabled="true"/>
              <el-option label="Voronoi (not yet implemented)" value="Voronoi" disabled />
            </el-select>
          </el-form-item>
          <el-form-item
            label="Cycles for Tools"
            :rules="[
              { required: true, trigger: 'blur', type: 'number', min: 0.0001 },
            ]"
            prop="toolCycles"
          >
            <el-input-number
              size="mini"
              v-model="copper.toolCycles"
              :min="1"
              :max="10"
              :precision="0"
              :step="1"
              @change="redrawpcb(copper)"
              :disabled="copper.mode !== 'Outline'"
            ></el-input-number>
          </el-form-item>


          <el-form-item
            label="Copper Tools"
            :rules="[{ required: true, trigger: 'change' }]"
            prop="toolTypes"
          >
            <el-select
              v-model="copper.toolTypes"
              value-key="name"
              placeholder="Tool..."
              @change="toolChange(copper)"
              size="mini"
              clearable
              multiple
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
          <el-form-item
            label="Copper thickness"
            :rules="[
              { required: true, trigger: 'blur', type: 'number', min: 0.0001 },
            ]"
            prop="dthickness"
          >
            <el-input-number
              size="mini"
              v-model="copper.dthickness"
              :min="0"
              :max="5"
              :precision="4"
              :step="0.1"
              :disabled="copper.toolTypes == 0"
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
import whatsThatGerber from "whats-that-gerber";
import { mapGetters, mapMutations, mapState } from "vuex";
import { mapFields, mapMultiRowFields } from "vuex-map-fields";
import { ElTable } from "element-ui/types/table";
import FSStore from "@/fsstore";
import Component from "vue-class-component";
import { Inject, VModel } from "vue-property-decorator";
import GCode from "@/vue/components/gcode.vue";
//import SvgViewer from "@/vue/components/svgviewer.vue";
import GeoJsonViewer from "@/vue/components/geojsonviewer.vue";
import fs from "fs";
import { PcbLayers } from "@/models/pcblayer";
import { GerberSide, GerberType } from "whats-that-gerber";
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
//import { IWorkerDataIn, EWorkerDataTypeIn } from "@/models/workerData";
import { IProject, IProjectCopper } from "@/models/project";
import { Store } from "vuex";
import { Tooldb } from "@/typings/tooldb";
import { Form } from "element-ui";
import {
  GerberParser,
  IGerberParserOption,
  IGerberParserResult,
} from "@/workers/gerberParser";
import { IsolationWork } from "@/workers/isolationWork";
import { spawn, Thread, Worker, Transfer } from "threads";
import { IDictionary } from "@/models/dictionary";
import { FeatureCollection } from "geojson";
import { ThiefWork } from "@/workers/thiefWork";

interface Options {
  renderTime: number;
  busy: boolean;
}

@Component({
  components: {
    GCode,
    //    SvgViewer,
    GeoJsonViewer,
  },
  computed: {
    ...mapFields(["layers", "config.pcb.width", "config.pcb.height"]),
    ...mapMultiRowFields(["config.coppers"]),
  },
})
export default class WizardCopper extends Vue {
  toolTypes: Tooldb[] = [];
  options: IDictionary<Options> = {};

  @Inject() readonly registerNextCallback:
    | ((
        callback: (
          type: "next" | "back" | "skip"
        ) => boolean | PromiseLike<boolean>
      ) => void)
    | undefined;
  @Inject() readonly enableButtons:
    | ((prev: boolean, skip: boolean, next: boolean) => void)
    | undefined;
  @Inject() readonly wizardPushSkip: (() => void) | undefined;

  mounted() {
    this.enableButtons!(true, true, true);
    this.registerNextCallback!((type: "next" | "back" | "skip") => {
      // Gestione Skip
      if (type === "skip" || type == "back") return Promise.resolve(true);
      // Validazione
      //console.log(this.$refs.formx);
      let formArray: Form[] = (this.$refs.formx as unknown) as Form[];

      return new Promise((resovedall) => {
        const results = Promise.all(
          formArray.map(
            (form) =>
              new Promise<boolean>((resolve) => {
                form.validate((valid) => {
                  console.log(valid, form);
                  if (valid) resolve(true);
                  else resolve(false);
                });
              })
          )
        ).then((results) => {
          resovedall(results.every((value, index, all) => value == true));
        });
      });
    });

    this.$store.commit("updateField", {
      path: "config.coppers",
      value: (this.$store.state.layers as PcbLayers[])
        .filter((layer) => {
          return layer.type === whatsThatGerber.TYPE_COPPER && layer.enabled;
        })
        .map((layer, index) => {
          const ret: IProjectCopper = {
            layer: layer.name,
            unionDraw: true,
            toolTypes: [],
            dthickness: undefined,
            toolCycles: 1,
            svg: undefined,
            gcode: undefined,
            geojson: undefined,
            mode: undefined,
            margin: undefined,
          };
          const oldrecord = (this.$store.state as IProject).config.coppers.find(
            (layer) => layer.layer === ret.layer
          );
          if (oldrecord) {
            Object.assign(ret, oldrecord);
          }
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
        this.toolTypes = data.filter((tool: Tooldb) => tool.type === "Mill");
      });
    });

    if ((this.$store.state as IProject).config.coppers.length == 0) {
      console.log("No copper need to skip");
      this.wizardPushSkip!();
    }
  }

  toolChange(copper: IProjectCopper) {
    const index = (this.$store.state as IProject).config.coppers.findIndex(
      (iso) => iso.layer === copper.layer
    );
    const state = (this.$store as Store<IProject>).state;
    if (
      state &&
      state.config &&
      state.config.pcb &&
      state.config.pcb.blankType
    ) {
      this.$store.commit("updateField", {
        path: `config.coppers[${index}].dthickness`,
        value: state!.config!.pcb!.blankType.cthickness as number,
      });
      this.redrawpcb(copper);
    } else {
      console.error("Error instate object", state);
    }
  }

  redrawpcb(copper: IProjectCopper) {
    this.options[copper.layer].busy = true;
    this.options[copper.layer].renderTime = 0;
    this.$forceUpdate();
    const startTime = Date.now();

    const _layer = JSON.parse(
      JSON.stringify(
        (this.$store.state.layers as PcbLayers[]).filter(
          (layer) => layer.name === copper.layer
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

    spawn<GerberParser>(new Worker("../../workers/gerberParser")).then(
      async (gerberParser) => {
        await gerberParser.create({
          unionDraw: copper.unionDraw,
        });
        await gerberParser.load((_layer as PcbLayers).gerber);
        gerberParser.commit().then(async (data) => {
          const index = (this.$store
            .state as IProject).config.coppers.findIndex(
            (iso) => iso.layer === copper.layer
          );
          this.$store.commit("updateField", {
            path: `config.coppers.${index}.geojson`,
            value: data.geojson,
          });

          if (copper.margin && copper.toolTypes && copper.toolTypes.length > 0 && copper.mode) {
            console.log("Starting Tool calculation!");
            const thiefWork = await spawn<ThiefWork>(
              new Worker("../../workers/thiefWork")
            );
            const data2 = await thiefWork.create(
              {
                name: copper.layer,
                unit: "mm",
                drillPark: {
                  x: 0,
                  y: 0,
                },
                feedrate: 50,
                safeHtravel: 10,
                tools: copper.toolTypes,
                dthickness: copper.dthickness || 0,
                mode: copper.mode,
                cycles: copper.toolCycles || 1,
                margin: copper.margin,
                board: {
                  w:(this.$store.state as IProject).config.pcb.width as number,
                  h:(this.$store.state as IProject).config.pcb.height as number
                },
              },
              data.geojson as FeatureCollection
            );
            this.$store.commit("updateField", {
              path: `config.coppers.${index}.geojson`,
              value: data2.geojson,
            });
            this.$store.commit("updateField", {
              path: `config.coppers.${index}.gcode`,
              value: data2.gcode,
            });
            Thread.terminate(thiefWork);
          }

          this.options[_layer.name].renderTime = Date.now() - startTime;
          this.options[_layer.name].busy = false;
          this.$forceUpdate();
          Thread.terminate(gerberParser);
        });
      }
    );
  }
}
</script>

<style>
.fullframe svg {
  height: 100%;
  width: 100%;
}

/*
svg #outline {
  stroke: red;
  stroke-width: var(--copper-width);
  stroke-linecap: round;
}
*/

.hljs {
  max-height: 40em;
}
</style>