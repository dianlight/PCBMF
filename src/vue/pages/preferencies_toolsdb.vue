<template>
  <div>
    <el-table
      :data="toolTypes"
      style="width: 100%"
      size="small"
      stripe
      fit
      empty-text="No Tools defined!"
    >
      <el-table-column fixed prop="name" label="Name" width="200">
      </el-table-column>
      <el-table-column prop="size" label="Size (mm)"> </el-table-column>
      <el-table-column prop="type" label="Type"> </el-table-column>
      <el-table-column prop="angle" label="Angle (deg°)"></el-table-column>
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
        :form-schema="toolTypeSchema"
        form-name="toolTypeForm"
        v-model="toolTypeSchema.value"
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
            $data.toolTypeSchema.value &&
            !$data.toolTypeSchema.value.new
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

@Component({
  name:'ToolsDB'
})
export default class ToolsDB extends Vue {
  newDialogVisible: boolean = false;
  //editDialogVisible: boolean = false;
  @VModel() isFormDirty: boolean|undefined;

  private toolTypeSchema = require("@/vue/pages/schemas/tooldb.json");

  //@VModel()
  toolTypes: any[] = [];

  created() {
    FSStore.get("data.tool.types", []).then((data) => {
      this.toolTypes = data;
      //      console.log("---->", data);
    });
  }

  private count() {
    return FSStore.get("Prova", "Non trovato");
  }

  private deleteRow(index: number, rows: any) {
    rows.splice(index, 1);
  }

  private submit() {
    (this as any).$ncformValidate("toolTypeForm").then((data: any) => {
      if (data.result) {
        if (this.toolTypeSchema.value.new) {
          //  console.log("Add(+)",this.pcbTypeInsertSchema.value);
          this.$data.toolTypeSchema.value.new = false;
          this.$data.toolTypes.push(this.toolTypeSchema.value);
        } else {
          //   console.log("Edit(+)", this.pcbTypeInsertSchema.value);
          const index = (this.$data.toolTypes as []).findIndex(
            (toolType: any) =>
              toolType.name === this.toolTypeSchema.value.name
          );
          //  console.log("-->", index, this.$data.pcbTypes[index]);
          Object.assign(
            this.$data.toolTypes[index],
            this.$data.toolTypeSchema.value
          );
        }
        FSStore.set("data.tool.types", this.$data.toolTypes);
        this.$data.newDialogVisible = false;
        this.toolTypeSchema.value = {};
      } else {
        console.error("Invalid!!", data);
      }
    });
  }

  private remove(index: number, row: any) {
    //   console.log(index, row);
    this.$data.toolTypes.splice(index, 1);
    FSStore.set("data.tool.types", this.$data.toolTypes);
  }

  private insert() {
    //  console.log("Insert new!");
    this.toolTypeSchema.value = {};
    this.$data.toolTypeSchema.value.new = true;
    this.$data.newDialogVisible = true;
  }

  private edit(index: number, row: any) {
    //  console.log(index, row);
    this.toolTypeSchema.value = {};
    Object.assign(this.$data.toolTypeSchema.value, row);
    this.$data.toolTypeSchema.value.new = false;
    this.$data.newDialogVisible = true;
  }
}
</script>

<style scoped>
</style>