<template>
  <el-container direction="vertical">
    <el-main>
      <el-row type="flex" justify="center">
        <el-image :src="logo"></el-image>
      </el-row>
      <el-row type="flex" justify="center">
        <el-button @click="newProject" round
          >{{ $t("base.new") }} {{ $tc("base.project", 1) }}...</el-button
        >
      </el-row>
      <el-row type="flex" justify="center">
        <el-button @click="openProject" round>Open Project...</el-button>
      </el-row>
      <el-row type="flex" justify="center">
        <el-button @click="openGerberZip" round>{{
          $t("pages.home.new_project_from_gerber_zip")
        }}</el-button>
      </el-row>
      <!--
      <el-row type="flex" justify="center">
        <el-button round disabled>New Project from Gerber Folder...</el-button>
      </el-row>
      <el-row type="flex" justify="center">
        <el-button round disabled>Recents Files...</el-button>
      </el-row>
      -->
    </el-main>
    <el-footer>
      <li v-for="plugin in pluginList()" :key="plugin.id">{{plugin.name}} {{plugin.version}}</li>
    </el-footer>
  </el-container>
</template>

<script lang="ts">
import Vue from "vue";
import store from "../store/store";
import logo_icon from "@/../assets/PCB_Icon.svg";
import Component from "vue-class-component";
import { pluginContainer } from "@/ioc/ioc.config";
import { eventManager, PluginManager } from "@/utils/pluginManager";
import { GenericPlugin } from "@/modules/genericPlugin";

@Component({})
export default class Home extends Vue {

  logo = logo_icon as string;

  created(){
    console.log("Created!");
    eventManager.subscribe( (event)=>{
      console.log("Ricevuto evento Plugin",event);
      this.$forceUpdate();
    });
  }

  openProject() {
    this.$store.dispatch("open");
  }
  newProject() {
    this.$store.dispatch("new");
  }
  openGerberZip() {
    this.$store.dispatch("openGerberZip");
  }

  pluginList():GenericPlugin[]{
    const pluginManager = pluginContainer.resolve("pluginManager") as PluginManager;
    return Object.values(pluginManager.list()).filter( pl => pl.enabled);
  }
}
</script>

<style scoped>
.el-row {
  height: 20%;
  margin-bottom: 1em;
}
.el-button {
  width: 50%;
}
</style>