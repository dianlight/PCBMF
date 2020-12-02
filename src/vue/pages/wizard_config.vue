<template>
  <el-container direction="vertical">
    <el-row>
      <el-col :span="10">
        <el-card>
          <div slot="header" class="clearfix">
            Top Layer:
            <el-switch
              active-text="Include"
              inactive-text="Ignore"
              v-model="useTop"
            ></el-switch>
          </div>
          <div class="boardview" v-html="topsvg"></div>
        </el-card>
        <el-card>
          <div slot="header" class="clearfix">
            Bottom Layer:
            <el-switch
              active-text="Include"
              inactive-text="Ignore"
              v-model="useBottom"
            ></el-switch>
          </div>
          <div class="boardview" v-html="bottomsvg"></div>
        </el-card>
      </el-col>
      <el-col :span="14">
        <el-card>
          <el-form ref="form" label-width="120px">
            <el-form-item label="PCB blank type">
              <el-select
                v-model="blankType"
                placeholder="Select"
                size="mini"
              >
                <el-option
                  v-for="item in pbc_blank_types"
                  :key="item"
                  :label="item"
                  :value="item"
                >
                </el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="Use PCB Outline">
              <el-switch v-model="useOutline" @input="redrawpcb"></el-switch>
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
              row-key="filename"
              @select="changeSelection"
              @select-all="changeSelection"
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
        </el-card>
      </el-col>
    </el-row>
  </el-container>
</template>

<script lang="ts">
import Vue from "vue";
import store from "../store";
import pcbStackup from "pcb-stackup";
import whatsThatGerber from "whats-that-gerber";
import { mapGetters, mapState } from "vuex";
import { mapFields } from "vuex-map-fields";
import { ElTable } from "element-ui/types/table";

let svg_top: string, svg_bottom: string;

export default Vue.extend({
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
  },
  methods: {
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
      console.log("Redraw PCB:", this.$store.state.layers, layers);
      pcbStackup(layers, {
        useOutline: this.$store.state.config.useOutline,
        attributes: {
          width: "100%",
        },
      })
        .then((stackup) => {
          this.$data.svg.top = stackup.top.svg;
          this.$data.svg.bottom = stackup.bottom.svg;
          stackup.layers.forEach((layer) => store.commit("updateLayer", layer));
        })
        .catch((err) => console.error(err));
    },
    changeSelection(selection: any[], row: any) {
      row.enabled = selection.includes(row);
      store.commit("updateLayer", row);
      (this as any).redrawpcb();
      /*
      console.log(this.$data.tableData);
      (this.$data.tableData as any[]).forEach( (elem)=>{
        elem.import = selection.findIndex( (srow)=> srow.filename === elem.filename) != -1;
      });
      */
      //store.commit('updateField',{path:'layers',value:this.$data.tableData});
      /*
      console.log("Change selection:",selection,row);
      (this.$store.state.layers as any[]).forEach( (elem)=>{
        elem.import = selection.findIndex( (srow)=> srow.filename === elem.filename) != -1;
        console.log("File:",elem.filename,elem.import);
      });
      */
    },
  },
  data() {
    return {
      useBottom: true,
      useTop: true,
      svg: {
        top: undefined,
        bottom: undefined,
      },
      types: [
        whatsThatGerber.TYPE_SOLDERMASK,
        whatsThatGerber.TYPE_SILKSCREEN,
        whatsThatGerber.TYPE_SOLDERPASTE,
        whatsThatGerber.TYPE_DRILL,
        whatsThatGerber.TYPE_OUTLINE,
        whatsThatGerber.TYPE_DRAWING,
        whatsThatGerber.TYPE_COPPER,
      ],
      sides: [
        whatsThatGerber.SIDE_TOP,
        whatsThatGerber.SIDE_BOTTOM,
        whatsThatGerber.SIDE_INNER,
        whatsThatGerber.SIDE_ALL,
      ],
    };
  },
  computed: {
    ...mapFields(["config.useOutline","config.pcb.blankType", "layers"]),
    bottomsvg() {
      return this.$data.svg.bottom;
    },
    topsvg() {
      return this.$data.svg.top;
    },
  },
});
</script>

<style>
.file-list {
  width: unset;
  border: 0px;
  table-layout: unset;
  border-collapse: collapse;
}

.file-listrow {
  border: 0px;
}

.file-listcell,
table {
  border: 0px;
}

.el-table__header {
  border-collapse: collapse !important;
}
/*
table.el-table__body {
  table-layout: unset;
  border-collapse: unset;

}*/
</style>