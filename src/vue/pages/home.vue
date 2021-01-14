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
  </el-container>
</template>

<script lang="ts">
import Vue from "vue";
import store from "../store";
import logo_icon from "@/../assets/PCB_Icon.svg";
import Component from "vue-class-component";

@Component({})
export default class Home extends Vue {

  logo = logo_icon as string;

  openProject() {
    this.$store.dispatch("open");
  }
  newProject() {
    this.$store.dispatch("new");
  }
  openGerberZip() {
    this.$store.dispatch("openGerberZip");
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