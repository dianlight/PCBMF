<template>
  <el-container>
    <el-main>
      <div ref="container" id="container"></div>
    </el-main>
    <el-footer>
      <el-button-group>
        <el-button size="mini" type="primary" icon="el-icon-edit"></el-button>
        <el-button size="mini" type="primary" icon="el-icon-share"></el-button>
        <el-button size="mini" type="primary" icon="el-icon-delete"></el-button>
      </el-button-group>
      {{ camera ? JSON.stringify(camera.position) : "" }}
    </el-footer>
  </el-container>
</template>

<script lang="ts">
//import colornames from "colornames";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
//import { GCodeLoader } from 'three/examples/jsm/loaders/GCodeLoader';
import { CNCGCodeLoader } from "@/loaders/CNCGCodeLoader";
import Component from "vue-class-component";
import Vue from "vue";
import { Prop, PropSync, Watch } from "vue-property-decorator";
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
  @Prop({ type: Number }) readonly width: number | undefined;
  @Prop({ type: Number }) readonly height: number | undefined;
//  @Prop({ type: String, required: true }) readonly data: string | undefined;
  @PropSync("data",{ type: String, required: true }) readonly gcodedata: string | undefined;
  @Prop({ type: Color, default: () => new THREE.Color("red") })
  readonly moveColor!: THREE.Color;
  @Prop({ type: Color, default: () => new THREE.Color("green") })
  readonly cutColor!: THREE.Color;

  cube: THREE.Mesh | null = null;
  renderer: THREE.WebGLRenderer | null = null;
  scene: THREE.Scene | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  controls: OrbitControls | null = null;
  reload: boolean = true;

  @Watch("gcodedata") gcodeChange(newData: string, oldData: string) {
    if (newData != oldData) {
      this.reload = true;
    }
  }


  updated() {
     if(this.gcodedata && this.reload){
       this.reload = false;
      // Load GCode
      const loader = new CNCGCodeLoader();
      //    loader.load("https://threejs.org/examples/models/gcode/benchy.gcode",(object)=>{
      loader.load(
        this.gcodedata,
        {
          cutColor: this.cutColor,
          moveColor: this.moveColor,
        },
        //   "/test/gcode/Gerber_TopLayer.GTL_iso_combined_cnc.nc",
        (object) => {
          //   console.log("Caricato file GCODE");
          object.position.set(0, 0, 0);
          this.scene!.clear();

          const addLight = (x:number,y:number,z:number) => {
            const color = 0xFFFFFF;
            const intensity = 1;
            const light = new THREE.DirectionalLight(color, intensity);
            light.position.set(x,y,z);
            this.scene!.add(light);
          }
          addLight(-1, 2, 4);
          addLight( 1, -1, -2);

          if (this.gcgrid) {
            const axesHelper = new THREE.AxesHelper(5);
            this.scene!.add(axesHelper);

            const gridHelper = new THREE.GridHelper(
              this.width! > this.height!
                ? this.width! * 1.2
                : this.height! * 1.2,
              10
            );
            gridHelper.rotateX(Math.PI / 2);
            //      gridHelper.rotateOnAxis()
            gridHelper.position.y = this.height! / 2;
            gridHelper.position.x = this.width! / 2;
            gridHelper.position.z = 0;
            this.scene!.add(gridHelper);

            this.scene!.add(object);
            this.controls?.update();
            this.render3d();
          }
        }
      );
    }
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("white");

    // Optional Grid
      /*
    if (this.gcgrid) {
      const axesHelper = new THREE.AxesHelper(5);
      this.scene.add(axesHelper);
      const gridHelper = new THREE.GridHelper(
        this.width! > this.height! ? this.width! * 1.2 : this.height! * 1.2,
        10
      );
      gridHelper.rotateX(Math.PI / 2);
      //      gridHelper.rotateOnAxis()
      gridHelper.position.y = this.height! / 2;
      gridHelper.position.x = this.width! / 2;
      gridHelper.position.z = 0;
      this.scene.add(gridHelper);
*/
      /*
const plane = new THREE.Plane( new THREE.Vector3( 0, 0, 0 ), 0 );
const helper = new THREE.PlaneHelper( plane, this.width > this.height?this.width*1.2:this.height*1.2, 0xffff00 );
this.scene.add( helper );     
*/
//    }

    this.camera = new THREE.PerspectiveCamera(
      50,
      (this.$refs.container as HTMLElement).clientWidth /
        (this.$refs.container as HTMLElement).clientHeight,
      0.1,
      1000
    );
    this.camera.position.x = this.width! / 2;
    this.camera.position.y = this.height! / 2;
    this.camera.position.z = this.width! * 1.3;
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

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener("change", this.render3d); // use if there is no animation loop
    this.controls.minDistance = 0.1;
    this.controls.maxDistance = 500;
    this.controls.enablePan = true;
    this.controls.target.x = this.width! / 2;
    this.controls.target.y = this.height! / 2;
    this.controls.target.z = 0.0;

    // Load GCode
    /*

    const loader = new CNCGCodeLoader();
    //    loader.load("https://threejs.org/examples/models/gcode/benchy.gcode",(object)=>{
    loader.load(
      this.$props.data,
   //   "/test/gcode/Gerber_TopLayer.GTL_iso_combined_cnc.nc",
      (object) => {
     //   console.log("Caricato file GCODE");
        object.position.set(0, 0, 0);
        this.scene!.add(object);
        //        controls.target.copy(object.position);
        //        this.camera.lookAt(new THREE.Vector3(1,0,-1));
        //        controls.target.x = this.$store.state.config.pcb.width/-2;
        //        this.camera.translateX(-50);
        //       this.camera.translateZ(100);
        controls.update();
        this.render3d();
      }
    );
*/
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

    this.camera!.aspect =
      (this.$refs.container as HTMLElement).clientWidth /
      (this.$refs.container as HTMLElement).clientHeight;
    this.camera!.updateProjectionMatrix();

    this.renderer!.setSize(
      (this.$refs.container as HTMLElement).clientWidth,
      (this.$refs.container as HTMLElement).clientHeight
    );

    this.render3d();
  }

  render3d() {
    if (this.scene && this.camera)
      this.renderer!.render(this.scene, this.camera);
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

