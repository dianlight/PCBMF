<template>
    <div class="ncform-input-number">
        <label class="el-form-item__label" v-if="mergeConfig.x_label">{{mergeConfig.x_label}}</label>
        <label class="el-form-item__label" v-else>{{$nclang('x_label')}}</label>  
        <el-input-number
          label="Prova"
          :disabled="disabled || readonly"
          v-show="!hidden"
          v-model="modelVal.x"
          :min="mergeConfig.min"
          :max="mergeConfig.max"
          :step="mergeConfig.step"
          :size="mergeConfig.size"
        ></el-input-number>
        <label class="el-form-item__label" style="margin-left: 1em;"  v-if="mergeConfig.y_label">{{mergeConfig.y_label}}</label>
        <label class="el-form-item__label" style="margin-left: 1em;" v-else>{{$nclang('y_label')}}</label>
        <el-input-number
          :disabled="disabled || readonly"
          v-show="!hidden"
          v-model="modelVal.y"
          :min="mergeConfig.min"
          :max="mergeConfig.max"
          :step="mergeConfig.step"
          :size="mergeConfig.size"
        ></el-input-number>
    </div>
</template>

<style lang="scss">
  .ncform-input-number {
    display: inline-flex;
    width: max-content;
  }
  .h-layout {
    .ncform-input-number {
      &.__ncform-control {
        clear: none;

      }
    }
  }

  .v-layout {
    .ncform-input-number {
      &.__ncform-control {
        clear: both;
      }
    }
  }
</style>

<script>

  import ncformCommon from '@ncform/ncform-common';

  const controlMixin = ncformCommon.mixins.vue.controlMixin;

  export default {

    mixins: [controlMixin],

/*
  i18nData: { // i18n
    en: {
      hi: 'Hi <%= name %>'
    },
    zh_cn: {
      hi: '你好 <%= name %>'
    }
  },  
*/    
    props: {
      value: {
        type: [Object,Number],
        default: ""
      }
    },

  created() {
//    console.log("--->",this.value);
    if (typeof this.value === "number") {
      this.$data.modelVal = {x:this.value,y:this.value}
    } else {
      this.$data.modelVal = this.value;
    }
//    console.log("++++>", this.$data.modelVal);
  },

    data() {
      return {
        defaultConfig: {
          x_label: undefined,
          y_label: undefined,
          min:0,
          max: Infinity,
          step: 1,
          size: ''
        }
        // modelVal：请使用该值来绑定实际的组件的model
      }
    },

    computed: {
      // disabled / readonly / hidden / placeholder 你可以直接使用这些变量来控制组件的行为
    },

    methods: {
    _processModelVal(newVal) {
      console.log("Processed:"+newVal);
      if (this.$data.valueType === "boolean") {
        return newVal ? true : false;
      }
      return newVal;
    }      

    }

  }
</script>