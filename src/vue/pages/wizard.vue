<template>
  <el-container direction="vertical">
    <el-card>
      <el-header>
        <el-steps :active="active-1" finish-status="success" align-center>
          <el-step title="Step 1" description="Layout"></el-step>
          <el-step title="Step 2" description="Isolation"></el-step>
          <el-step title="Step 3" description="Drill PTH"></el-step>
          <el-step title="Step 4" description="Drill NPTH"></el-step>
          <el-step title="Step 5" description="Outline"></el-step>
          <el-step title="Step 6" description="Copper thief"></el-step>
          <el-step title="Step 7" description="Mask removal"></el-step>
          <el-step title="Step 8" description="Solder mask"></el-step>
          <el-step title="Step 9" description="Two side guide"></el-step>
          <el-step title="Step 5" description="Done"></el-step>
        </el-steps>
      </el-header>
    </el-card>
    <el-main>
      <el-card>
        <router-view></router-view>
      </el-card>
    </el-main>
    <el-footer>
      <el-row type="flex" justify="end">
        <el-col :span="4">
          <el-button-group>
            <el-button @click="nextPage(-1)" :disabled="active == 1"
              >Back</el-button
            >
            <el-button @click="nextPage(+1)" :disabled="active == 9"
              >Next</el-button
            >
          </el-button-group>
        </el-col>
      </el-row>
    </el-footer>
  </el-container>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import { Watch } from "vue-property-decorator";
import { Route, RouteConfig } from "vue-router";
import store from "../store";

@Component
export default class Wizard extends Vue {
  active = 1;

  nextPage(inc: number) {
    this.active += inc;
    console.log("New Active:", inc);
    this.$router!.options!.routes!.find(
      (route: RouteConfig) => route.path === "/wizard/"
    )?.children?.forEach((route: RouteConfig) => {
      console.log(route.meta.step == this.active, route.meta.step, this.active);
      if (route.meta.step == this.active - 1) {
        console.log("Visualize Path:", route.path);
        this.$router.push(route.path);
      }
    });
  }
}
</script>

<style scoped>
</style>