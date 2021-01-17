<template>
  <el-container direction="vertical">
    <h1 v-if="isolations.length == 0">No isolation layer to process</h1>
    <el-row
      v-for="isolation in isolations"
      :key="isolation.layer"
      type="flex"
      align="middle"
      v-loading="!options[isolation.layer] || options[isolation.layer].busy"
      :element-loading-text="$t('base.processing')"
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
          <el-tab-pane :label="$t('pages.wizard.model')">
            <geo-json-viewer
              :panzoom="true"
              _class="fullframe"
              :data.sync="isolation.geojson"
            ></geo-json-viewer>
          </el-tab-pane>
          <el-tab-pane
            :label="$t('pages.wizard.work-3d')"
            :disabled="!isolation.gcode"
            lazy
          >
            <g-code
              :data="isolation.gcode"
              :gcgrid="true"
              :width="width"
              :height="height"
            ></g-code>
          </el-tab-pane>
          <el-tab-pane
            :label="$t('pages.wizard.gcode')"
            :disabled="!isolation.gcode"
          >
            <highlightjs
              language="gcode"
              :code="isolation.gcode || $t('base.loading')"
            />
          </el-tab-pane>
        </el-tabs>
      </el-col>
      <el-col :span="8">
        <h1></h1>
        <el-form :model="isolation" ref="formx" label-width="11em">
          <el-form-item
            :label="$t('pages.wizard.isolation.union-elements')"
            :rules="[
              {
                required: true,
                trigger: 'change',
                type: 'enum',
                enum: [true],
                message: $t(
                  'pages.wizard.isolation.debug-option-please-enable'
                ),
              },
            ]"
          >
            <el-switch
              v-model="isolation.unionDraw"
              @input="redrawpcb(isolation)"
            ></el-switch>
          </el-form-item>
          <el-form-item
            :label="$t('pages.wizard.isolation.isolation-tool')"
            :rules="[{ required: true, trigger: 'change' }]"
            prop="toolType"
          >
            <el-select
              v-model="isolation.toolType"
              value-key="name"
              :placeholder="$t('pages.wizard.isolation.tool')"
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
            :label="$t('pages.wizard.isolation.isolation-thickness')"
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
            :label="$t('pages.wizard.isolation.isolation-width')"
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
import store from "../store/store";
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
import { PcbLayer } from "@/models/pcblayer";
import { GerberSide, GerberType } from "whats-that-gerber";
import { releaseProxy } from "comlink";
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
} from "@/parsers/gerberParser.worker";
//import { IsolationWork } from "@/workers/isolationWork";
import { IsolationJob } from "@/workers/isolationJob.worker";
import { spawn, Thread, Worker, Transfer } from "threads";
import { FeatureCollection } from "geojson";
import { WorkerUtils } from "@/utils/workerUtils";
import Observable from "zen-observable";
import { error } from "three";
import { GlobalVarGlobalApplication } from "@/models/globalVarGlobal";
//import { VueExtended } from "../vueextended";

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
  options: Record<string, Options> = {};

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
      value: (this.$store.state.layers as PcbLayer[])
        .filter((layer) => {
          return layer.type === whatsThatGerber.TYPE_COPPER && layer.enabled;
        })
        .map((layer, index) => {
          const ret: IProjectIsolation = {
            layer: layer.name,
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

  async redrawpcb(isolation: IProjectIsolation) {
    this.options[isolation.layer].busy = true;
    this.options[isolation.layer].renderTime = 0;
    this.$forceUpdate();
    const startTime = Date.now();

/*
    const _layer = JSON.parse(
      JSON.stringify(
        (this.$store.state.layers as PcbLayer[]).filter(
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
    ) as PcbLayer;
*/
    const _layer = (this.$store.state.layers as PcbLayer[]).filter(
          (layer) => layer.name === isolation.layer
        )[0];

    console.log(_layer);

    let index = (this.$store.state as IProject).config.isolations.findIndex(
      (iso) => iso.layer === isolation.layer
    );
    if (index == -1) {
      index = (this.$store.state as IProject).config.isolations.length;
      this.$store.commit("updateField", {
        path: `config.isolations.${index}`,
        value: {},
      });
    }
    let layerIndex = (this.$store.state as IProject).layers?.findIndex(
      (layer) => layer.name === isolation.layer
    );
    console.log(index, layerIndex);

    const gerberParser = await new GerberParser({
      unionDraw: isolation.unionDraw,
    });
    const isolationJob = await new IsolationJob({
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
    });

    /* Progress!!
        this.$application.progress.perc = 0;
        const timeout = async ()=>{
//          try {
            console.log("--X-->");
            this.$application.progress.perc = await gerberParser._perc;
            console.log("--O--->",this.$application.progress.perc);
            if( this.$application.progress.perc && this.$application.progress.perc < 100 ){
              console.log("----->",this.$application.progress.perc);
//              if( this.$application.progress.perc > 16){
//                gerberParser.stop();
//                  console.log("Try to kill!");
//                  (gerberParser as unknown as any)[releaseProxy]();
//              }
              setTimeout(timeout,5);
            }
//          } catch (error) {
//            console.log(error);
//          }
        }
        let progressT = setTimeout(timeout,5);
*/

    //    const gerberParserWorker = new Worker("../../workers/gerberParser");
    //    spawn<GerberParser>(gerberParserWorker).then(
    //      async (gerberParser) => {

    //        this.$application.workers.push(gerberParserWorker);
    //        ((this as any).$application as GlobalVarGlobalApplication).workers.push(gerberParserWorker);

    //      try {
    // let jsondata = "";
    try {
      if (!_layer.geoJson) {
        const data = await gerberParser.commit(_layer.gerber);
        if (data.geojson) {
          console.log("Generating GeoJson", layerIndex);
          this.$store.commit("updateField", {
            path: `layers.${layerIndex}.geoJson`,
            value: data.geojson,
          });
        }
      }

      console.log(_layer.geoJson);

      this.$store.commit("updateField", {
        path: `config.isolations.${index}.geojson`,
        value: _layer.geoJson,
      });

      if (isolation.doutline && _layer.geoJson) {
        console.log("Begin isolation work...");
        const data2 = await isolationJob.isolate(_layer.geoJson);
        console.log("Tornato da isolation!");
        this.$store.commit("updateField", {
          path: `config.isolations.${index}.geojson`,
          value: data2.geojson,
        });
        this.$store.commit("updateField", {
          path: `config.isolations.${index}.gcode`,
          value: data2.gcode,
        });
      }
    } finally {
      this.options[_layer.name].renderTime = Date.now() - startTime;
      this.options[_layer.name].busy = false;
      this.$forceUpdate();
    }

    /*
          ,
          (error) => console.error(error),
          async () => {

          //  Thread.terminate(gerberParser);

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
                (this.$store.state as IProject).config.isolations[index]
                  .geojson as FeatureCollection
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
          }
          */
    //  );
    //      }
    //    );
  }
}
</script>

<style>
.fullframe svg {
  height: 100%;
  width: 100%;
}

.hljs {
  max-height: 40em;
}
</style>