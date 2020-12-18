<template>
  <el-container>
    <el-main>
      <div ref="container" id="container"></div>
    </el-main>
    <!--
    <el-footer>
      <el-button-group>
        <el-button size="mini" type="primary" icon="el-icon-edit"></el-button>
        <el-button size="mini" type="primary" icon="el-icon-share"></el-button>
        <el-button size="mini" type="primary" icon="el-icon-delete"></el-button>
      </el-button-group>
      {{ camera ? JSON.stringify(camera.position) : "" }}
    </el-footer>
    -->
  </el-container>
</template>

<script lang="ts">
//import colornames from "colornames";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Component from "vue-class-component";
import Vue from "vue";
import { Prop, PropSync, Watch } from "vue-property-decorator";
import { BufferGeometry, Color, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, MeshPhongMaterial, Vector3 } from "three";
import Toolpath, { Modal, Position } from "gcode-toolpath";

@Component({
  name: "GCode",
})
export default class GCode extends Vue {
  @Prop({ type: Boolean, default: "true" }) readonly gcgrid!: boolean;
  @Prop({ type: Number }) readonly width: number | undefined;
  @Prop({ type: Number }) readonly height: number | undefined;
  @PropSync("data",{ type: String, required: true, default:"" }) readonly gcodedata: string | undefined;
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
      this.$data.reload = true;
    }
  }

//  ready(){
//     console.log("READY EVENT!");
//  }


  updated() {
     console.log("GCODE UPDATE EVENT!");
     if(this.gcodedata && this.reload){
      this.reload = false;

      //var pathMaterial = new LineBasicMaterial( { color: 0xFFFF99 } );
      const pathMaterial = new MeshPhongMaterial({
        color: this.moveColor,
        opacity: 0.5,
        transparent: true,
        });
      pathMaterial.name = 'path';

      var extrudingMaterial = new LineBasicMaterial( { color: this.cutColor } );
      extrudingMaterial.name = 'extruded';

      var currentLayer:{
        vertex:any[],
        pathVertex:any[]
      } = {
        vertex:[],
        pathVertex:[]
      }; 

      const object = new Group();
		  object.name = 'gcode';


      const addObject = (name:string,  vertex:number[]|undefined, extruding:boolean ) => {
        if(vertex === undefined)return;
        var geometry = new BufferGeometry();
        geometry.setAttribute( 'position', new Float32BufferAttribute( vertex, 3 ) );

        var segments = new LineSegments( geometry, extruding ? extrudingMaterial : pathMaterial );
        segments.name = name;
        object.add( segments );
      }

      const toolPath = new Toolpath({
        "position": [0,0,0],
        "modal": {
          distance: 'G90',
        },
        "addLine": (modal,p1,p2)=>{
        //  console.log("Line",p1,p2);
          if ( (p1 as Position).z < 0 && (p2 as Position).z < 0 ) {
            currentLayer?.vertex?.push( (p1 as Position).x, (p1 as Position).y, (p1 as Position).z );
            currentLayer?.vertex?.push( (p2 as Position).x, (p2 as Position).y, (p2 as Position).z );
          } else {
            currentLayer?.pathVertex?.push( (p1 as Position).x, (p1 as Position).y, (p1 as Position).z );
            currentLayer?.pathVertex?.push( (p2 as Position).x, (p2 as Position).y, (p2 as Position).z );
          }
        },
        "addArcCurve": (modal,start,end,center)=>{
          console.warn("Arc not implemented",modal,start,end,center);
          /*
          const s = start as Position;
          const e = end as Position;
          const c = center as Position;
          const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(s.x,s.y,s.z),
            new THREE.Vector3(c.x,c.y,c.z),
            new THREE.Vector3(e.x,e.y,e.z)
          );
          if ( (start as Position).z < 0 && (end as Position).z < 0 ) {
            console.log("->",curve.getPoints());
            currentLayer?.vertex?.push( curve.getPoints(10) );
          } else {
            console.log("->",curve.getPoints());
            currentLayer?.pathVertex?.push( curve.getPoints(10) );
          }
          */
        }
      });

      toolPath.loadFromString(this.gcodedata,(err,data)=>{
        console.log(err,data);

          addObject("cut_layer",currentLayer.vertex,true);
          addObject("path_layer",currentLayer.pathVertex,false);

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
      });
    }
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("white");

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

    window.addEventListener("resize", this.resize, false);
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
    this.$forceUpdate();  
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

