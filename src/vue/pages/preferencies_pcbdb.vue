<template>
  <el-table :data="pcbTypes" style="width: 100%;" size="small" stripe fit empty-text="No PCB defined!">
    <el-table-column fixed prop="name" label="Name" width="200">
    </el-table-column>
    <el-table-column prop="sides" label="Sides" > </el-table-column>
    <el-table-column prop="width" label="Width (mm)" > </el-table-column>
    <el-table-column prop="height" label="Height (mm)"></el-table-column>
    <el-table-column fixed="right" label="Operations" >
      <template slot="header" slot-scope="scope">
        <el-button @click="newDialogVisible = true" type="success" size="small"
          icon="el-icon-plus" circle></el-button
        >
        <el-dialog
          title="Add a new blank PCB type"
          :visible.sync="newDialogVisible"
          width="50%"
          append-to-body
          center
        >
          <span>Please add information about your blank PCBs</span>
          <ncform
            :form-schema="pcbTypeInsertSchema"
            form-name="pcbTypeForm"
            v-model="pcbTypeInsertSchema.value"
            @submit="submit()"
          ></ncform>
          <span slot="footer" class="dialog-footer">
            <el-button @click="newDialogVisible = false" size="small" round
              >Cancel</el-button
            >
            <el-button
              type="primary"
              @click="submit()"
              size="small" round
              >Add</el-button
            >
          </span>
        </el-dialog>
      </template>
      <template slot-scope="scope">
        <el-button @click="remove(scope.$index, scope.row)" type="danger" size="small"
          circle icon="el-icon-delete"></el-button
        >       
        <el-button type="primary" size="small" @click="edit(scope.$index, scope.row)" icon="el-icon-edit" circle></el-button>
 <el-dialog
          title="Edit PCB type"
          :visible.sync="editDialogVisible"
          width="50%"
          append-to-body
          center
        >
          <span>Please add information about your blank PCBs</span>
          <ncform
            :form-schema="pcbTypeEditSchema"
            form-name="pcbTypeEditForm"
            v-model="pcbTypeEditSchema.value"
            @submit="submitSave()"
          ></ncform>
          <span slot="footer" class="dialog-footer">
            <el-button @click="editDialogVisible = false" size="small" round
              >Cancel</el-button
            >
            <el-button
              type="primary"
              @click="submitSave()"
              size="small" round
              >Save</el-button
            >
          </span>
        </el-dialog>        
      </template>
    </el-table-column>
  </el-table>
</template>

<script lang="ts">
import { Component, Prop, PropSync, VModel, Vue } from "vue-property-decorator";
import FSStore from "@/fsstore";

@Component
export default class PreferenciesPcbDB extends Vue {
  newDialogVisible: boolean = false;
  editDialogVisible: boolean = false;

  private pcbTypeInsertSchema = require("@/vue/pages/schemas/pcbdb_insert.json");
  private pcbTypeEditSchema = require("@/vue/pages/schemas/pcbdb_edit.json");

  //@VModel() 
  pcbTypes:any[] = [];

  created(){
    FSStore.get("data.pcb.types", []).then((data)=>{ this.pcbTypes=data; console.log("---->",data)});
  }

  private count() {
    return FSStore.get("Prova", "Non trovato");
  }

  private deleteRow(index: number, rows: any) {
    rows.splice(index, 1);
  }

  private submit() {
    (this as any).$ncformValidate("pcbTypeForm").then((data: any) => {
      if (data.result) {
//        console.log("New(+)",this.pcbTypeInsertSchema.value);
        this.$data.pcbTypes.push(this.pcbTypeInsertSchema.value);
//        console.log("Actual:",this.$data.pcbTypes);
        this.pcbTypeInsertSchema.value = {};
        this.$data.newDialogVisible = false;
        FSStore.set("data.pcb.types",this.$data.pcbTypes);
      }
    });
  }

  private submitSave() {
    (this as any).$ncformValidate("pcbTypeEditForm").then((data: any) => {
      if (data.result) {
        console.log("Edit(+)",this.pcbTypeEditSchema.value);
        const index = (this.$data.pcbTypes as []).findIndex( (pcbType:any)=> pcbType.name === this.pcbTypeEditSchema.value.name );
        console.log("-->",index, this.$data.pcbTypes[index]);
        Object.assign(this.$data.pcbTypes[index],this.pcbTypeEditSchema.value);
        this.$data.editDialogVisible = false;
        FSStore.set("data.pcb.types",this.$data.pcbTypes);
      }
    });
  }

  private remove(index:number,row:any){
    console.log(index,row);
    this.$data.pcbTypes.splice(index,1);
    FSStore.set("data.pcb.types",this.$data.pcbTypes);
  }

  private edit(index:number,row:any){
    console.log(index,row);
    this.pcbTypeEditSchema.value={};
    Object.assign(this.pcbTypeEditSchema.value,row);
    this.$data.editDialogVisible = true;
  }

/*
  $$nextTick() {
    console.log("------------------------");
  }
  */
}
</script>

<style scoped>
</style>