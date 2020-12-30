<template>
  <el-container direction="vertical">
    <h1 v-if="isolations.length == 0">No isolation layer to process</h1>
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
            <geo-json-viewer
              :panzoom="true"
              _class="fullframe"
              :data.sync="isolation.geojson"
              :style="{ '--isolation-width': isolation.doutline * 2 + 'mm' }"
            ></geo-json-viewer>
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
        <el-form :model="isolation" ref="formx" label-width="11em">
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
              v-model="isolation.unionDraw"
              @input="redrawpcb(isolation)"
            ></el-switch>
          </el-form-item>
          <el-form-item
            label="Isolation Tool"
            :rules="[{ required: true, trigger: 'change' }]"
            prop="toolType"
          >
            <el-select
              v-model="isolation.toolType"
              value-key="name"
              placeholder="Tool..."
              @change="toolChange(isolation)"
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
            label="Isolation thickness"
            :rules="[
              { required: true, trigger: 'blur', type: 'number', min: 0.0001 },
            ]"
            prop="dthickness"
          >
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
          <el-form-item
            label="Isolation width"
            :rules="[
              { required: true, trigger: 'blur', type: 'number', min: 0.0001 },
            ]"
            prop="doutline"
          >
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
import { IProject, IProjectIsolation } from "@/models/project";
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
    ...mapMultiRowFields(["config.isolations"]),
  },
})
export default class WizardIsolation extends Vue {
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
      path: "config.isolations",
      value: (this.$store.state.layers as PcbLayers[])
        .filter((layer) => {
          return layer.type === whatsThatGerber.TYPE_COPPER && layer.enabled;
        })
        .map((layer, index) => {
          const ret: IProjectIsolation = {
            layer: layer.name,
            showOutline: false,
            unionDraw: true,
            toolType: undefined,
            dthickness: undefined,
            doutline: undefined,
            svg: undefined,
            gcode: undefined,
            geojson: undefined,
          };
          const oldrecord = (this.$store
            .state as IProject).config.isolations.find(
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
        this.toolTypes = data.filter(
          (tool: Tooldb) => tool.type === "V-Shape" || tool.type === "Mill"
        );
      });
    });

    if ((this.$store.state as IProject).config.isolations.length == 0) {
      console.log("No isolation need to skip");
      this.wizardPushSkip!();
    }
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

    spawn<GerberParser>(new Worker("../../workers/gerberParser")).then(
      async (gerberParser) => {
        await gerberParser.create({
          unionDraw: isolation.unionDraw,
        });
        await gerberParser.load((_layer as PcbLayers).gerber);
        gerberParser.commit().then(async (data) => {
          const index = (this.$store
            .state as IProject).config.isolations.findIndex(
            (iso) => iso.layer === isolation.layer
          );
          this.$store.commit("updateField", {
            path: `config.isolations.${index}.geojson`,
            value: data.geojson,
          });

          if (isolation.doutline) {
            const isolationWork = await spawn<IsolationWork>(
              new Worker("../../workers/isolationWork")
            );
            const data2 = await isolationWork.create(
              {
                name: isolation.layer,
                unit: "mm",
                drillPark: {
                  x: 0,
                  y: 0,
                },
                feedrate: 50,
                safeHtravel: 10,
                doutline: isolation.doutline,
                dthickness: isolation.dthickness,
              },
              data.geojson as FeatureCollection
            );
            this.$store.commit("updateField", {
              path: `config.isolations.${index}.geojson`,
              value: data2.geojson,
            });
            this.$store.commit("updateField", {
              path: `config.isolations.${index}.gcode`,
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
  stroke-width: var(--isolation-width);
  stroke-linecap: round;
}
*/

.hljs {
  max-height: 40em;
}
</style>