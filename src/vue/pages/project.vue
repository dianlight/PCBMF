<template>
  <el-container direction="vertical">
    <el-card>
        <el-main>
          <el-tabs ref="tab" value="config" tab-position="left" style="height: 100%;" @tab-click="tab_refresh()" stretch>
            <el-tab-pane name="config" :label="$t('pages.project.config')" lazy>
              <project-config/>
            </el-tab-pane>
            <!--
            <el-tab-pane name="isolation" :label="$t('pages.project.isolation')" lazy>
              <wizard-isolation :key="doIsolationRefresh"/>
            </el-tab-pane>
            <el-tab-pane name="drill" :label="$t('pages.project.drill')" lazy>
              <wizard-drill :key="doDrillRefresh"/>
            </el-tab-pane>
            <el-tab-pane name="outline" :label="$t('pages.project.outline')" lazy>
              <wizard-outline :key="doOutlineRefresh"/>
            </el-tab-pane>
            <el-tab-pane name="copper" :label="$t('pages.project.copper-thief')" lazy>
              <wizard-copper-thief :key="doCopperRefresh"/>
            </el-tab-pane>
            -->
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
import ProjectConfig from "@/vue/pages/project_config.vue";
//import WizardIsolation from "@/vue/pages/wizard_isolation.vue";
//import WizardDrill from "@/vue/pages/wizard_drill.vue";
//import WizardOutline from "@/vue/pages/wizard_outline.vue";
//import WizardCopperThief from "@/vue/pages/wizard_copper_thief.vue";
import { mapFields } from "vuex-map-fields";
import crypto from "crypto";

@Component({
  components: {
    ProjectConfig,
//    WizardIsolation,
//    WizardDrill,
//    WizardOutline,
//    WizardCopperThief
  },
  computed: {
    ...mapFields(["md5","config"]),
  }

})
export default class Project extends Vue {

  doIsolationRefresh:string = "";
  doDrillRefresh:string = "";
  doOutlineRefresh:string = "";
  doCopperRefresh:string = "";

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
    const actualHash = crypto.createHash('sha1').update(JSON.stringify(this.$store.state)).digest("hex");
//    console.log("Refresh!",(this.$refs.tab as any).currentName);
    switch((this.$refs.tab as any).currentName){
      case "isolation":
        if(this.doIsolationRefresh === actualHash)return;
        this.doIsolationRefresh=actualHash; 
      case "drill":
        if(this.doDrillRefresh === actualHash)return;
        this.doDrillRefresh=actualHash; 
      case "outline":
        if(this.doOutlineRefresh === actualHash)return;
        this.doOutlineRefresh=actualHash; 
      case "copper":
        if(this.doCopperRefresh === actualHash)return;
        this.doCopperRefresh=actualHash; 
      default:
        break;
    }
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