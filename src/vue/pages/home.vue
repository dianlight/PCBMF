<template>
  <el-container direction='vertical'>
    <el-main>
      <el-row type="flex" justify="center">
        <el-button @click="openGerberZip" round>Open Gerber Zip...</el-button>
      </el-row>
      <el-row type="flex" justify="center">
        <el-button round disabled>Open Gerber Folder...</el-button>
      </el-row>
      <el-row type="flex" justify="center">
        <el-button round disabled>Open Files...</el-button>
      </el-row>
    </el-main>
  </el-container>  
</template>

<script lang="ts">
import Vue from "vue";
import store from "../store";
export default Vue.extend({
  methods: {
    openGerberZip(){
      this.$store.dispatch('openGerber');
    }
  }

});
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