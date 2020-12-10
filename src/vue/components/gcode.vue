<template>
  <el-container>
    <el-main>
      <div ref="container" id="container"></div>
    </el-main>
    <el-footer>
      <el-button-group>
        <el-button type="primary" icon="el-icon-edit"></el-button>
        <el-button type="primary" icon="el-icon-share"></el-button>
        <el-button type="primary" icon="el-icon-delete"></el-button>
      </el-button-group>
      {{ camera ? JSON.stringify(camera.position) : "" }}
    </el-footer>
  </el-container>
</template>

<script lang="ts">
//import colornames from "colornames";
//import Toolpath from "gcode-toolpath";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
//import { GCodeLoader } from 'three/examples/jsm/loaders/GCodeLoader';
import { CNCGCodeLoader } from "@/loaders/CNCGCodeLoader";
import Component from "vue-class-component";
import Vue from "vue";
import { Prop } from "vue-property-decorator";
import { Color, Vector3 } from "three";
//import log from 'app/lib/log';
//import Vue from "vue/types/umd";

/*
const defaultColor = new THREE.Color(colornames("lightgrey"));
*/
/*
const motionColor = {
  G0: new THREE.Color(colornames("green")),
  G1: new THREE.Color(colornames("blue")),
  G2: new THREE.Color(colornames("deepskyblue")),
  G3: new THREE.Color(colornames("deepskyblue")),
};
*/

@Component({
  name: "GCode",
})
export default class GCode extends Vue {
  @Prop({ type: Boolean, default: "true" }) readonly gcgrid!: boolean;
  @Prop({ type: Number }) readonly width: number;
  @Prop({ type: Number }) readonly height: number;
//  @Prop({ type: ArrayBuffer}) readonly gcode: ArrayBuffer;
//  @Prop({ type: Color, default: new THREE.Color("white")}) readonly moveColor: THREE.Color;
//  @Prop({ type: Color, default: new THREE.Color("yellow")}) readonly isolationColor: THREE.Color;


  cube: THREE.Mesh = null;
  renderer: THREE.WebGLRenderer = null;
  scene: THREE.Scene = null;
  camera: THREE.PerspectiveCamera = null;

  init() {
    this.scene = new THREE.Scene();

    // Optional Grid
    if (this.gcgrid) {
      const axesHelper = new THREE.AxesHelper(5);
      this.scene.add(axesHelper);

/*
      const dir = new THREE.Vector3(0, 1, 0);
      //normalize the direction vector (convert to vector of length 1)
      dir.normalize();
      const origin = new THREE.Vector3(0, 0, 0);
      const length = 10;
      const hex = 0xffff00;
      const arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
      this.scene.add(arrowHelper);
*/

      const gridHelper = new THREE.GridHelper(
        this.width > this.height ? this.width * 1.2 : this.height * 1.2,
        10
      );
      gridHelper.rotateX(Math.PI/2);
      //      gridHelper.rotateOnAxis()
      gridHelper.position.y = this.height / 2;
      gridHelper.position.x = this.width / 2;
      gridHelper.position.z = 0;
      this.scene.add(gridHelper);

      /*
const plane = new THREE.Plane( new THREE.Vector3( 0, 0, 0 ), 0 );
const helper = new THREE.PlaneHelper( plane, this.width > this.height?this.width*1.2:this.height*1.2, 0xffff00 );
this.scene.add( helper );     
*/
    }

    this.camera = new THREE.PerspectiveCamera(
      50,
      (this.$refs.container as HTMLElement).clientWidth /
        (this.$refs.container as HTMLElement).clientHeight,
      0.1,
      1000
    );
    this.camera.position.x = this.width / 2;
    this.camera.position.y = this.height / 2;
    this.camera.position.z = this.width * 1.3;
    //  this.camera.lookAt(new Vector3(this.width/2,this.height/2,0));
    this.camera.updateProjectionMatrix();

    // WebGL
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
//    console.log(
//      (this.$refs.container as HTMLElement).clientWidth,
//      (this.$refs.container as HTMLElement).clientHeight
//    );
    this.renderer.setSize(
      (this.$refs.container as HTMLElement).clientWidth,
      (this.$refs.container as HTMLElement).clientHeight
    );
    (this.$refs.container as HTMLElement).appendChild(this.renderer.domElement);

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.addEventListener("change", this.render3d); // use if there is no animation loop
    controls.minDistance = 0.1;
    controls.maxDistance = 500;
    controls.enablePan = true;
    controls.target.x = this.width / 2;
    controls.target.y = this.height / 2;
    controls.target.z = 0.0;

    // Load GCode

    const loader = new CNCGCodeLoader();
    //    loader.load("https://threejs.org/examples/models/gcode/benchy.gcode",(object)=>{
    loader.load(
      "/test/gcode/Gerber_TopLayer.GTL_iso_combined_cnc.nc",
      (object) => {
     //   console.log("Caricato file GCODE");
        object.position.set(0, 0, 0);
        this.scene.add(object);
        //        controls.target.copy(object.position);
        //        this.camera.lookAt(new THREE.Vector3(1,0,-1));
        //        controls.target.x = this.$store.state.config.pcb.width/-2;
        //        this.camera.translateX(-50);
        //       this.camera.translateZ(100);
        controls.update();
        this.render3d();
      }
    );

    /*
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);
    */

    window.addEventListener("resize", this.resize, false);

    //    this.camera.position.z = 5;
    //    this.camera.position.x = 0;
    //    this.camera.position.z = 0;
    //    this.render3d();

    //  const animate = function () {};
  }

  resize(event: Event) {
    //  console.log("State",state,this,this.$refs);

    this.camera.aspect =
      (this.$refs.container as HTMLElement).clientWidth /
      (this.$refs.container as HTMLElement).clientHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(
      (this.$refs.container as HTMLElement).clientWidth,
      (this.$refs.container as HTMLElement).clientHeight
    );

    this.render3d();
  }

  render3d() {
    this.renderer.render(this.scene, this.camera);
  }

  animate() {
    /*
    requestAnimationFrame(this.animate);

    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.01;

    this.renderer.render(this.scene, this.camera);
    */
  }

  mounted() {
    this.init();
    //this.animate();
  }
}
</script>

<style scoped>
#container {
  height: 100%;
  min-height: 20em;
  width: 100%;
}
</style>

