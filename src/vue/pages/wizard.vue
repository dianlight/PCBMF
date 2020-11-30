<template>
  <el-container direction="vertical">
    <el-header>
      <el-steps :active="active" finish-status="success">
        <el-step title="Base Config"></el-step>
        <el-step title="Step 2"></el-step>
        <el-step title="Step 3"></el-step>
      </el-steps>
    </el-header>
    <el-main>
      <router-view></router-view>
    </el-main>
    <el-footer> </el-footer>
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