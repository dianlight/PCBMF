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
        <el-form ref="form" :model="form" label-width="120px">
          <el-form-item label="Use Outline">
            <el-switch v-model="form.useOutline"></el-switch>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </el-container>
</template>

<script lang="ts">
import Vue from "vue";
import store from "../store";
import pcbStackup from "pcb-stackup";
import { mapGetters, mapState } from "vuex";
import { mapFields } from 'vuex-map-fields';

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
  /*
  data() {
    return {
      form: {
        useOutline: false,
      },
    };
  },
  */
  computed: {   
    ...mapFields([
      'config.useOutline'
    ]),
  },

  /*{
    ...mapGetters({
      'form.useOutline': 'gerber.useOutline',
    }),
    "form": {
      get() {
        return {
          useOutline: this.$store.state.gerber.useOutline
        }
      },
      set(value:any){
        console.log("Set Received!",value);
        this.$store.commit('update_gerber_useOutline',value.useOutline);
      }
    }
  }*/
  /*  
  data() {
    return {
      form: {
        useOutline: this.$store.state.gerber.useOutline,
      }
    }
  }, 
  methods: {
    openGerberZip() {
      this.$store.dispatch("openGerber");
    },
  },
*/
});
</script>

<style scoped>
</style>