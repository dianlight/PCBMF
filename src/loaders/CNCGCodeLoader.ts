import { TouchBarScrubber } from 'electron';
import {
	LoadingManager,
	BufferGeometry,
	Euler,
	FileLoader,
	Float32BufferAttribute,
	Group,
	LineBasicMaterial,
	LineSegments,
	Loader,
	Color,
	MeshPhongMaterial
} from 'three';

export interface GCodeState {
 [index:string] : any,	
 x?: number, y?: number, z?: number, e?: number, f?: number, relative?: boolean 
}

export interface GCodeLayer {
 vertex?: number[], pathVertex?: number[], z?: number
}


export class CNCGCodeLoader extends Loader {

	splitLayer: boolean;
	cutColor: THREE.Color = new Color(0xFFFF99);
	moveColor: THREE.Color = new Color(0x00FF00);

	constructor(manager?: LoadingManager) {
		super();
		Loader.call(this, manager);
		this.splitLayer = false;
	}

	load(data: string, options: {
		cutColor: THREE.Color,
		moveColor: THREE.Color,
	}, onLoad: (object: Group) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void {

		this.cutColor = options.cutColor;
		this.moveColor = options.moveColor;
		var scope = this;
		onLoad(scope.parse(data));

/*
		var loader = new FileLoader(scope.manager);
		loader.setPath(scope.path);
		loader.setRequestHeader(scope.requestHeader);
		loader.setWithCredentials(scope.withCredentials);
		loader.load(url, (text) => {
			try {
				onLoad(scope.parse(text as string));
			} catch (e) {
				if (onError) {
					onError(e);
				} else {
					console.error(e);
				}
				scope.manager.itemError(url);
			}
		}, onProgress, onError);
*/		
	}	

	parse(data: string): Group {

		let state:GCodeState = { x: 0, y: 0, z: 0, e: 0, f: 0, relative: false };
		var layers:GCodeLayer[] = [];

		var currentLayer:GCodeLayer|undefined = undefined;

		//var pathMaterial = new LineBasicMaterial( { color: 0xFFFF99 } );
		const pathMaterial = new MeshPhongMaterial({
			color: this.moveColor,
			opacity: 0.5,
			transparent: true,
		  });
		pathMaterial.name = 'path';

		var extrudingMaterial = new LineBasicMaterial( { color: this.cutColor } );
		extrudingMaterial.name = 'extruded';

		function newLayer( line:GCodeState ) {
			currentLayer = { vertex: [], pathVertex: [], z: line.z };
			layers.push( currentLayer );
		}

		//Create lie segment between p1 and p2
		function addSegment( p1:GCodeState, p2:GCodeState ) {
			if ( currentLayer === undefined ) {
				newLayer( p1 );
			}

			if(p1.x && p1.y && p1.z && p2.x && p2.y && p2.z )
			if ( p1.z < 0 && p2.z < 0 ) {
				currentLayer?.vertex?.push( p1.x, p1.y, p1.z );
				currentLayer?.vertex?.push( p2.x, p2.y, p2.z );
			} else {
				currentLayer?.pathVertex?.push( p1.x, p1.y, p1.z );
				currentLayer?.pathVertex?.push( p2.x, p2.y, p2.z );
			}
		}

		/*
		function delta( v1:number, v2:number ) {
			return state.relative ? v2 : v2 - v1;
		}
		*/

		function absolute( v1:number|undefined, v2:number|undefined ) {
			if(v1 === undefined)return v2;
			if(v2 === undefined)return v1;
			return state.relative ? v1 + v2 : v2;
		}

		var lines = data.replace( /;.+/g, '' ).split( '\n' );

		for ( var i = 0; i < lines.length; i ++ ) {
		//	console.log(lines[i]);
			var tokens = lines[ i ].split( ' ' );
			var cmd = tokens[ 0 ].toUpperCase();

			//Argumments
			var args:GCodeState = {};
			tokens.splice( 1 ).forEach( ( token ) => {

				if ( token[ 0 ] !== undefined ) {

					var key = token[ 0 ].toLowerCase();
					var value = parseFloat( token.substring( 1 ) );
					args[ key ] = value;
			//		if(key == 'z')console.log(key,value);

				}

			} );

			//Process commands
			if (cmd[0]==='(' || cmd === '') {
				// Comment or empty line
			} else if ( cmd === 'G0' || cmd === 'G1' || cmd === 'G00' || cmd === 'G01' ) {
				//G0/G1 – Linear Movement
			//	console.debug("->",args);
				var line:GCodeState = {
					x: args.x !== undefined ? absolute( state.x, args.x ) : state.x,
					y: args.y !== undefined ? absolute( state.y, args.y ) : state.y,
					z: args.z !== undefined ? absolute( state.z, args.z ) : state.z,
					e: args.e !== undefined ? absolute( state.e, args.e ) : state.e,
					f: args.f !== undefined ? absolute( state.f, args.f ) : state.f,
				};

				//Layer change detection is or made by watching Z, it's made by watching when we extrude at a new Z position
			/*
				if ( delta( state.e, line.e ) > 0 ) {

					line.extruding = delta( state.e, line.e ) > 0;

					if ( currentLayer == undefined || line.z != currentLayer.z ) {

						newLayer( line );

					}
				}
			*/	
				addSegment( state, line );
				state = line;
			} else if ( cmd === 'G2' || cmd === 'G3' || cmd === 'G02' || cmd === 'G03' ) {
				//G2/G3 - Arc Movement ( G2 clock wise and G3 counter clock wise )
				console.warn( 'THREE.GCodeLoader: Arc command not supported' );
			} else if ( cmd === 'G90' ) {
				//G90: Set to Absolute Positioning
				state.relative = false;
			} else if ( cmd === 'G91' ) {
				//G91: Set to state.relative Positioning
				state.relative = true;
			} else if ( cmd === 'G92' ) {
				//G92: Set Position
				var line = state;
				line.x = args.x !== undefined ? args.x : line.x;
				line.y = args.y !== undefined ? args.y : line.y;
				line.z = args.z !== undefined ? args.z : line.z;
				line.e = args.e !== undefined ? args.e : line.e;
				state = line;
			} else {
				console.warn( 'THREE.GCodeLoader: Command not supported:' + cmd );
			}
		}

		//console.info(state);

		function addObject( vertex:number[]|undefined, extruding:boolean ) {
			if(vertex === undefined)return;
			var geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new Float32BufferAttribute( vertex, 3 ) );

			var segments = new LineSegments( geometry, extruding ? extrudingMaterial : pathMaterial );
			segments.name = 'layer' + i;
			object.add( segments );
		}

		var object = new Group();
		object.name = 'gcode';

		if ( this.splitLayer ) {
			for ( var i = 0; i < layers.length; i ++ ) {
				var layer:GCodeLayer = layers[ i ];
				addObject( layer.vertex, true );
				addObject( layer.pathVertex, false );
			}
		} else {
			var vertex:number[] = [], pathVertex:number[] = [];

			for ( var i = 0; i < layers.length; i ++ ) {
				var layer = layers[ i ];
				var layerVertex = layer.vertex;
				var layerPathVertex = layer.pathVertex;

				for ( var j = 0; j < layerVertex!.length; j ++ ) {

					vertex.push( layerVertex![ j ] );

				}

				for ( var j = 0; j < layerPathVertex!.length; j ++ ) {

					pathVertex.push( layerPathVertex![ j ] );

				}
			}

			addObject( vertex, true );
			addObject( pathVertex, false );
		}

		//object.quaternion.setFromEuler( new Euler( - Math.PI / 2, 0, 0 ) );

		return object;

	}
}
