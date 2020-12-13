<template>
  <div>
    <el-table
      :data="pcbTypes"
      style="width: 100%"
      size="small"
      stripe
      fit
      empty-text="No PCB defined!"
    >
      <el-table-column fixed prop="name" label="Name" width="200">
      </el-table-column>
      <el-table-column prop="sides" label="Sides"> </el-table-column>
      <el-table-column prop="width" label="Width (mm)"> </el-table-column>
      <el-table-column prop="height" label="Height (mm)"></el-table-column>
      <el-table-column prop="cthickness" label="Copper Thickness (mm)"></el-table-column>
      <el-table-column prop="bthickness" label="Board Tickness (mm)"></el-table-column>
      <el-table-column fixed="right" label="Operations">
        <template #header>
          <el-button
            @click="insert"
            type="success"
            size="small"
            icon="el-icon-plus"
            circle
          ></el-button>
        </template>
        <template slot-scope="scope">
          <el-button
            @click="remove(scope.$index, scope.row)"
            type="danger"
            size="small"
            circle
            icon="el-icon-delete"
          ></el-button>
          <el-button
            type="primary"
            size="small"
            @click="edit(scope.$index, scope.row)"
            icon="el-icon-edit"
            circle
          ></el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog
      title="PCB type"
      :visible.sync="newDialogVisible"
      width="50%"
      append-to-body
      center
    >
      <span>Information about your blank PCBs</span>
      <ncform
        :form-schema="pcbTypeSchema"
        form-name="pcbTypeForm"
        v-model="pcbTypeSchema.value"
        @submit="submit()"
      ></ncform>
      <span slot="footer" class="dialog-footer">
        <el-button @click="newDialogVisible = false" size="small" round
          >Cancel</el-button
        >
        <el-button
          type="primary"
          @click="submit()"
          size="small"
          round
          v-text="
            $data.pcbTypeSchema.value &&
            !$data.pcbTypeSchema.value.new
              ? 'Save'
              : 'Add'
          "
          >--</el-button
        >
      </span>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, PropSync, VModel, Vue } from "vue-property-decorator";
import FSStore from "@/fsstore";
import { PropType } from "vue";

@Component
export default class PreferenciesPcbDB extends Vue {
  newDialogVisible: boolean = false;
  //editDialogVisible: boolean = false;
  @VModel() isFormDirty: boolean|undefined;

  private pcbTypeSchema = require("@/vue/pages/schemas/pcbdb.json");

  //@VModel()
  pcbTypes: any[] = [];

  created() {
    FSStore.get("data.pcb.types", []).then((data) => {
      this.pcbTypes = data;
      //      console.log("---->", data);
    });
  }

//  private count() {
//    return FSStore.get("Prova", "Non trovato");
//  }

  private deleteRow(index: number, rows: any) {
    rows.splice(index, 1);
  }

  private submit() {
    (this as any).$ncformValidate("pcbTypeForm").then((data: any) => {
      if (data.result) {
        if (this.pcbTypeSchema.value.new) {
          //  console.log("Add(+)",this.pcbTypeSchema.value);
          this.$data.pcbTypeSchema.value.new = false;
          this.$data.pcbTypes.push(this.pcbTypeSchema.value);
        } else {
          //   console.log("Edit(+)", this.pcbTypeSchema.value);
          const index = (this.$data.pcbTypes as []).findIndex(
            (pcbType: any) =>
              pcbType.name === this.pcbTypeSchema.value.name
          );
          //  console.log("-->", index, this.$data.pcbTypes[index]);
          Object.assign(
            this.$data.pcbTypes[index],
            this.$data.pcbTypeSchema.value
          );
        }
        FSStore.set("data.pcb.types", this.$data.pcbTypes);
        this.$data.newDialogVisible = false;
        this.pcbTypeSchema.value = {};
      } else {
        console.error("Invalid!!", data);
      }
    });
  }

  private remove(index: number, row: any) {
    //   console.log(index, row);
    this.$data.pcbTypes.splice(index, 1);
    FSStore.set("data.pcb.types", this.$data.pcbTypes);
  }

  private insert() {
    //  console.log("Insert new!");
    this.pcbTypeSchema.value = {};
    this.$data.pcbTypeSchema.value.new = true;
    this.$data.newDialogVisible = true;
  }

  private edit(index: number, row: any) {
    //  console.log(index, row);
    this.pcbTypeSchema.value = {};
    Object.assign(this.$data.pcbTypeSchema.value, row);
    this.$data.pcbTypeSchema.value.new = false;
    this.$data.newDialogVisible = true;
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