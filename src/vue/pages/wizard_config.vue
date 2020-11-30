<template>
<el-container direction="vertical">
      <el-row>
        <el-col :span="10">
          <el-card>
            <div slot="header" class="clearfix">
              <span>Top View</span>
            </div>
            <div id="topsvg"></div>        
          </el-card>  
          <el-card>
            <div slot="header" class="clearfix">
              <span>Bottom View</span>
            </div>
            <div id="bottomsvg"></div>        
          </el-card>  
        </el-col> 
        <el-col :span="14">
        </el-col>   
      </el-row>  
  </el-container>
</template>

<script lang="ts">
import Vue from "vue";
import store from "../store";
import pcbStackup from "pcb-stackup";

export default Vue.extend({
  created() {
    if (!this.$store.state.layers) this.$router.push("/");
    else {
      pcbStackup(this.$store.state.layers, {
        useOutline: false,
      })
        .then((stackup) => {
          document.getElementById("topsvg").innerHTML = stackup.top.svg;
          document.getElementById("bottomsvg").innerHTML = stackup.bottom.svg;
          //    console.log(stackup.top.svg);
          //    console.log(stackup.bottom.svg);
        })
        .catch((err) => console.error(err));
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