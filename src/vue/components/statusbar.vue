<template>
  <div>
    <el-button-group>
      <el-button
        size="mini"
        type="primary"
        icon="el-icon-edit"
      ></el-button>
      <el-button size="mini" type="primary"
        ><i class="el-icon-magic-stick"></i
      ></el-button>
    </el-button-group>
    <el-button-group>
      <el-button size="mini" type="primary" icon="el-icon-place"></el-button>
      <el-button size="mini" type="primary" icon="el-icon-setting">{{ $t('statusbar.setting')}}</el-button>
    </el-button-group>
  </div>
</template>

<script lang='ts'>
import Component from "vue-class-component";
import Vue from "vue";

@Component({
  name: "statusbar",
})
export default class Statusbar extends Vue {
  goBack() {
    this.$router.go(-1);
  }
}
</script>

<style scoped>
</style>