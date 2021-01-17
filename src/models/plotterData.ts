export enum IPlotterDataTypes {
    POLARITY="polarity",
    LINE="line",
    RECT="rect",
    PAD="pad",
    STROKE="stroke",
    FILL="fill",
    SHAPE="shape",
    SIZE="size",
    CIRCLE="circle",
    ARC="arc",
    POLY="poly",
}
export interface IPlotterData {
    type: string;
}

export interface IPlotterDataPoly extends IPlotterData {
    type: IPlotterDataTypes.POLY,
    points: [[number,number]]
}

export interface IPlotterDataPolarity extends IPlotterData {
    type: IPlotterDataTypes.POLARITY,
    polarity: "dark"|"clear",
    box: number[]
}

export interface IPlotterDataSize extends IPlotterData {
    type: IPlotterDataTypes.SIZE,
    box: number[],
    units: "mm"|"in"
}

export interface IPlotterDataLine extends IPlotterData {
    type: IPlotterDataTypes.LINE,
    start: number[],
    end: number[]
}

export interface IPlotterDataRect extends IPlotterData {
    type: IPlotterDataTypes.RECT,
    cx: number,
    cy: number,
    r: number,
    width: number,
    height: number
}

export interface IPlotterDataCircle extends IPlotterData {
    type: IPlotterDataTypes.CIRCLE,
    cx: number,
    cy: number,
    r: number,
}

export interface IPlotterDataArc extends IPlotterData {
    type: IPlotterDataTypes.ARC,
    start: [number,number,number],
    end: [number,number,number],
    center: [number,number]
    radius: number,
    sweep: number,
    dir: "cw"|"ccw",
}

export interface IPlotterDataPad extends IPlotterData {
    type: IPlotterDataTypes.PAD,
    tool: number
    x: number,
    y: number
}

export interface IPlotterDataStroke extends IPlotterData {
    type: IPlotterDataTypes.STROKE,
    width: number,
    path: IPlotterDataLine[]
}
  
export interface IPlotterDataFill extends IPlotterData {
    type: IPlotterDataTypes.FILL,
    width: number,
    path: IPlotterDataLine[]
}

export interface IPlotterDataShape extends IPlotterData {
    type: IPlotterDataTypes.SHAPE,
    tool: number,
    shape: IPlotterDataRect[]
}


