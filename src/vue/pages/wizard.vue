<template>
  <el-container direction="vertical">
    <el-card>
    <el-header>
      <el-steps :active="active" finish-status="success" align-center>
        <el-step title="Step 1" description="Base config" status="error"></el-step>
        <el-step title="Step 2" description="Isolation"></el-step>
        <el-step title="Drill"></el-step>
        <el-step title="Outline"></el-step>
        <el-step title="Copper thief"></el-step>
        <el-step title="Mask removal"></el-step>
        <el-step title="Solder mask"></el-step>
        <el-step title="Two Side"></el-step>
        <el-step title="Done"></el-step>
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
          <el-button @click="nextPage(-1)" :disabled="active == 0">Back</el-button>
          <el-button @click="nextPage(+1)" :disabled="active == 9">Next</el-button>
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
import { Route } from "vue-router";
import store from "../store";

@Component
export default class Wizard extends Vue {
  active = 1;

  nextPage(inc:number){
    this.active+=inc;
    this.$router.options.routes.find( (route)=> route.path === '/wizard/').children.forEach( (route) => {
      if(route.meta.step == this.active)this.$router.push(route.path);
    });
  }

}
</script>

<style scoped>
</style>