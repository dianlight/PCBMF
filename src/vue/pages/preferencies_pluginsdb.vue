<template>
  <div>
    <el-table
      :data="Object.values(this.plugins)"
      style="width: 100%"
      size="mini"
      stripe
      fit
      :empty-text="$t('pages.preferencies.pluginsdb.no-plugin-defined')"
      row-key="name"
      border
      highlight-current-row
      @select="changeSelection"
      @select-all="changeSelectionAll"
      ref="table"
    >
      <el-table-column type="selection" prop="enabled" width="39" label="" :selectable="selectable"></el-table-column>
      <el-table-column
        prop="name"
        :label="$t('pages.preferencies.pluginsdb.name')"
        width="200"
        show-overflow-tooltip
      ></el-table-column>
      <el-table-column
        width="70"
        prop="version"
        :label="$t('pages.preferencies.pluginsdb.version')"
        show-overflow-tooltip
      >
      </el-table-column>
      <el-table-column
        prop="repository"
        :label="$t('pages.preferencies.pluginsdb.repository.title')"
        show-overflow-tooltip
      >
      </el-table-column>
      <el-table-column
        prop="description"
        :label="$t('pages.preferencies.pluginsdb.description')"
        show-overflow-tooltip
      ></el-table-column>
      <el-table-column fixed="right" :width="50*2">
        <template #header>
          <el-button
            @click="insert"
            type="success"
            size="small"
            icon="el-icon-plus"
            circle
          ></el-button>
          <!--
          <el-button
            @click="insert"
            type="info"
            size="small"
            icon="el-icon-refresh"
            circle
          ></el-button>
          -->
        </template>
        <template slot-scope="scope">
          <el-button
            v-if="scope.row.repository !== 'internal'"
            @click="remove(scope.$index, scope.row)"
            type="danger"
            size="small"
            circle
            icon="el-icon-delete"
          ></el-button>
          <!--
          <el-button
            v-if="scope.row.repository !== 'internal'"
            type="primary"
            size="small"
            @click="edit(scope.$index, scope.row)"
            icon="el-icon-edit"
            circle
          ></el-button>
          -->
        </template>
      </el-table-column>
    </el-table>
    <el-dialog
      :title="$t('pages.preferencies.pluginsdb.repository.title').toString()"
      :visible.sync="newDialogVisible"
      width="50%"
      append-to-body
      center
    >
      <span style="word-break: break-word;">{{
        $t("pages.preferencies.pluginsdb.information-about-your-plugin")
      }}</span>
      <ncform
        :form-schema="pluginSchema"
        form-name="toolTypeForm"
        v-model="pluginSchema.value"
        @submit="submit()"
      ></ncform>
      <span slot="footer" class="dialog-footer">
        <el-button @click="newDialogVisible = false" size="small" round>{{
          $t("base.cancel")
        }}</el-button>
        <el-button
          type="primary"
          @click="submit()"
          size="small"
          round
          v-text="
            $data.pluginSchema.value && !$data.pluginSchema.value.new
              ? $t('base.save')
              : $t('base.add')
          "
          >--</el-button
        >
      </span>
      <el-alert
        v-if="error.visible == true"
        :closable="false"
        :title="$t('base.error')"
        type="error"
        :description="error.description"
        show-icon>
      </el-alert>    
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, PropSync, VModel, Vue } from "vue-property-decorator";

import { PropType } from "vue";
import { eventManager, PluginDescriptor, PluginManager } from "@/utils/pluginManager";
import { pluginContainer } from "@/ioc/ioc.config";
import { GenericPlugin } from "@/modules/genericPlugin";
import { Plugindb } from "@/typings/plugindb";
import { ElTable } from "element-ui/types/table";


@Component({
  name:'PluginsDB'
})
export default class PluginsDB extends Vue {
  newDialogVisible: boolean = false;
  //editDialogVisible: boolean = false;
  @VModel() isFormDirty: boolean|undefined;

  private pluginSchema = require("@/vue/pages/schemas/plugindb.json");
  private pluginManager = pluginContainer.resolve("pluginManager") as PluginManager;

  //@VModel()
  plugins: Record<string,PluginDescriptor> = {};

  error = {
    visible: false,
    description: ""
  }

  created() {    
    eventManager.subscribe( (event)=>{
      console.log("Ricevuto evento Plugin",event);
      /*
      if( event.type === 'load'){
        this.plugins[event.key].enabled = true;
      } else if (event.type === 'unload'){
        this.plugins[event.key].enabled = false;
      }
      */
      this.list();
      this.$forceUpdate();
    });
    this.list();
  }

  list(){
    this.plugins = this.pluginManager.list();
    this.$nextTick(() => {
      Object.values(this.plugins).forEach((elem) => {
        if (elem.enabled)
          (this.$refs.table as ElTable).toggleRowSelection(elem);
      });
    });
  }

  private deleteRow(index: number, rows: any) {
    rows.splice(index, 1);
  }

  private submit() {
    (this as any).$ncformValidate("toolTypeForm").then((data: any) => {
      if (data.result) {
         const values = this.pluginSchema.value as Plugindb;
         console.log(JSON.stringify(values));
         switch(Number(values.choice)){
           case 1: // NPM
            this.pluginManager.loadNPM(values.name as string,values.version,{})
              .then( ()=>{
                     this.$data.newDialogVisible = false;
                     this.$forceUpdate();
              })
              .catch( (error)=>{
                this.error.visible = true;
                this.error.description = ""+error;
                this.$forceUpdate();
                console.log("Error!",error);
                throw error;
              });
             break; 
           case 2: // Github
            this.pluginManager.loadGitHub(values.repository as string,{})
              .then( ()=>{
                     this.$data.newDialogVisible = false;
                     this.$forceUpdate();
              })
              .catch( (error)=>{
                this.error.visible = true;
                this.error.description = ""+error;
                this.$forceUpdate();
                console.log("Error!",error);
                throw error;
              });
             break; 
           case 3: // Path
            this.pluginManager.loadPath(values.path as string,{})
              .then( ()=>{
                     this.$data.newDialogVisible = false;
                     this.$forceUpdate();
              })
              .catch( (error)=>{
                this.error.visible = true;
                this.error.description = ""+error;
                this.$forceUpdate();
                console.log("Error!",error);
                throw error;
              });
             break; 
         }
        
        /*
        if (this.pluginSchema.value.new) {
          //  console.log("Add(+)",this.pcbTypeInsertSchema.value);
          this.$data.pluginSchema.value.new = false;
          this.$data.plugins.push(this.pluginSchema.value);
        } else {
          //   console.log("Edit(+)", this.pcbTypeInsertSchema.value);
          const index = (this.$data.plugins as []).findIndex(
            (toolType: any) =>
              toolType.name === this.pluginSchema.value.name
          );
          //  console.log("-->", index, this.$data.pcbTypes[index]);
          Object.assign(
            this.$data.plugins[index],
            this.$data.pluginSchema.value
          );
        }
        FSStore.set("data.plugins", this.$data.plugins);
        this.$data.newDialogVisible = false;
        this.pluginSchema.value = {};
        */
      } else {
        console.error("Invalid!!", data);
      }
    });
  }

  private remove(index: number, row: PluginDescriptor) {
    console.log(index, row);
    this.pluginManager.unload(row.name,true);
    this.$data.plugins[row.name] = undefined;
  }

  private insert() {
    this.pluginSchema.value = {};
    this.$data.pluginSchema.value.new = true;
    this.$data.newDialogVisible = true;
  }

  private selectable(row: PluginDescriptor){
  //  console.log('::::::',row);
    return row.repository !== 'internal';
  }

/*
  private edit(index: number, row: PluginDescriptor) {
    //  console.log(index, row);
    this.pluginSchema.value = {};
    Object.assign(this.$data.pluginSchema.value, row);
    this.$data.pluginSchema.value.new = false;
    this.$data.newDialogVisible = true;
  }
*/  

  changeSelectionAll(selection: PluginDescriptor[]):void {
    Object.values(this.plugins).filter( pl=>pl.repository !== 'internal').forEach( plx=>{
      if( selection.find( pl=>pl.name===plx.name))this.pluginManager.load(plx);
      else this.pluginManager.unload(plx.name,false);
    });
  }

  changeSelection(selection: PluginDescriptor[], row: PluginDescriptor) {
    row.enabled = !!selection.find( sel => sel.name === row.name);
//    console.log(JSON.stringify(row));
    if(row.enabled) this.pluginManager.load(row);
    else this.pluginManager.unload(row.name,false);
  } 
}
</script>

<style scoped>
</style>