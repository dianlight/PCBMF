<template>
  <el-container direction="vertical">
    <el-header>
      <el-steps :active="active" finish-status="success">
        <el-step title="Base config"></el-step>
        <el-step title="Isolation"></el-step>
        <el-step title="Drill"></el-step>
        <el-step title="Outline"></el-step>
        <el-step title="Copper thief"></el-step>    
        <el-step title="Mask removal"></el-step>
        <el-step title="Solder mask"></el-step>
        <el-step title="Two Side"></el-step>
        <el-step title="Done"></el-step>
      </el-steps>
    </el-header>
    <el-main>
      <router-view></router-view>
    </el-main>
    <el-footer>
      <el-button>Back</el-button>
      <el-button>Next</el-button>
    </el-footer>
  </el-container>
</template>

<script lang="ts">
import Vue from "vue";
import store from "../store";
export default Vue.extend({
  data() {
    return {
      active: 0,
    }
  },
  methods: {
    openGerberZip() {
      this.$store.dispatch("openGerber");
    },
  },
});
</script>

<style scoped>

</style>