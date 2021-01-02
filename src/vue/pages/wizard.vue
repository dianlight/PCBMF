<template>
  <el-container direction="vertical">
    <el-card>
      <el-header>
        <el-steps ref="step" :active="active - 1" finish-status="success" align-center>
          <el-step title="Step 1" description="Config"></el-step>
          <el-step title="Step 2" description="Isolation"></el-step>
          <el-step title="Step 3" description="Drill"></el-step>
          <el-step title="Step 4" description="Outline"></el-step>
          <el-step title="Step 5" description="Copper thief"></el-step>
          <el-step title="Step 6" description="Solder mask"></el-step>
          <!--
          <el-step title="Step 7" description="Two side guide"></el-step>
          <el-step title="Step 7" description="Mask removal"></el-step>
          -->
          <el-step title="Result" description="Done"></el-step>
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
              @click="nextPage(+1,skip)"
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
import { ElStep, StepStatus } from "element-ui/types/step";
import { ElSteps } from "element-ui/types/steps";
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
  lastinc = 0;
  nextCallback: (type: 'next'|'back'|'skip') => boolean | PromiseLike<boolean> = () => true;

  nextPage(inc: number, skip: boolean = false) {
    this.lastinc = inc;

    Promise.resolve(this.nextCallback(skip?'skip':((inc >0)?'next':'back'))).then((resolve) => {
      if (resolve) {
        this.active += inc;
       // console.log("New Active:", inc);
        this.$router!.options!.routes!.find(
          (route: RouteConfig) => route.path === "/wizard/"
        )?.children?.forEach((route: RouteConfig) => {
          /*
          console.log(
            route.meta.step == this.active,
            route.meta.step,
            this.active
          );
          */
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

//  @Provide()
//  setTabStatus(state: "wait" | "process" | "finish" | "error" | "success") {
//    console.log("----> Status", state);
//  }

  @Provide()
  enableButtons(prev: boolean, skip: boolean, next: boolean) {
    this.prev = prev;
    this.next = next;
    this.skip = skip;
  }

  @Provide()
  registerNextCallback(callback: (type: 'next'|'back'|'skip') => boolean | PromiseLike<boolean>) {
    this.nextCallback = callback;
  }

  @Provide()
  wizardPushSkip(){
    console.log("Skip to ",this.lastinc);
    this.nextPage(this.lastinc,true);
  }
}
</script>

<style scoped>
</style>