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
import { FeatureUserData } from "@/parsers/gerberParser.worker";
import { use } from "vue/types/umd";

@Component({
  name: "GeoJsonViewer",
})
export default class GeoJsonViewer extends Vue {
  svgdata: string = this.$t('base.loading').toString();

  @Prop({ type: String, default: "" }) readonly _class!: string;
  @PropSync("data", { type: Object, default: ()=>{} }) readonly geojson:
    | GeoJSON.FeatureCollection
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
    if(this.geojson){
      const geojson = this.geojson;
//    geojson.features = geojson?.features.sort( (a,b) => (a.properties?.userData as FeatureUserData).layer - (b.properties?.userData as FeatureUserData).layer) || [];
//    console.log("Drawing....", JSON.stringify(geojson.features[0].properties as FeatureUserData),
//     JSON.stringify(geojson.features[geojson.features.length-1].properties as FeatureUserData));
    const renderer = geojson2svg()
    this.svgdata = renderer
      .styles( (feature:Feature,bbox:any,featureBound:any) => { 
//        console.log(JSON.stringify(feature.geometry.type));
/*
        switch(feature.properties!.userData as FeatureUserData){
          case "isolation":
            return { weight: feature.properties!.width, color:"red" ,fill:"#000000", fillOpacity: 0.0, stroke: "orange"} 
            break;
          case "outline":
            return { weight: feature.properties!.width, color:"blue" ,fill:"#000000", opacity: 0.5, stroke: "red"} 
            break;
          case "thief":
            return { weight: feature.properties!.width, color:"orange" ,fill:"#000000",fillOpacity:0.0, opacity: 0.1, stroke: "blue"} 
            break;
          default:
//            return renderer._selectStyle(feature), feature.properties;
            return { weight: 0.25 ,fill:"#000000", opacity: 0.5, stroke: "black"} 
            break;  
        }
*/
      const userData = feature.properties!.userData as FeatureUserData;
     // console.log(userData.layer);
      if(userData && userData.type === "isolation"){
            return { weight: feature.properties!.width, color:"red" ,fill:"#b87333", fillOpacity: 0.1, stroke: "blue"} 
      } else if(userData && userData.polarity === 'dark'){
            return { weight: 0.1 ,fill:"#b87333", opacity: 1, stroke: "#f6cba0"} 
      } else if(userData && userData.polarity === 'clear') {
            return { weight: 0.1 ,fill:"white", opacity: 1, stroke: "white"} 
      } else {
            return { weight: 0.1 ,fill:"#000000", opacity: 1, stroke: "red"} 
      }
       })       
      .data(geojson) 
      .render();
    this.$forceUpdate();
    }
  }
}
</script>

<style scoped>
div >>> svg {
 transform-origin: 50% 50%;
 transform: scale(1,-1);
}
</style>