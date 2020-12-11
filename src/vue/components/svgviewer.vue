<template>
  <div ref="svgelement" :class="_class" v-html="svgdata"></div>
</template>

<script lang="ts">
import Component from "vue-class-component";
import Vue from "vue";
import { Prop, PropSync } from "vue-property-decorator";
import panzoom from "panzoom";

@Component({
  name: "SvgViewer",
})
export default class SvgViewer extends Vue {
  // svgdata:string = "Loading..";

  @Prop({ type: String, default: "" }) readonly _class!: string;
  @PropSync("data", { type: String, default: "Loading..." })
  readonly svgdata: string;
  @Prop({ type: Boolean, default: false }) readonly panzoom: boolean;

  updated() {
    this.$nextTick(() => {
      const svg = this.$refs.svgelement as HTMLDivElement; //.querySelector("g");
      if (svg && this.panzoom) {
        //      console.log("u SVG is",svg);
        panzoom(svg, {
          zoomSpeed: 0.065,
        });
      }
    });
  }
}
</script>

<style scoped>
</style>

