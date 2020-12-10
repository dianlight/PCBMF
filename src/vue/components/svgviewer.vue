<template>
  <div :class="_class" v-html="svgdata"></div>
</template>

<script lang="ts">
import Component from "vue-class-component";
import Vue from "vue";
import { Prop, PropSync } from "vue-property-decorator";

@Component({
  name: "SvgViewer",
})
export default class SvgViewer extends Vue {

 // svgdata:string = "Loading..";

  @Prop({ type: String, default: "" }) readonly _class!: string;
  @PropSync('data',{ type: String, default: "Loading..." }) readonly svgdata: String;
}
</script>

<style scoped>
</style>

