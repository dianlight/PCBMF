<template>
  <el-container direction="vertical">
    <h1 v-if="outlines.length == 0">{{$t('pages.wizard.outline.no-outline-layer-to-process')}}</h1>
    <el-row
      v-for="(outline) in outlines"
      :key="outline.layer"
      type="flex"
      align="middle"
      v-loading="!options[outline.layer] || options[outline.layer].busy"
      :element-loading-text="$t('base.processing')"
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.8)"
    >
      <el-col :span="16">
        <h4>
          {{ outline.layer }}
          <small
            >Render Time:
            {{
              options[outline.layer]
                ? options[outline.layer].renderTime
                : "-"
            }}ms</small
          >
        </h4>

        <el-tabs type="border-card">
          <el-tab-pane :label="$t('pages.wizard.model')">
            <geo-json-viewer
              :panzoom="true"
              _class="fullframe"
              :data.sync="outline.geojson"
            ></geo-json-viewer>
            <!--
            <svg-viewer
              :panzoom="true"
              _class="fullframe"
              :data="outline.svg"
              :style="{ '--outline-width': outline.doutline * 2 + 'mm' }"
            ></svg-viewer>
            -->
          </el-tab-pane>
          <el-tab-pane :label="$t('pages.wizard.work-3d')" :disabled="!outline.gcode" lazy>
            <g-code
              :data="outline.gcode"
              :gcgrid="true"
              :width="width"
              :height="height"
            ></g-code>
          </el-tab-pane>
          <el-tab-pane :label="$t('pages.wizard.gcode')" :disabled="!outline.gcode">
            <highlightjs
              language="gcode"
              :code="outline.gcode || $t('base.loading')"
            />
          </el-tab-pane>
        </el-tabs>
      </el-col>
      <el-col :span="8">
        <h1></h1>
        <el-form :model="outline" ref="formx" label-width="11em">
          <!--
          <el-form-item label="Square Border">
            <el-switch
              v-model="outline.showOutline"
              @input="redrawpcb(outline)"
            ></el-switch>
          </el-form-item>
          -->
          <el-alert v-if="foundGeometries > 1" type="warning" :closable="false">Multiple Geometry ({{foundGeometries}}) on outline.<br/>Some modes are not available and the result can be wrong!</el-alert>
          <el-form-item :label="$t('pages.wizard.outline.outline-mode')" :rules="[{ required: true, trigger:'change' }]" 
          prop="mode">
            <el-select
              v-model="outline.mode"
              value-key="name"
              :placeholder="$t('pages.wizard.outline.mode')"
              @change="redrawpcb(outline)"
              size="mini"
              clearable
            >
              <el-option :label="$t('pages.wizard.outline.buffer')" value="Buffer" :disabled="foundGeometries > 1"/>
              <el-option :label="$t('pages.wizard.outline.mergedbuffer')" value="MergedBuffer" :disabled="foundGeometries == 1"/>
              <el-option :label="$t('pages.wizard.outline.scale')" value="Scale"/>
              <el-option :label="$t('base.convexhull')" value="ConvexHull"/>
              <el-option :label="$t('pages.wizard.outline.hull')" value="Hull"/>
              <el-option :label="$t('pages.wizard.outline.box')" value="Box"/>
            </el-select>
          </el-form-item>   
          <el-form-item
            :label="$t('pages.wizard.outline.scale')"
            :rules="[{ required: true,trigger:'blur', type: 'number', min: 1, max: 5 }]"
            prop="scale"
          >
            <el-input-number
              size="mini"
              v-model="outline.scale"
              :min="1"
              :max="5"
              :precision="2"
              :step="0.01"
              :disabled="outline.mode !== 'Scale'"
              @change="redrawpcb(outline)"
            ></el-input-number>       
          </el-form-item>            
          <el-form-item :label="$t('pages.wizard.outline.outline-tool')" :rules="[{ required: true, trigger:'change' }]" 
          prop="toolType">
            <el-select
              v-model="outline.toolType"
              value-key="name"
              :placeholder="$t('pages.wizard.outline.tool')"
              @change="toolChange(outline)"
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
            :label="$t('pages.wizard.outline.outline-thickness')"
            :rules="[{ required: true, trigger:'blur', type: 'number', min: 0.0001 }]"
            prop="dthickness"
          >
            <el-input-number
              size="mini"
              v-model="outline.dthickness"
              :min="0"
              :max="50"
              :precision="4"
              :step="0.1"
              :disabled="!outline.toolType"
              @change="changeThickness(outline)"
            ></el-input-number>
          </el-form-item>
          <el-form-item
            :label="$t('pages.wizard.outline.outline-width')"
            :rules="[{ required: true,trigger:'blur', type: 'number', min: 0.0001 }]"
            prop="doutline"
          >
            <el-input-number
              size="mini"
              v-model="outline.doutline"
              :min="0.0001"
              :max="5"
              :precision="4"
              :step="0.001"
              :disabled="true"
              @change="redrawpcb(outline)"
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
//import pcbStackup from "pcb-stackup";
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
import { PcbLayer } from "@/models/pcblayer";
//import { GerberSide, GerberType } from "whats-that-gerber";
//import makerjs from "makerjs";
//import { Duplex } from "stream";
//import gerberParser from "gerber-parser";
//import gerberPlotter from "gerber-plotter";
import colornames from "colornames";
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
//import { IWorkerData, IWorkerDataType } from "@/models/workerData";
//import PlotterWorker from "_/workers/plotterDataToModel.worker";
import { IProject, IProjectOutline } from "@/models/project";
import { Store } from "vuex";
import { Tooldb } from "@/typings/tooldb";
//import { IPlotterOptions } from "@/workers/plotterDataToModel.worker";
import { Form } from "element-ui";
import { GerberParser } from "@/workers/gerberParser";
import { spawn, Thread, Worker, Transfer } from "threads";
import { OutlineWork,OutlineWorkMode } from "@/workers/outlineWork";
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
    ...mapMultiRowFields(["config.outlines"]),
  },
})
export default class Wizardoutline extends Vue {
  toolTypes: Tooldb[] = [];
  options: Record<string,Options> = {};
  foundGeometries: number = 0;

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
      path: "config.outlines",
      value: (this.$store.state.layers as PcbLayer[])
        .filter((layer) => {
          return layer.type === whatsThatGerber.TYPE_OUTLINE && layer.enabled;
        })
        .map((layer, index) => {
          const ret: IProjectOutline = {
            layer: layer.name,
            showOutline: false,
//            useFill: false,
//            useFillPitch: 0.005,
            toolType: undefined,
            dthickness: undefined,
            doutline: undefined,
            svg: undefined,
            gcode: undefined,
            geojson: undefined,
            mode: undefined,
            scale: 1.01,
          };
          const oldrecord = (this.$store
            .state as IProject).config.outlines.find(
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
        this.toolTypes = data.filter((tool:Tooldb)=>tool.type === 'Mill');;
      });
    });

    if ((this.$store.state as IProject).config.outlines.length == 0) {
      console.log("No outline need to skip");
      this.wizardPushSkip!();
    }
  }

  changeThickness(outline: IProjectOutline) {
    const index = (this.$store.state as IProject).config.outlines.findIndex(
      (iso) => iso.layer === outline.layer
    );
    const state = (this.$store as Store<IProject>).state;
    const tool = outline!.toolType;
    if (this.$store && this.$store.state) {
      
        this.$store.commit("updateField", {
          path: `config.outlines[${index}].doutline`,
          value: tool!.size as number,
        });
      this.redrawpcb(outline);
    }
  }

  toolChange(outline: IProjectOutline) {
    const index = (this.$store.state as IProject).config.outlines.findIndex(
      (iso) => iso.layer === outline.layer
    );
    const state = (this.$store as Store<IProject>).state;
    if (
      state &&
      state.config &&
      state.config.pcb &&
      state.config.pcb.blankType
    ) {
      this.$store.commit("updateField", {
        path: `config.outlines[${index}].dthickness`,
        value: state!.config!.pcb!.blankType.bthickness as number,
      });
      this.changeThickness(outline);
    } else {
      console.error("Error instate object", state);
    }
  }

  redrawpcb(outline: IProjectOutline) {
    this.options[outline.layer].busy = true;
    this.options[outline.layer].renderTime = 0;
    this.$forceUpdate();
    const startTime = Date.now();

    const _layer = JSON.parse(
      JSON.stringify(
        (this.$store.state.layers as PcbLayer[]).filter(
          (layer) => layer.name === outline.layer
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
          filetype: "gerber",
        });
        await gerberParser.load((_layer as PcbLayer).gerber);
        gerberParser.commit().then(async (data) => {
          const index = (this.$store
            .state as IProject).config.outlines.findIndex(
            (iso) => iso.layer === outline.layer
          );
          this.$store.commit("updateField", {
            path: `config.outlines.${index}.geojson`,
            value: data.geojson,
          });
          this.foundGeometries = (data.geojson as FeatureCollection).features.length;

          console.log("----------------------");
          if (outline.doutline && outline.mode) {
            const isolationWork = await spawn<OutlineWork>(
              new Worker("../../workers/outlineWork")
            );
            const data2 = await isolationWork.create(
              {
                name: outline.layer,
                unit: "mm",
                drillPark: {
                  x: 0,
                  y: 0,
                },
                feedrate: 50,
                safeHtravel: 10,
                doutline: outline.doutline,
                dthickness: outline.dthickness || 1,
                mode: outline.mode, 
                scale: outline.scale,
              },
              data.geojson as FeatureCollection
            );
            this.$store.commit("updateField", {
              path: `config.outlines.${index}.geojson`,
              value: data2.geojson,
            });
            this.$store.commit("updateField", {
              path: `config.outlines.${index}.gcode`,
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
  stroke-width: var(--outline-width);
  stroke-linecap: round;
}
*/

.hljs {
  max-height: 40em;
}
</style>