<template>
  <el-container direction="vertical">
    <el-row>
      <el-col :span="10">
        <el-form>
          <div class="clearfix">
            <el-form-item :label="$t('pages.wizard.config.top-layer')">
              <!--
              <el-switch
                active-text="Include"
                inactive-text="Ignore"
                v-model="useTop"
              ></el-switch>
              -->
            </el-form-item>
          </div>
          <svg-viewer
            _class="boardview"
            id="topview"
            :data="topsvg"
          ></svg-viewer>

          <div class="clearfix">
            <el-form-item :label="$t('pages.wizard.config.bottom-layer')">
              <!--
              <el-switch
                active-text="Include"
                inactive-text="Ignore"
                v-model="useBottom"
              ></el-switch>
              -->
            </el-form-item>
          </div>

          <svg-viewer _class="boardview" :data="bottomsvg"></svg-viewer>
        </el-form>
      </el-col>
      <el-col :span="14">
      <ncform
        refs
        :form-schema="projectConfigSchema"
        form-name="projectConfig"
        _v-model="projectConfigSchema.value"
        v-model="config"
        _:is-dirty.sync="isFormDirty"
        _submit="submit()"
        @change="redrawpcb()"
      >
      </ncform>  
        <el-form ref="form" label-width="120px">
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
            <el-table-column label="" type="selection" width="39"></el-table-column>
            <el-table-column :label="$t('pages.wizard.config.filename')" prop="filename"></el-table-column>
            <el-table-column :label="$t('pages.wizard.config.type')" width="140">
              <template slot-scope="scope">
                <el-select
                  @change="redrawpcb"
                  v-model="scope.row.type"
                  :placeholder="$t('base.select')"
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
            <el-table-column :label="$t('base.side')" width="120">
              <template slot-scope="scope">
                <el-select
                  @change="redrawpcb"
                  v-model="scope.row.side"
                  :placeholder="$t('base.select')"
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
            <el-table-column label="" width="55">
              <template #header>
                <el-button
                  @click="load"
                  type="success"
                  size="small"
                  icon="el-icon-document-add"
                  circle
                ></el-button>
              </template>
              <template slot-scope="scope">
              <el-button
                  @click="remove(scope.$index, scope.row)"
                  type="danger"
                  size="small"
                  circle
                  icon="el-icon-document-remove"   
          ></el-button>
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
import store from "../store/store";
import pcbStackup from "pcb-stackup";
import whatsThatGerber from "whats-that-gerber";
import { mapGetters, mapMutations, mapState } from "vuex";
import { mapFields, mapMultiRowFields } from "vuex-map-fields";
import { ElTable } from "element-ui/types/table";
import FSStore from "@/fsstore";
import Component from "vue-class-component";
import { Inject, VModel } from "vue-property-decorator";
import SvgViewer from "@/vue/components/svgviewer.vue";
import { PcbLayer } from "@/models/pcblayer";
import { IProject } from "@/models/project";
import { config } from "vue/types/umd";
import { remote } from "electron";
import { Pcbdb } from "@/typings/pcbdb";

let svg_top: string, svg_bottom: string;

@Component({
  components: {
    SvgViewer,
  },
  computed: {
    ...mapFields([
      "project.config",
      "project.config.useOutline",
      "project.layers",
    ]),
  },
})
export default class ProjectConfig extends Vue {

  private projectConfigSchema = require("@/vue/pages/schemas/project_config_schema.json");

  topsvg: string | null = null;
  bottomsvg: string | null = null;
  useBottom: boolean = true;
  useTop: boolean = true;

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

  @Inject() readonly registerNextCallback:
    | ((callback: (type: 'next'|'back'|'skip') => boolean | PromiseLike<boolean>) => void)
    | undefined;
  @Inject() readonly enableButtons:
    | ((prev: boolean, skip: boolean, next: boolean) => void)
    | undefined;

  mounted() {
    console.log("Mounted");
    this.enableButtons!(true, false, true);
    this.registerNextCallback!((type: 'next'|'back'|'skip') => {
      return new Promise((resolve, reject) => {
        (this as any).$ncformValidate('projectConfig').then( (data:any) => {
          if(data.result){
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    });
    new Promise((resolve) => {
      FSStore.get<Pcbdb[]>("data.pcb.types", []).then((data) => {
        this.projectConfigSchema.properties.blankType.ui.widgetConfig.enumSource = data.map((cdata)=>({
          value: cdata.name,
          label: cdata.name

        }));
        console.log(JSON.stringify(data))
      });
    }); 
    (this as any).redrawpcb(); 
    
  //  console.log("------>",this.projectConfigSchema.properties.pcbSize.rules.customRule[0].script);

  }

  created() {
    console.log("Created!");
    if (!this.$store.state.project.layers) this.$router.push("/");
    this.$nextTick(() => {
      (this.$store.state.project.layers as any[]).forEach((elem) => {
        if (elem.enabled)
          (this.$refs.table as ElTable).toggleRowSelection(elem);
      });
    });
  }

  load(){
    store.dispatch('importGerber');
  }

  remove(index:number, row:PcbLayer){
    remote.dialog.showMessageBox(remote.getCurrentWindow(),
    {
      message: `Remove ${row.filename} from project?`,
      buttons: [this.$t('base.ok').toString(),this.$t('base.cancel').toString()]
    }
    ).then( (value)=>{
      if(value.response == 0){
        store.commit("project/removeGerber",row);
      }
    });
//    console.log("Removed ",index,row);
  }

  redrawpcb() {
    (this as any).$ncformValidate('projectConfig').then( (data:any) => {
     // console.log(data)
    });
    const layers = JSON.parse(
      JSON.stringify(
        (this.$store.state.project.layers as any[]).filter((layer) => layer.enabled)
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
      useOutline: this.$store.state.project.config.useOutline,
      attributes: {
        width: "100%",
      },
    })
      .then((stackup) => {
        this.topsvg = stackup.top.svg;
        this.bottomsvg = stackup.bottom.svg;
        store.commit("project/updateField", {
          path: "config.pcbSize.y",
          value: stackup.top.height,
        });
        store.commit("project/updateField", {
          path: "config.pcbSize.y",
          value: stackup.top.width,
        });
        stackup.layers.forEach((layer) => store.commit("project/updateLayer", layer));
      })
      .catch((err) => console.error(err));
  }

  changeSelectionAll(selection: PcbLayer[]):void {
    //    console.log(selection.length, selection.map( (layer)=> layer.id));
    (this.$store.state.project.layers as PcbLayer[]).forEach((layer, index) => {
      //    console.log(selection && selection.includes(layer),index,JSON.stringify(layer),JSON.stringify(selection));
      store.commit("project/updateField", {
        path: "layers[" + index + "].enabled",
        value:
          selection &&
          selection.findIndex((clayer) => clayer.id === layer.id) >= 0,
      });
      //      layer.enabled = selection && selection.includes(layer);
    });
    (this as any).redrawpcb();
  }

  changeSelection(selection: PcbLayer[], row: PcbLayer) {
    // row.enabled = selection && selection.includes(row);
    //    console.log((this.$store.state.layers as PcbLayer[]).length, selection.length, selection.map( (layer)=> layer.id));

    //    console.log(row.enabled,selection && selection.findIndex( (layer) => layer.id === row.id) >= 0, selection[0].id );

    store.commit("project/updateField", {
      path:
        "layers[" +
        (this.$store.state.project.layers as PcbLayer[]).findIndex(
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

.boardview {
  min-height: 17em;

}

</style>