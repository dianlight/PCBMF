<template>
  <div>
    <el-button-group>
      <el-button
        size="mini"
        type="primary"
        icon="el-icon-edit"
      ></el-button>
      <el-button size="mini" type="primary" @click="checkprocess()"
        ><i class="el-icon-magic-stick">{{ this.$application.workers.length }}</i
      ></el-button>
    </el-button-group>
    <el-button-group>
      <el-button size="mini" type="primary" icon="el-icon-place"></el-button>
      <el-button size="mini" type="primary" icon="el-icon-setting">{{ $t('statusbar.setting')}}</el-button>
    </el-button-group>

    <i>{{ $application.progress.perc }}</i>
    <el-row v-if="this.$application.progress.perc">
      <el-tooltip class="item" effect="dark" :content="$t('thread.kill')" placement="bottom-start">
        <i class="el-icon-circle-close" @click="killThread($application.progress)"></i>
      </el-tooltip>
    <el-progress
      :percentage="Number(this.$application.progress.perc.toFixed(1)) || 0"
    >
    </el-progress>
    </el-row>

  </div>
</template>

<script lang='ts'>
import Component from "vue-class-component";
import Vue from "vue";
import { session, ipcRenderer } from "electron";
import { Worker as WorkerLike, Thread } from "threads";
import { GlobalVarGlobal, GlobalVarGlobalApplication, GlobalVarGlobalApplicationProgress } from "@/models/globalVarGlobal";
import { WorkerUtils } from "@/utils/workerUtils";
 
@Component({
  name: "statusbar",
})
export default class Statusbar extends Vue {

  running:number = 0;

  goBack() {
    this.$router.go(-1);
  }

  async killThread(progress:GlobalVarGlobalApplicationProgress){
    console.log(progress.abortFunction);
    if(progress.abortFunction) progress.abortFunction();
  }

  checkprocess() {
//    const services = session.defaultSession.serviceWorkers.getAllRunning();
//    return Object.keys(services).length;
    ipcRenderer.invoke("wokerLisy",10).then( result => {
      console.log(result);
      this.running = result;
    })
  }
}
</script>

<style scoped>

.el-progress {
  display: inline;
}

.el-progress >>> .el-progress-bar {
  width: 96%;
}

.el-icon-circle-close {
  color: red;
}

.el-icon-circle-close:hover {
  color: yellowgreen;
  background-color: red;
  cursor: pointer;
}


</style>