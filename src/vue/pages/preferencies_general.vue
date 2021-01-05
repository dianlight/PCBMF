<template>
  <el-container>
    <el-main>
      <ncform
        refs
        :form-schema="userConfigSchema"
        form-name="userConfig"
        v-model="userConfigSchema.value"
        :is-dirty.sync="isFormDirty"
        @submit="submit()"
      >
      </ncform>
    </el-main>
    <el-footer>
      <el-button-group>
        <el-button
          size="mini"
          round
          type="warning"
          :disabled="!isFormDirty"
          @click="resetForm('userConfig')"
          >{{$t('base.reset')}}</el-button
        >
        <el-button
          size="mini"
          round
          type="success"
          :disabled="!isFormDirty"
          @click="submitForm('userConfig')"
          >{{$t('base.save')}}</el-button
        >
      </el-button-group>
      <el-button-group>
        <el-button size="mini" round type="primary" @click="reloadSerliaList()"
          >{{$t('pages.preferencies.general.reload-serial-port-list')}}</el-button
        >
        <el-button size="mini" round type="success" disabled
          >{{$t('pages.preferencies.general.autoconfig')}}</el-button
        >
      </el-button-group>
    </el-footer>
  </el-container>
</template>

<script lang='ts'>
import { Component, Prop, PropSync, VModel, Vue } from "vue-property-decorator";
import FSStore from "@/fsstore";
import { PropType } from "vue";
import { mapFields } from "vuex-map-fields";
import { UserConfig } from "@/typings/userConfig";
import { ipcRenderer } from "electron";
import SerialPort from "serialport";
import { i18n } from "../i18n";

@Component({
  ...mapFields(["config.user.width"]),
})
export default class PreferenciesGeneral extends Vue {
  private userConfigSchema = Object.assign(
              require("@/vue/pages/schemas/userConfig.json"),
              {
                globalConfig:{
                  constants: {
                   ... i18n.t('dialogs.general') as Object,
                   ... i18n.t('base') as Object
                  }
                }
              });
  isFormDirty = false;

  created() {
    this.reloadSerliaList();
//    console.log(this.$t('pages'));
//    this.userConfigSchema.globalConfig.name="22";//i18n.t('serial');

      console.log(this.userConfigSchema);
    /*
    (this.$data
      .userConfigSchema as any).properties.serial.ui.widgetConfig.enumSource = [
      {
        value: "Test",
        label: "Questo è un test",
      },
    ];
    console.log(this.$data.userConfigSchema as any);
    */
    FSStore.get<UserConfig>("data.userconfig").then((data) => {
      this.$data.userConfigSchema.value = data;
    });
  }

  submitForm(form: string) {
    (this as any).$ncformValidate(form).then((data: any) => {
      if (data.result) {
        //        console.log("Submit:", this.userConfigSchema.value);
        FSStore.set("data.userconfig", this.userConfigSchema.value);
        this.isFormDirty = false;
      }
    });
  }

  reloadSerliaList() {
    ipcRenderer
      .invoke("SerialPort.List")
      .then((ports: SerialPort.PortInfo[]) => {
        (this.$data
          .userConfigSchema as any).properties.serial.ui.widgetConfig.enumSource = ports.map(
          (port) => {
            return {
              value: port.path,
              label: `${port.path}`,
            };
          }
        );
      })
      .catch((err) => {
        console.error(err);
      });
  }

  resetForm(form: string) {
    (this as any).$ncformReset(form);
  }
}
</script>

<style scoped>
.el-button-group {
  float: right;
}
</style>