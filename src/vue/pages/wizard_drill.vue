<template>
  <el-container direction="vertical">
    <h1 v-if="drills.length == 0">No drill layer to process</h1>
    <el-row
      v-for="(drill) in drills"
      :key="drill.layer"
      type="flex"
      align="middle"
      v-loading="!options[drill.layer] || options[drill.layer].busy"
      element-loading-text="Processing..."
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.8)"
    >
      <el-col :span="16">
        <h4>
          {{ drill.layer }}
          <small
            >Render Time:
            {{
              options[drill.layer]
                ? options[drill.layer].renderTime
                : "-"
            }}ms</small
          >
        </h4>

        <el-tabs type="border-card">
          <el-tab-pane label="Model">
            <geo-json-viewer
              :panzoom="true"
              _class="fullframe"
              :data.sync="drill.geojson"
            ></geo-json-viewer>
          </el-tab-pane>
          <el-tab-pane label="Work (3d)" :disabled="!drill.gcode" lazy>
            <g-code
              :data="drill.gcode"
              :gcgrid="true"
              :width="width"
              :height="height"
            ></g-code>
          </el-tab-pane>
          <el-tab-pane label="Gcode" :disabled="!drill.gcode">
            <highlightjs
              language="gcode"
              :code="drill.gcode || 'Loading...'"
            />
          </el-tab-pane>
        </el-tabs>
      </el-col>
      <el-col :span="8">
        <h1></h1>
        <el-form :model="drill" ref="formx" label-width="11em">
          <!--
          <el-form-item label="Show Border">
            <el-switch
              v-model="drill.showOutline"
              @input="redrawpcb(drill)"
            ></el-switch>
          </el-form-item>
          -->
          <el-form-item label="drill Tool" :rules="[{ required: true, trigger:'change' }]" 
          prop="toolType">
            <el-select
              v-model="drill.toolType"
              value-key="name"
              placeholder="Tool..."
              @change="toolChange(drill)"
              size="mini"
              clearable
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
            label="drill thickness"
            :rules="[{ required: true, trigger:'blur', type: 'number', min: 0.0001 }]"
            prop="dthickness"
          >
            <el-input-number
              size="mini"
              v-model="drill.dthickness"
              :min="0"
              :max="50"
              :precision="4"
              :step="0.1"
              :disabled="!drill.toolType"
              @change="changeThickness(drill)"
            ></el-input-number>
          </el-form-item>
          <el-form-item
            label="drill width"
            :rules="[{ required: true,trigger:'blur', type: 'number', min: 0.0001 }]"
            prop="doutline"
          >
            <el-input-number
              size="mini"
              v-model="drill.doutline"
              :min="0.0001"
              :max="5"
              :precision="4"
              :step="0.001"
              :disabled="true"
              @change="redrawpcb(drill)"
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
//import gerberToSvg from "gerber-to-svg";
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
//import fs from "fs";
import { PcbLayer, PcbLayer } from "@/models/pcblayer";
//import { GerberSide, GerberType } from "whats-that-gerber";
//import colornames from "colornames";
//import * as Trigonomerty from "@/utils/trigonometry";
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
import { IProject, IProjectDrill } from "@/models/project";
import { Store } from "vuex";
import { Tooldb } from "@/typings/tooldb";
import { Form } from "element-ui";
import { IDictionary } from "@/models/dictionary";
import { GerberParser } from "@/workers/gerberParser";
import { spawn, Thread, Worker, Transfer } from "threads";
import { IsolationWork } from "@/workers/isolationWork";
import { FeatureCollection } from "geojson";

interface Options {
  renderTime: number;
  busy: boolean;
}

@Component({
  components: {
    GCode,
    GeoJsonViewer,
  },
  computed: {
    ...mapFields(["layers", "config.pcb.width", "config.pcb.height"]),
    ...mapMultiRowFields(["config.drills"]),
  },
})
export default class WizardDrill extends Vue {
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
      let formArray: Form[] = ((this.$refs.formx as unknown) as Form[]);
 
      return new Promise((resovedall) => {
        const results = Promise.all(
          formArray.map(
            (form) =>
              new Promise<boolean>((resolve) => {
                form.validate((valid) => {
                  console.log(valid,form);
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
      path: "config.drills",
      value: (this.$store.state.layers as PcbLayer[])
        .filter((layer) => {
          return layer.type === whatsThatGerber.TYPE_DRILL && layer.enabled;
        })
        .map((layer, index) => {
          const ret: IProjectDrill = {
            layer: layer.name,
            showOutline: false,
            toolType: undefined,
            dthickness: undefined,
            doutline: undefined,
            svg: undefined,
            gcode: undefined,
            geojson: undefined
          };
          const oldrecord = (this.$store
            .state as IProject).config.drills.find(
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
        this.toolTypes = data.filter((tool:Tooldb)=>tool.type === 'Drill' || tool.type === 'Mill');;
      });
    });

    if ((this.$store.state as IProject).config.drills.length == 0) {
      console.log("No drill need to skip");
      this.wizardPushSkip!();
    }
  }

  changeThickness(drill: IProjectDrill) {
    const index = (this.$store.state as IProject).config.drills.findIndex(
      (iso) => iso.layer === drill.layer
    );
    const state = (this.$store as Store<IProject>).state;
    const tool = drill!.toolType;
    if (this.$store && this.$store.state) {
      
        this.$store.commit("updateField", {
          path: `config.drills[${index}].doutline`,
          value: tool!.size as number,
        });
      this.redrawpcb(drill);
    }
  }

  toolChange(drill: IProjectDrill) {
    const index = (this.$store.state as IProject).config.drills.findIndex(
      (iso) => iso.layer === drill.layer
    );
    const state = (this.$store as Store<IProject>).state;
    if (
      state &&
      state.config &&
      state.config.pcb &&
      state.config.pcb.blankType
    ) {
      this.$store.commit("updateField", {
        path: `config.drills[${index}].dthickness`,
        value: state!.config!.pcb!.blankType.bthickness as number,
      });
      this.changeThickness(drill);
    } else {
      console.error("Error instate object", state);
    }
  }

  redrawpcb(drill: IProjectDrill) {
    this.options[drill.layer].busy = true;
    this.options[drill.layer].renderTime = 0;
    this.$forceUpdate();
    const startTime = Date.now();

    const _layer = JSON.parse(
      JSON.stringify(
        (this.$store.state.layers as PcbLayer[]).filter(
          (layer) => layer.name === drill.layer
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
          unionDraw: false,
          filetype: "drill",
        });
        await gerberParser.load((_layer as PcbLayer).gerber);
        gerberParser.commit().then(async (data) => {
          const index = (this.$store
            .state as IProject).config.drills.findIndex(
            (iso) => iso.layer === drill.layer
          );
          this.$store.commit("updateField", {
            path: `config.drills.${index}.geojson`,
            value: data.geojson,
          });

          if (drill.doutline) {
            const isolationWork = await spawn<IsolationWork>(
              new Worker("../../workers/isolationWork")
            );
            const data2 = await isolationWork.create(
              {
                name: drill.layer,
                unit: "mm",
                drillPark: {
                  x: 0,
                  y: 0,
                },
                feedrate: 50,
                safeHtravel: 10,
                doutline: -drill.doutline,
                dthickness: drill.dthickness,
              },
              data.geojson as FeatureCollection
            );
            this.$store.commit("updateField", {
              path: `config.drills.${index}.geojson`,
              value: data2.geojson,
            });
            this.$store.commit("updateField", {
              path: `config.drills.${index}.gcode`,
              value: data2.gcode,
            });
            Thread.terminate(isolationWork);
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
  stroke-width: var(--drill-width);
  stroke-linecap: round;
}
*/

.hljs {
  max-height: 40em;
}
</style>