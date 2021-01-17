<template>
  <el-tabs type="border-card">
    <el-tab-pane :label="$t('pages.preferencies.general.title')">
      <preferencies_general/>
    </el-tab-pane>
    <el-tab-pane :label="$t('pages.preferencies.pcbdb.title')">
        <preferencies_pcbdb/>
    </el-tab-pane>
    <el-tab-pane :label="$t('pages.preferencies.toolsdb.title')">
       <tools-db/>
    </el-tab-pane>
  </el-tabs>
</template>

<script lang='ts'>
import { ElForm } from "element-ui/types/form";
import Vue from "vue";
import store from "@/vue/store/store";
import Preferencies_general from "@/vue/pages/preferencies_general.vue";
import Preferencies_pcbdb from "@/vue/pages/preferencies_pcbdb.vue";
import Preferencies_toolsdb from "@/vue/pages/preferencies_toolsdb.vue";
import Component from "vue-class-component";

@Component({
  components: { Preferencies_general, Preferencies_pcbdb, 'tools-db':Preferencies_toolsdb},
})
export default class Preferencies extends Vue {
}
</script>

<style scoped>
</style>