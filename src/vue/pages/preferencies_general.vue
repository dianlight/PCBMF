<template>
  <el-container>
    <el-main>
      <ncform
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
          <el-button size="mini" round type="warning" :disabled="!isFormDirty" @click="resetForm('userConfig')">Reset</el-button>
          <el-button size="mini" round type="success" :disabled="!isFormDirty" @click="submitForm('userConfig')">Save</el-button>
        </el-button-group>  
      </el-footer>      
  </el-container>    

</template>

<script lang='ts'>
import { Component, Prop, PropSync, VModel, Vue } from "vue-property-decorator";
import FSStore from "@/fsstore";
import { PropType } from "vue";
import { mapFields } from "vuex-map-fields";
import { UserConfig} from "@/typings/userConfig"

@Component({
  ...mapFields(['config.user.width'])
})
export default class PreferenciesGeneral extends Vue {

  private userConfigSchema = require("@/vue/pages/schemas/userConfig.json"); 
  isFormDirty= false;

  created() {
    FSStore.get<UserConfig>("data.userconfig").then((data) => {
      this.$data.userConfigSchema.value = data;
    });     
  }

  submitForm(form:string){
    (this as any).$ncformValidate(form).then((data:any)=>{
      if(data.result){
//        console.log("Submit:", this.userConfigSchema.value);
        FSStore.set("data.userconfig",this.userConfigSchema.value);
        this.isFormDirty=false;
      }
    })
  }

  resetForm(form: string){
    (this as any).$ncformReset(form);
  }

}
</script>

<style scoped>

.el-button-group {
  float: right;
}

</style>