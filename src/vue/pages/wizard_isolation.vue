<template>
  <el-container direction="vertical">
    <el-row v-for="copper in coppers" :key="copper.filename">
      <el-col :span="10">
        {{ copper.filename }} {{ copper.side }}
        <el-tabs type="border-card">
          <el-tab-pane label="SVG">
            <svg-viewer :data="svgs[copper.filename]"></svg-viewer>
          </el-tab-pane>
          <el-tab-pane label="GCODE">
            <g-code :gcgrid="true" :width="width" :height="height"></g-code>
          </el-tab-pane>
        </el-tabs>
        <!--
        <el-form>
          <div class="clearfix">
            <el-form-item label="Top Layer">
            <el-switch
              active-text="SVG"
              inactive-text="GCODE"
              v-model="useTop"
            ></el-switch>
            </el-form-item>
          </div>
          <div class="boardview" v-html="topsvg"></div>
          <div class="clearfix">
           <el-form-item label="Bottom Layer">
            <el-switch
              active-text="SVG"
              inactive-text="GCODE"
              v-model="useBottom"
            ></el-switch>
           </el-form-item>
          </div>
          <div class="boardview" v-html="bottomsvg"></div>
        </el-form> 
        -->
      </el-col>
      <el-col :span="14">
        <el-form ref="form" label-width="120px">
          <!--
            <el-form-item label="PCB blank type">
              <el-select v-model="blankType" placeholder="Select" size="mini">
                <el-option
                  v-for="item in pcbTypes"
                  :key="item.name"
                  :label="item.name"
                  :value="item"
                >
                </el-option>
              </el-select>
            </el-form-item>
            -->
          <!--
          <el-form-item label="PCB Size">
            <el-input-number size="mini" v-model="width"></el-input-number> x
            <el-input-number size="mini" v-model="height"></el-input-number>
          </el-form-item>
          -->
          <el-form-item label="Show Outline">
            <el-switch
              v-model="options[copper.filename].showOutline"
              @input="redrawpcb(copper)"
            ></el-switch>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </el-container>
</template>
<!--
</template>
<template>
  <el-row type="flex">
    <el-col :span="12">
      <g-code :gcgrid="true" :width="width" :height="height" ></g-code>
    </el-col>
    <el-col :span="12">
      dddd
    </el-col>
  </el-row>
</template>
-->

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
import {
  IPlotterData,
  IPlotterDataCircle,
  IPlotterDataFill,
  IPlotterDataLine,
  IPlotterDataPad,
  IPlotterDataRect,
  IPlotterDataShape,
  IPlotterDataSize,
  IPlotterDataStroke,
  IPlotterDataTypes,
} from "@/models/plotterData";
//import spo from "svg-path-outline";

let svg_top: string, svg_bottom: string;

interface IDictionary<T> {
  [index: string]: T;
}

interface IShapeDictionary {
  [index: number]: makerjs.IModel;
}

@Component({
  components: {
    GCode,
    SvgViewer,
  },
  computed: {
    ...mapFields([
      //      "config.useOutline",
      //      "config.pcb.blankType",
      "layers",
      "config.pcb.width",
      "config.pcb.height",
    ]),
  },
})
export default class WizardIsolation extends Vue {
  coppers: PcbLayers[] = [];
  svgs: IDictionary<String> = {};

  options: IDictionary<{
    showOutline: boolean;
  }> = {};

  /*
  distance: number = 0.1;
  joints: 0 | 1 | 2 = 0; // 0=round, 1=miter, 2=blevel
  bezierAcc: number = 0.5;
  inside: boolean = false;
  outside: boolean = true;
  tagName: "path" | "poligon" | "polyline" = "path";
*/

  /*
  data() {
    return {
      accepts: false,
      drawer: false,
      progress: {
        value: 0,
        visible: false,
      },
      viewer: {
        plane: {
          X: 0,
          Y: 0,
        },
        extension: "gcode",
        file: new ArrayBuffer(0),
        position: {
          X: 5,
          Y: 0,
          Z: -5,
        },
        rotation: {
          X: -90,
          Y: 0,
          Z: 180,
        },
        scale: {
          X: 0.1,
          Y: 0.1,
          Z: 0.1,
        },
        theme: {
          background: "#dfe4ed",
          plane: "#ffffff",
          primary: "#4287f",
          secondary: "#0a2f6b",
        },
      },
    };
  }
  */

  mounted() {
    this.coppers = (this.$store.state.layers as PcbLayers[]).filter(
      (layer) => layer.type === whatsThatGerber.TYPE_COPPER && layer.enabled
    );
    this.coppers.forEach((copper) => {
      this.options[copper.filename] = {
        showOutline: true,
      };
      this.redrawpcb(copper);
    });
  }

  /*
  topsvg: string = null;
  bottomsvg: string = null;
  useBottom: boolean = true;
  useTop: boolean = true;

  pcbTypes: any[] = [];

  types = [
    whatsThatGerber.TYPE_SOLDERMASK,
    whatsThatGerber.TYPE_SILKSCREEN,
    whatsThatGerber.TYPE_SOLDERPASTE,
    whatsThatGerber.TYPE_DRILL,
    whatsThatGerber.TYPE_OUTLINE,
    whatsThatGerber.TYPE_DRAWING,
    whatsThatGerber.TYPE_COPPER,
  ];

  sides = [
    whatsThatGerber.SIDE_TOP,
    whatsThatGerber.SIDE_BOTTOM,
    whatsThatGerber.SIDE_INNER,
    whatsThatGerber.SIDE_ALL,
  ];

  mounted() {
    new Promise((resolve) => {
      FSStore.get("data.pcb.types", []).then((data) => {
        console.log("---->", data);
        this.pcbTypes = data;
      });
    });
  }
  */

  created() {
    // console.log(this.svgs);
    /*
    if (!this.$store.state.layers) this.$router.push("/");
    else {
      //   console.log(this, this.$store.state.layers);
      (this as any).redrawpcb();
    }
    this.$nextTick(() => {
      //     console.log("[[[[[[[[[[[[[[[[[[[[[[[[", this.$store.state.layers);
      (this.$store.state.layers as any[]).forEach((elem) => {
        if (elem.enabled)
          (this.$refs.table as ElTable).toggleRowSelection(elem);
      });
    });
    */
  }

  shapes: IShapeDictionary = {};

  iPlotterToModel(
    pindex: string,
    obj: IPlotterData,
    layer: PcbLayers
  ): makerjs.IModel | void {
    let index = 0;
    switch (obj.type) {
      case IPlotterDataTypes.POLARITY:
        // Unknown?!?!?
        break;
      case IPlotterDataTypes.LINE:
        const line = obj as IPlotterDataLine;
        return { paths: { l: new makerjs.paths.Line(line.start, line.end) } };
        break;
      case IPlotterDataTypes.RECT:
        const rect = obj as IPlotterDataRect;
        if (rect.r > 0) {
          return makerjs.model.move(
            new makerjs.models.RoundRectangle(rect.width, rect.height, rect.r),
            [rect.cx - rect.width / 2, rect.cy - rect.height / 2]
          );
        } else {
          return makerjs.model.move(
            new makerjs.models.Rectangle(rect.width, rect.height),
            [rect.cx - rect.width / 2, rect.cy - rect.height / 2]
          );
        }
        break;
      case IPlotterDataTypes.PAD:
        const pad = obj as IPlotterDataPad;
//        if (!this.shapes[pad.tool])
//          console.log(pad.tool, "--->", this.shapes[pad.tool]);
        return makerjs.model.move(makerjs.model.clone(this.shapes[pad.tool]), [
          pad.x,
          pad.y,
        ]);
        break;
      case IPlotterDataTypes.CIRCLE:
        const circle = obj as IPlotterDataCircle;
        return {
          paths: {
            c: new makerjs.paths.Circle([circle.cx, circle.cy], circle.r),
          },
        };
        break;
      case IPlotterDataTypes.STROKE:
        const stroke = obj as IPlotterDataStroke;
        let submodel: makerjs.IModel = { models: {} };
        stroke.path.forEach((data: IPlotterData) => {
          const lindex = pindex + "_s" + index++;
          const subdata = this.iPlotterToModel(lindex, data, layer);
          if (subdata)
            submodel.models[lindex] = makerjs.model.outline(
              subdata,
              stroke.width / 2
            );
        });
        if (submodel !== {}) return submodel;
        break;
      case IPlotterDataTypes.FILL:
        const fill = obj as IPlotterDataFill;
        let submodel_f: makerjs.IModel = { models: {} };
        fill.path.forEach((data: IPlotterData) => {
          const lindex = pindex + "_f" + index++;
          const subdata = this.iPlotterToModel(lindex, data, layer);
          if (subdata) submodel_f.models[lindex] = subdata;
        });
        if (submodel_f !== {}) return submodel_f;
        break;
      case IPlotterDataTypes.SHAPE:
        // Definisce un Tool!
        const shape = obj as IPlotterDataShape;
        let submodel_s: makerjs.IModel = { models: {} };
        shape.shape.forEach((data: IPlotterData) => {
          const lindex = pindex + "_xs" + index++;
          const subdata = this.iPlotterToModel(lindex, data, layer);
          if (subdata) submodel_s.models[lindex] = subdata;
        });
        if (submodel_s !== {}) this.shapes[shape.tool] = submodel_s;
        break;
      case IPlotterDataTypes.SIZE:
        if (this.options[layer.filename].showOutline) {
          //     console.log(pindex, obj);
          const size = obj as IPlotterDataSize;
          let submodel_sx: makerjs.IModel = makerjs.model.layer(
            makerjs.model.move(
              new makerjs.models.Rectangle(size.box[2], size.box[3]),
              [size.box[0], size.box[1]]
            ),
            "red"
          );
          submodel_sx.units =
            size.units === "mm"
              ? makerjs.unitType.Millimeter
              : makerjs.unitType.Inch;
          console.log(submodel_sx);
          return submodel_sx;
        }
        break;
      default:
        console.log(obj, JSON.stringify(obj));
        break;
    }
  }

  redrawpcb(layer: PcbLayers) {
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
    console.log("C-Rendering: ", _layer);

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
      models: {},
    };

    let index = 0;
    stream
      .pipe(parser)
      .pipe(plotter)
      .on("error", (error) => console.error(error))
      .on("data", (obj: IPlotterData) => {
        // console.log(this.iPlotterToModel(obj));
        const lindex = "m" + index++;
        const submodel = this.iPlotterToModel(lindex, obj, layer);
        if (submodel) model.models[lindex] = submodel;
      })
      .on("end", () => {
        // console.log("->", model);
        this.svgs[layer.filename] = makerjs.exporter.toSVG(model, {
          units: makerjs.unitType.Millimeter,
        });
        this.$forceUpdate();
      });

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
  }
}
</script>

<style scoped>
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