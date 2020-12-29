import { Pcbdb } from "@/typings/pcbdb";
import { Tooldb } from "@/typings/tooldb";
import { IDictionary } from "./dictionary";
import { PcbLayers } from "./pcblayer";


export interface IProjectWork {
    layer: string,
    toolType: Tooldb | undefined,
    svg:string | undefined,
    gcode:string | undefined,
    geojson: Object | undefined
}

export interface IProjectCopper extends IProjectWork {
    useFill: boolean,
    useFillPitch: number,
    dthickness:number | undefined,
    dthief: number | undefined,
    thiefmode: 'Brick'|'Column'|'Grid'|'Honeycomb'|'Radial'|'Row'|undefined
}

export interface IProjectIsolation extends IProjectWork {
    showOutline: boolean,
    unionDraw: boolean,
//    useFillPitch: number,
    dthickness:number | undefined,
    doutline: number | undefined,
}

export interface IProjectDrill extends IProjectWork{
    showOutline: boolean,
    dthickness:number | undefined,
    doutline: number | undefined,
}

export interface IProjectOutline extends IProjectWork{
    showOutline: boolean,
    dthickness:number | undefined,
    doutline: number | undefined,
}
export interface IProject {
    currentFile: string | undefined,
    layers: PcbLayers[] | undefined,
    config: {
        useOutline: boolean;
        pcb: {
            blankType: Pcbdb | undefined,
            height: number | undefined,
            width: number | undefined
        },
        isolations: IProjectIsolation[],
        drills: IProjectDrill[],
        outlines: IProjectOutline[],
        coppers: IProjectCopper[],
    }
}