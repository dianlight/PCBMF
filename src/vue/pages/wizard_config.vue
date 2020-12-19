<template>
  <el-container direction="vertical">
    <el-row>
      <el-col :span="10">
        <el-form>
          <div class="clearfix">
            <el-form-item label="Top Layer">
              <el-switch
                active-text="Include"
                inactive-text="Ignore"
                v-model="useTop"
              ></el-switch>
            </el-form-item>
          </div>
          <svg-viewer
            _class="boardview"
            id="topview"
            :data="topsvg"
          ></svg-viewer>
          <!--<div class="boardview" v-html="topsvg"></div>-->
          <div class="clearfix">
            <el-form-item label="Bottom Layer">
              <el-switch
                active-text="Include"
                inactive-text="Ignore"
                v-model="useBottom"
              ></el-switch>
            </el-form-item>
          </div>
          <!--div class="boardview" v-html="bottomsvg"></div-->
          <svg-viewer _class="boardview" :data="bottomsvg"></svg-viewer>
        </el-form>
      </el-col>
      <el-col :span="14">
        <el-form :model="pcb" v-model="pcb" ref="form" label-width="120px">
          <el-form-item
            label="PCB blank type"
            prop="blankType"
            :rules="[
              {
                required: true,
                message: 'Please select a valid PCB type',
              },
            ]"
          >
            <el-select
              v-model="blankType"
              value-key="name"
              placeholder="Select"
              size="mini"
            >
              <el-option
                v-for="item in pcbTypes"
                :key="item.name"
                :label="item.name"
                :value="item"
              >
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item
            style="float: right"
            label="(h)"
            :rules="[
              {
                required: true,
                type: 'number',
                min: 1,
                max: 1000,
                trigger: 'blur',
              },
            ]"
            prop="height"
          >
            <el-input-number size="mini" v-model="height"></el-input-number>
          </el-form-item>
          <el-form-item
            label="PCB Size (w)"
            :rules="[
              {
                required: true,
                type: 'number',
                min: 1,
                max: 1000,
                trigger: 'blur',
              },
            ]"
            prop="width"
          >
            <el-input-number size="mini" v-model="width"></el-input-number>
          </el-form-item>
          <el-form-item label="Use PCB Outline">
            <el-switch
              size="mini"
              v-model="useOutline"
              @input="redrawpcb"
            ></el-switch>
          </el-form-item>
          <!-- Gerber File List-->
          <el-table
            :data="layers"
            stripe
            border
            size="mini"
            fit
            highlight-current-row
            class="file-list"
            row-class-name="file-listrow"
            header-row-class-name="file-listrow"
            cell-class-name="file-listcell"
            row-key="id"
            @select="changeSelection"
            @select-all="changeSelectionAll"
            ref="table"
          >
            <el-table-column label="" type="selection"> </el-table-column>
            <el-table-column label="Filename" prop="filename">
            </el-table-column>
            <el-table-column label="Type">
              <template slot-scope="scope">
                <el-select
                  @change="redrawpcb"
                  v-model="scope.row.type"
                  placeholder="Select"
                  size="mini"
                >
                  <el-option
                    v-for="item in types"
                    :key="item"
                    :label="item"
                    :value="item"
                  >
                  </el-option>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="Side">
              <template slot-scope="scope">
                <el-select
                  @change="redrawpcb"
                  v-model="scope.row.side"
                  placeholder="Select"
                  size="mini"
                >
                  <el-option
                    v-for="item in sides"
                    :key="item"
                    :label="item"
                    :value="item"
                  >
                  </el-option>
                </el-select>
              </template>
            </el-table-column>
          </el-table>
        </el-form>
      </el-col>
    </el-row>
  </el-container>
</template>

<script lang="ts">
import Vue from "vue";
import store from "../store";
import pcbStackup from "pcb-stackup";
import whatsThatGerber from "whats-that-gerber";
import { mapGetters, mapMutations, mapState } from "vuex";
import { mapFields, mapMultiRowFields } from "vuex-map-fields";
import { ElTable } from "element-ui/types/table";
import FSStore from "@/fsstore";
import Component from "vue-class-component";
import { Inject, VModel } from "vue-property-decorator";
import SvgViewer from "@/vue/components/svgviewer.vue";
import { PcbLayers } from "@/models/pcblayer";
import { IProject } from "@/models/project";

let svg_top: string, svg_bottom: string;

@Component({
  components: {
    SvgViewer,
  },
  computed: {
    ...mapFields([
      "config.useOutline",
      "layers",
      "config.pcb",
      "config.pcb.blankType",
      "config.pcb.width",
      "config.pcb.height",
    ]),
    //    ...mapMultiRowFields(['layers'])
  },
})
export default class WizardConfig extends Vue {
  topsvg: string | null = null;
  bottomsvg: string | null = null;
  useBottom: boolean = true;
  useTop: boolean = true;

  pcbTypes: any[] = [];

  rules = {
    blankType: [
      {
        required: true,
        message: "Please choose a valid blank pcb type",
        trigger: "change",
      },
    ],
    width: [
      {
        type: "float",
        required: true,
        message: "Please input valid witdh",
        trigger: "blur",
      },
      {
        min: 1,
        max: 1000,
        message: "Length should be 3 to 5",
        trigger: "blur",
      },
    ],
    height: [
      {
        type: "float",
        required: true,
        message: "Please input valid height",
        trigger: "blur",
      },
      {
        min: 1,
        max: 1000,
        message: "Length should be 3 to 5",
        trigger: "blur",
      },
    ],
  };

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

  @Inject() readonly setOutTabStatus:
    | ((state: "wait" | "process" | "finish" | "error" | "success") => void)
    | undefined;
  @Inject() readonly registerNextCallback:
    | ((callback: () => boolean | PromiseLike<boolean>) => void)
    | undefined;
  @Inject() readonly enableButtons:
    | ((prev: boolean, skip: boolean, next: boolean) => void)
    | undefined;

  mounted() {
    this.enableButtons!(true, false, true);
    this.registerNextCallback!(() => {
      return new Promise((resolve, reject) => {
        (this.$refs.form as any).validate((valid: boolean): void => {
          if (valid) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    });
    new Promise((resolve) => {
      FSStore.get("data.pcb.types", []).then((data) => {
        //      console.log("---->", data);
        this.pcbTypes = data;
      });
    });
    //    if((this.$store.state as IProject).config.pcb.blankType)
  }

  created() {
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
  }

  redrawpcb() {
    const layers = JSON.parse(
      JSON.stringify(
        (this.$store.state.layers as any[]).filter((layer) => layer.enabled)
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

    //console.log("Redraw PCB:", this.$store.state.layers, layers);
    pcbStackup(layers, {
      useOutline: this.$store.state.config.useOutline,
      attributes: {
        width: "100%",
      },
    })
      .then((stackup) => {
        this.topsvg = stackup.top.svg;
        this.bottomsvg = stackup.bottom.svg;
        store.commit("updateField", {
          path: "config.pcb.height",
          value: stackup.top.height,
        });
        store.commit("updateField", {
          path: "config.pcb.width",
          value: stackup.top.width,
        });
        stackup.layers.forEach((layer) => store.commit("updateLayer", layer));
      })
      .catch((err) => console.error(err));
  }

  changeSelectionAll(selection: PcbLayers[]) {
    //    console.log(selection.length, selection.map( (layer)=> layer.id));
    (this.$store.state.layers as PcbLayers[]).forEach((layer, index) => {
      //    console.log(selection && selection.includes(layer),index,JSON.stringify(layer),JSON.stringify(selection));
      store.commit("updateField", {
        path: "layers[" + index + "].enabled",
        value:
          selection &&
          selection.findIndex((clayer) => clayer.id === layer.id) >= 0,
      });
      //      layer.enabled = selection && selection.includes(layer);
    });
    (this as any).redrawpcb();
  }

  changeSelection(selection: PcbLayers[], row: PcbLayers) {
    // row.enabled = selection && selection.includes(row);
    //    console.log((this.$store.state.layers as PcbLayers[]).length, selection.length, selection.map( (layer)=> layer.id));

    //    console.log(row.enabled,selection && selection.findIndex( (layer) => layer.id === row.id) >= 0, selection[0].id );

    store.commit("updateField", {
      path:
        "layers[" +
        (this.$store.state.layers as PcbLayers[]).findIndex(
          (layer) => layer.id === row.id
        ) +
        "].enabled",
      value:
        selection && selection.findIndex((layer) => layer.id === row.id) >= 0,
    });
    (this as any).redrawpcb();
  }
}
</script>

<style scoped>
</style>