// Generate GCode instructions
import * as jsts from "jsts";

export interface IGCodePosition {
    x?: number,
    y?: number,
    z?: number,
}

export interface IGCodeArchPosition extends IGCodePosition {
    i: number,
    j: number
}

export interface IGCodeParserOptions {
    name:string, 
    start:IGCodePosition,
    finish:IGCodePosition,
    unit: 'mm'|'in',
    positioning: 'absolute'|'relative', 
    feedrate: number, 
    clearance: number, 
    lines: boolean,
    precision: number
}

export interface IGCodeState {
  running: boolean
  position: IGCodePosition
  feedrate: number
}

export class GCodeParser {

    code:string[] = [];
    line:number;
    state: IGCodeState = {
        running: false,
        position: {
            x:Infinity,
            y:Infinity,
            z:Infinity
        },
        feedrate: -Infinity
    }

    options:IGCodeParserOptions;

    // Create an instance of GCode
    constructor(options:IGCodeParserOptions = {
        name: "<random>",
        start: {x:0,y:0},
        finish: {x:0,y:0},
        unit: 'mm',
        lines: true,
        positioning: 'relative',
        clearance: 10,
        feedrate: 50,
        precision: 4
    }) {
      this.options = options;  
  
  
      // Define the current line number (disables if lines are set to off)
      this.line = (this.options.lines == false) ? 0 : 1;
  
      // Define the name of the code (random three number name if unset)
      this.options.name = (options.name) ? options.name.toUpperCase() : `00${(Math.random() * 1000).toFixed(0)}`.slice(-3);
  
      // Define the unit to use (default is cm)
//      this.options.unit = (options.unit) ? options.unit.toLowercase() : 'cm';
  
      // Define the positioning to use (absolute by default)
//      this.positioning = (positioning) ? positioning : 0;
  
      // Define the clearance (10cm default)
//      this.clearance = (clearance) ? clearance : 10;
  
      // Define the feedrate (50cm / minute)
//      this.feedrate = (feedrate) ? feedrate : 50;
  
      // Define the start position (clearance unscaled here)
      if(!this.options.start.z) this.options.start.z = options.clearance;
  
      // Define the finish position (clearance unscaled here)
      if(!this.options.finish.z) this.options.finish.z = options.clearance;
  
      // Define the state [0 off, 1 running]
      //this.state.position = this.options.start;
  
      // Startup now that all the variables are configured
      this.initialize();
    }
  
    // Startup the code and make the first moves
    initialize() {
  
      // Add an opening tag to the code
      this.add(`%`);
  
      // Add the script name
      this.add(this.opCode(`O`, this.options.name));
  
      // Add code for which unit system to use (mm or inches)
      this.add(this.opCode(`G`, (this.options.unit == 'in') ? '20' : '21'));
  
      // Add code for the type of positioning being used
      this.setPositioning(this.options.positioning);
  
      // Set the state to on
      this.state.running=true;
      this.state.feedrate=this.options.feedrate;
  
      // Raise the mill above the clearance
      this.raiseMill();
  
      // Feed rapidly to the start position
      this.feedRapid(this.options.start, this.options.feedrate);
    }
  
    // Applying the positioning (absolute or relative)
    setPositioning(positioning:string) {
  
      // Convert the value to a lowercase string
      positioning = String(positioning).toLowerCase();
    
      // Add the positioning code
      this.add(this.opCode(`G`, (positioning == 'absolute') ? `90` : `91`));
    }
  
    // Apply the scale based on the units
    /*
    scale(number:number) {
  
      // Scale the number in centimeters
      if (this.unit == 'cm') return (number * 10);
  
      // Scale the number in decimeters
      if (this.unit == 'dm') return (number * 100);
  
      // Scale the number in meters
      if (this.unit == 'm') return (number * 1000);
  
      // Return the number as scale is mm or inches
      return number;
    }
    */
  
    // Derive the coordinate words from a position { x, y, z } or [ x, y, z ]
    
    positionCode(position:IGCodePosition | IGCodeArchPosition) {
  
      // Create a list of positions
      const positions:string[] = [];
  
      // Return the position words
      if (position.x !== undefined && position.x != this.state.position.x) {
          positions.push(`X${position.x.toFixed(this.options.precision)}`);
          this.state.position.x = position.x;
      }
  
      // If there is an y coordinate then add it to the positions
      if (position.y !== undefined && position.y != this.state.position.y){
        positions.push(`Y${position.y.toFixed(this.options.precision)}`);
        this.state.position.y = position.y;
      } 
  
      // If there is an z coordinate then add it to the positions
      if (position.z !== undefined && position.z != this.state.position.z){
        positions.push(`Z${position.z.toFixed(this.options.precision)}`);
        this.state.position.z = position.z;
      } 

      /* Missing target position calc!
      // If there is an i coordinate then add it to the positions
      if ((position as IGCodeArchPosition).i !== undefined){
        positions.push(`I${(position as IGCodeArchPosition).i.toFixed(this.options.precision)}`);
      } 

      // If there is an j coordinate then add it to the positions
      if ((position as IGCodeArchPosition).j !== undefined){
        positions.push(`J${(position as IGCodeArchPosition).j.toFixed(this.options.precision)}`);
      } 
      */

      return positions.join(` `);
    }
    
  
    // Optcode
    opCode(opt:string, code:number|string) {
  
      // Return the optcode (e.g.)
      return (`${opt}${code}`);
    }
  
    // Derive the feedrate word from a feedrate (mm/minute)
    feedrateCode(feedrate = 50):string {

        if(feedrate == this.state.feedrate)return "";

        this.state.feedrate = feedrate;

      // Return the feedrate word
//      return this.opCode(`F`, this.scale(feedrate));
        return this.opCode(`F`, feedrate);
    }
  
    // Drop the mill to a specified depth (0 by default)
    dropMill(depth:number = 0) {
  
      // Add the code to drop the mill
      this.feedRapid({z: depth });
    }
  
    // Raise the mill to a specified depth (clearence value by default)
    raiseMill(depth:number = this.options.clearance) {
  
      // Add the code to raise the mill
      this.feedRapid({z: depth });
    }
  
    // Start the spindle in a direction (clockwise by default)
    startSpindle(clockwise = true) {
  
      // Add the code to the stack to start the spindle in a specified direction
      this.add(this.opCode(`M`, ((clockwise) ? `03` : `04`)));
    }
  
    // Stop the spindle
    stopSpindle() {
  
      // Add the code to the stack to stop the spindle
      this.add(this.opCode(`M`, `05`));
    }
  
    // Start the coolant with a certain intensity (false by default)
    startCoolant(flood = false) {
  
      // Add the code to the stack to start the coolant
      this.add(this.opCode(`M`, ((flood) ? `08` : `07`)));
    }
    
    // Stop the coolant
    stopCoolant() {
    
      // Add the code to the stack to stop the coolant
      this.add(this.opCode(`M`, `09`));
    }
  
    // Motion in a specified way towards a point
    
    motion(code: string, position: IGCodePosition | IGCodeArchPosition, feedrate: number) {
/*
      this.state.feedrate = feedrate;
      if(position.x)this.state.position.x = position.x;
      if(position.y)this.state.position.y = position.y;
      if(position.z)this.state.position.z = position.z;  
      if((position as IGCodeArchPosition).i){
        // FIXME: Need correct calc  
       // this.state.position.x += (position as IGCodeArchPosition).i;
      } 
      if((position as IGCodeArchPosition).j){
        // FIXME: Need correct calc  
       // this.state.position.y += (position as IGCodeArchPosition).j;
      } 
*/      
        // Add the code to the stack to feed to the specified position
      const param = `${this.positionCode(position)} ${this.feedrateCode(feedrate)}`.trim();  
      if(param.length > 0)this.add(`${this.opCode(`G`, code)} ${param}`);
    }
    
  
    // Feed rapidly to a position at a specified feedrate
    feedRapid(position:IGCodePosition, feedrate:number = this.state.feedrate, optimize:boolean = true) {
      if(optimize &&
        position.x?.toFixed(this.options.precision) === this.state.position.x?.toFixed(this.options.precision) &&
        position.y?.toFixed(this.options.precision) === this.state.position.y?.toFixed(this.options.precision)        
        )return;
      
      if(!position.z && this.state.position.z?.toFixed(this.options.precision) !== this.options.clearance?.toFixed(this.options.precision)){
        this.motion('00',{z: this.options.clearance},feedrate);
        position.z = undefined;
      } else if(position.z && position.z?.toFixed(this.options.precision) !== this.state.position.z?.toFixed(this.options.precision)){
        this.motion('00',{z: position.z},feedrate);
        position.z = undefined;
      } 
        
      // Add the code to feed rapidly to the position
      this.motion(`00`, position, feedrate);
    }
  
    // Feed linearly to a position at a specified feedrate
    feedLinear(position:IGCodePosition, feedrate:number = this.state.feedrate) {
      // Add the code to the stack to linearly to the specified position
      if(position.z && position.z?.toFixed(this.options.precision) !== this.state.position.z?.toFixed(this.options.precision)){
          this.motion('00',{z: position.z},feedrate);
          position.z = undefined;
      }
      this.motion(`01`, position, feedrate);
    }

    // Feed linearly to a position at a specified feedrate
    feedArch(position:IGCodeArchPosition, feedrate:number = this.state.feedrate) {
      console.warn("Arch not yet implemented!");
      /*
        // check arch direction 02 = clock
        if(position.z && position.z != this.state.position.z){
          this.motion('00',{z: position.z},feedrate);
          position.z = undefined;
        }
        if( position.i > 0){
            this.motion(`03`, position, feedrate);
        } else {
            this.motion('02', position, feedrate);
        }
        */
      }

    getState():IGCodeState {
      return this.state;
    }  
      
    // Terminate our code and ensure everything is stopped
    terminate(force = false) {
  
      // Check that the code is not force stopping
      if (!force) {
  
        // Stop the spindle
        this.stopSpindle();
  
        // Stop the coolant
        this.stopCoolant();
  
        // Raise the mill above the clearence
        this.raiseMill();
      }
  
      // Force stop or rewind the program
      this.add(this.opCode(`M`, (force) ? `00` : `30`));
  
      // Toggle the state to off
      this.state.running = false;
    }
  
    // Toggle the current state
    /*
    toggleState() {
  
      // Update the state to the opposite of what it is currently
      this.state = !this.state;
    }
    */
  
    // Add the code to the stack
    add(code:string) {
      
      // Deterimine whether to add a line number or not
      if (this.line && (code.charAt(0) != (`%`) && code.charAt(0) != `O`)) {
      
        // Add a line number before the section
        code = `${this.opCode(`N`, `00${this.line}`.slice(-3))} ${code}`;
  
        // Increment the line count
        this.line++;
      }
  
      // Add the code specified to the code stack
      this.code.push(code);
    }
  
    // Evaluate the gcode
    eval() {
  
      // Check if the code has been terminate, and if not then terminate
      if (this.state.running) this.terminate();
  
      // Add the closing tag
      this.add(`%`);
  
      // Return the code as a string
      return this.code.join(`\n`);
    }
  
    // Return the same output as the eval function
    toString() {
      return this.eval();
    }

    parse(geometry: jsts.geom.Geometry,cut_deep:number): void{
      this.feedRapid(geometry.getCoordinate());
      geometry.getCoordinates().forEach( coordinate => {
        this.feedLinear({
          x: coordinate.x,
          y: coordinate.y,
          z: -cut_deep,
        })
      }); 
    }

  }