<template>
  <el-tabs type="border-card">
    <el-tab-pane label="General">
      <preferencies_general/>
    </el-tab-pane>
    <el-tab-pane label="PCB Database">
        <preferencies_pcbdb/>
    </el-tab-pane>
    <el-tab-pane label="Tools Database">Tools Database</el-tab-pane>
  </el-tabs>
</template>

<script lang='ts'>
import { ElForm } from "element-ui/types/form";
import Vue from "vue";
import store from "../store";
import preferencies_general from "./preferencies_general.vue";
import Preferencies_pcbdb from "./preferencies_pcbdb.vue";
import preferencies_pcbdb from "./preferencies_pcbdb.vue";
export default Vue.extend({
  components: { preferencies_general, Preferencies_pcbdb },
  /*
  data() {
    return {
      ruleForm: {
        name: "",
        region: "",
        date1: "",
        date2: "",
        delivery: false,
        type: [],
        resource: "",
        desc: "",
      },
      rules: {
        name: [
          {
            required: true,
            message: "Please input Activity name",
            trigger: "blur",
          },
          {
            min: 3,
            max: 5,
            message: "Length should be 3 to 5",
            trigger: "blur",
          },
        ],
        region: [
          {
            required: true,
            message: "Please select Activity zone",
            trigger: "change",
          },
        ],
        date1: [
          {
            type: "date",
            required: true,
            message: "Please pick a date",
            trigger: "change",
          },
        ],
        date2: [
          {
            type: "date",
            required: true,
            message: "Please pick a time",
            trigger: "change",
          },
        ],
        type: [
          {
            type: "array",
            required: true,
            message: "Please select at least one activity type",
            trigger: "change",
          },
        ],
        resource: [
          {
            required: true,
            message: "Please select activity resource",
            trigger: "change",
          },
        ],
        desc: [
          {
            required: true,
            message: "Please input activity form",
            trigger: "blur",
          },
        ],
      },
    };
  },
  methods: {
    submitForm(formName: any) {
      (this.$refs[formName] as ElForm).validate((valid) => {
        if (valid) {
          alert("submit!");
          return true;
        } else {
          console.log("error submit!!");
          return false;
        }
      });
    },
    resetForm(formName: any) {
      (this.$refs[formName] as ElForm).resetFields();
    },
  },
  */
});
</script>

<style scoped>
</style>