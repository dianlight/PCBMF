<template>
  <el-container direction="vertical">
    <el-card>
      <el-header>
        <el-steps :active="active - 1" finish-status="success" align-center>
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
        <el-col :span="6">
          <el-button-group>
            <el-button
              @click="nextPage(-1)"
              :disabled="active == 1 || !prev"
              size="small"
              type="primary"
              round
              icon="el-icon-arrow-left"
              >Back</el-button
            >
            <el-button
              @click="nextPage(+1)"
              :disabled="active == 9 || !skip"
              size="small"
              round
              type="warning"
              icon="el-icon-d-arrow-right"
              >Skip</el-button
            >
            <el-button
              @click="nextPage(+1)"
              :disabled="active == 9 || !next"
              size="small"
              type="primary"
              round
              icon="el-icon-arrow-right"
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
import { Provide, Watch } from "vue-property-decorator";
import { Route, RouteConfig } from "vue-router";
import store from "../store";

@Component
export default class Wizard extends Vue {
  active = 1;
  prev = true;
  next = true;
  skip = true;
  outstatus = "success";
  nextCallback: () => boolean | PromiseLike<boolean> = () => true;

  nextPage(inc: number) {
    Promise.resolve(this.nextCallback()).then((resolve) => {
      if (resolve) {
        this.active += inc;
        console.log("New Active:", inc);
        this.$router!.options!.routes!.find(
          (route: RouteConfig) => route.path === "/wizard/"
        )?.children?.forEach((route: RouteConfig) => {
          console.log(
            route.meta.step == this.active,
            route.meta.step,
            this.active
          );
          if (route.meta.step == this.active - 1) {
            console.log("Visualize Path:", route.path);
            this.nextCallback = () => true;
            (this.prev = true), (this.next = true), (this.skip = true);
            this.$router.push(route.path);
          }
        });
      }
    });
  }

  @Provide()
  setTabStatus(state: "wait" | "process" | "finish" | "error" | "success") {
    console.log("----> Status", state);
  }

  @Provide()
  setOutTabStatus(state: "wait" | "process" | "finish" | "error" | "success") {
    this.outstatus = state;
  }

  @Provide()
  enableButtons(prev: boolean, skip: boolean, next: boolean) {
    this.prev = prev;
    this.next = next;
    this.skip = skip;
  }

  @Provide()
  registerNextCallback(callback: () => boolean | PromiseLike<boolean>) {
    this.nextCallback = callback;
  }
}
</script>

<style scoped>
</style>