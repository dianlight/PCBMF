<template>
  <el-breadcrumb separator="/">
    <el-breadcrumb-item :to="{ path: '/' }">homepage</el-breadcrumb-item>
    <el-breadcrumb-item><a href="/">promotion management</a></el-breadcrumb-item>
    <el-breadcrumb-item>promotion list</el-breadcrumb-item>
    <el-breadcrumb-item>File: {{ currentFile }}</el-breadcrumb-item>
  </el-breadcrumb>  
</template>

<script lang='ts'>
import Vue from "vue";
export default Vue.extend({
    computed: {
        currentFile() {
           return this.$store.state.currentFile;
        }
    }
});
</script>

<style scoped>
</style>