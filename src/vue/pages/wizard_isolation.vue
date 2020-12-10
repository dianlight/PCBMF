<template>
  <el-container direction="vertical">
    <el-row v-for="copper in coppers" :key="copper.filename">
      <el-col :span="10">
        {{ copper.filename }} {{copper.side}}
        <el-tabs type="border-card">
          <el-tab-pane label="SVG">
            <svg-viewer :data="svgs[copper.filename]"></svg-viewer>
          </el-tab-pane>
          <el-tab-pane label="GCODE">
            <g-code :gcgrid="true" :width="width" :height="height" ></g-code>
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
            <el-form-item label="PCB Size">
              <el-input-number size="mini" v-model="width"></el-input-number> x 
              <el-input-number size="mini" v-model="height"></el-input-number>
            </el-form-item>
            <el-form-item label="Use PCB Outline">
              <el-switch v-model="useOutline" @input="redrawpcb"></el-switch>
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
import { GerberSide, GerberType } from 'whats-that-gerber'
import spo from "svg-path-outline";

let svg_top: string, svg_bottom: string;

interface IDictionary {
     [index: string]: string;
}

@Component({
  components: {
    GCode, SvgViewer
  },
  computed: {
    ...mapFields(["config.useOutline", "config.pcb.blankType", "layers","config.pcb.width","config.pcb.height"]),
  },  
})
export default class WizardIsolation extends Vue {

  coppers: PcbLayers[] = [];
  svgs: IDictionary = {};

  distance: number = 0.1;
  joints: 0|1|2 = 0; // 0=round, 1=miter, 2=blevel
  bezierAcc: number = 0.5;
  inside: boolean = false;
  outside: boolean = true;
  tagName: 'path'|'poligon'|'polyline' = 'path';
  
  data(){
    return {
    accepts: false,
    drawer: false,
    progress: {
      value: 0,
      visible: false
    },
    viewer: {
      plane: {
        X: 0,
        Y: 0
      },
      extension: 'gcode',
      file: new ArrayBuffer(0),
      position: {
        X: 5,
        Y: 0,
        Z: -5
      },
      rotation: {
        X: -90,
        Y: 0,
        Z: 180
      },
      scale: {
        X: 0.1,
        Y: 0.1,
        Z: 0.1
      },
      theme: {
        background: '#dfe4ed',
        plane: '#ffffff',
        primary: '#4287f',
        secondary: '#0a2f6b'
      }
    }
  }}


  mounted() {
    this.coppers = (this.$store.state.layers as PcbLayers[]).filter(
       (layer) => layer.type === whatsThatGerber.TYPE_COPPER && layer.enabled);
    this.coppers.forEach( (copper)=>this.redrawpcb(copper));   
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
    console.log(this.svgs);
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

  redrawpcb(layer: PcbLayers) {
    const _layer = JSON.parse(
      JSON.stringify(
        layer
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
    console.log("C-Rendering: ",_layer);

    gerberToSvg(_layer.gerber, {
      filetype: 'gerber',
      optimizePaths: true,
      plotAsOutline: false,
      attributes: {
        width: "100%",
      },
    },(error, svg) => {
      //  console.log("Rendering: ",layer.filename);
      //  if( layer.side === whatsThatGerber.SIDE_BOTTOM){
      //    this.svgs[layer.filename] = stackup.bottom.svg;
      //  } else {
      //    this.svgs[layer.filename] = stackup.top.svg;
      //  }
        if(error) console.error(error);
        this.svgs[layer.filename] = svg;
        // Regenerate Outline
        /*
        var outline = spo(this.svgs[layer.filename],this.distance, {
          joints:this.joints, //: 0|1|2 = 0; // 0=round, 1=miter, 2=blevel
          bezierAcc:this.bezierAcc, //: number = 0.5;
          inside:this.inside, //: boolean = false;
          outside:this.outside, //: boolean = true;
          tagName:this.tagName, //: 'pa)
        });
        */

        this.$forceUpdate();
      });
  //  .catch((err) => console.error(err));
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