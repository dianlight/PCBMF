<template>
<!--
  <el-breadcrumb separator="/">
    <el-breadcrumb-item :to="{ path: '/' }">homepage</el-breadcrumb-item>
    <el-breadcrumb-item><a href="/">promotion management</a></el-breadcrumb-item>
    <el-breadcrumb-item>promotion list</el-breadcrumb-item>
    <el-breadcrumb-item>File: {{ currentFile }}</el-breadcrumb-item>
  </el-breadcrumb>  
-->
<el-page-header @back="goBack" :content="currentFile()">
</el-page-header>
</template>

<script lang='ts'>
import Component from "vue-class-component";
import Vue from "vue";

@Component({
  name: "statusbar",
})
export default class Statusbar extends Vue {
        currentFile() {
           return this.$store.state.currentFile;
        };

    goBack(){
      this.$router.go(-1);
    }
};
</script>

<style scoped>
</style>