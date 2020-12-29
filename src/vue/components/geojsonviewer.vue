<template>
  <div ref="svgelement" :class="_class" v-html="svgdata"></div>
</template>

<script lang="ts">
import Component from "vue-class-component";
import Vue from "vue";
import { Prop, PropSync, Watch } from "vue-property-decorator";
import panzoom from "panzoom";
import SvgViewer from "./svgviewer.vue";
import geojson2svg, { Renderer } from "geojson-to-svg";
import { Feature } from "geojson";
import extend  from "json-extend";

@Component({
  name: "GeoJsonViewer",
})
export default class GeoJsonViewer extends Vue {
  svgdata: string = "Loading..";

  @Prop({ type: String, default: "" }) readonly _class!: string;
  @PropSync("data", { type: Object, default: ()=>{} }) readonly geojson:
    | Object
    | undefined;
  @Prop({ type: Boolean, default: false }) readonly panzoom:
    | boolean
    | undefined;

  updated() {
    this.$nextTick(() => {
      const svg = this.$refs.svgelement as HTMLDivElement; //.querySelector("g");
      if (svg && this.panzoom) {
        panzoom(svg, {
          zoomSpeed: 0.065,
        });
      }
    });
  }

  @Watch("geojson")
  onGeoJsonChange(val: Object, old: Object): void {
//    console.log("------------------->", val);
//    console.log("Drawing....", this.geojson);
    const renderer = geojson2svg()
    this.svgdata = renderer
//      .type("userData")
      .styles( (feature:Feature,bbox:any,featureBound:any) => { 
//        console.log(JSON.stringify(feature.geometry.type));
        switch(feature.properties!.userData){
          case "isolation":
            return { weight: feature.properties!.width, color:"red" ,fill:"#000000", fillOpacity: 0.0, stroke: "orange"} 
            break;
          default:
            return extend({}, renderer._selectStyle(feature), feature.properties);
            break;  
        }
       })
      .data(this.geojson)
      .render();
    this.$forceUpdate();
  }
}
</script>

<style scoped>
div >>> svg {
 transform-origin: 50% 50%;
 transform: scale(1,-1);
}
</style>