<template>
  <el-container direction="vertical">
    <el-card>
        <el-main>
          <el-tabs ref="tab" tab-position="left" style="height: 100%;" @tab-click="tab_refresh()" stretch>
            <el-tab-pane label="Config" lazy>
              <wizard-config/>
            </el-tab-pane>
            <el-tab-pane name="isolation" label="Isolation" lazy>
              <wizard-isolation :key="doTabRefresh"/>
            </el-tab-pane>
            <el-tab-pane name="drill" label="Drill" lazy>
              <wizard-drill :key="doTabRefresh"/>
            </el-tab-pane>
            <el-tab-pane name="outline" label="Outline" lazy>
              <wizard-outline :key="doTabRefresh"/>
            </el-tab-pane>
            <el-tab-pane name="copper" label="Copper Thief" lazy>
              <wizard-copper-thief :key="doTabRefresh"/>
            </el-tab-pane>
          </el-tabs>
        </el-main>         
    </el-card>
  </el-container>      
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import { Provide, Watch } from "vue-property-decorator";
import store from "@/vue/store";
import WizardConfig from "@/vue/pages/wizard_config.vue";
import WizardIsolation from "@/vue/pages/wizard_isolation.vue";
import WizardDrill from "@/vue/pages/wizard_drill.vue";
import WizardOutline from "@/vue/pages/wizard_outline.vue";
import WizardCopperThief from "@/vue/pages/wizard_copper_thief.vue";
import { mapFields } from "vuex-map-fields";

@Component({
  components: {
    WizardConfig,
    WizardIsolation,
    WizardDrill,
    WizardOutline,
    WizardCopperThief
  },
  computed: {
    ...mapFields(["md5","config"]),
  }

})
export default class Project extends Vue {

  doTabRefresh:boolean = false;

  @Provide()
  enableButtons(prev: boolean, skip: boolean, next: boolean) {
  }

  @Provide()
  registerNextCallback(callback: (type: 'next'|'back'|'skip') => boolean | PromiseLike<boolean>) {
  }

  @Provide()
  wizardPushSkip(){
  }

  tab_refresh(){
    console.log("Refresh!",(this.$refs.tab as any).currentName);
    this.doTabRefresh = !this.doTabRefresh;
  }

}
</script>

<style scoped>
  .el-container {
    min-height: 100%;
  }
  .el-card {
    min-height: 100%;
  }
  .el-main {
    min-height: 100%;
  }
</style>