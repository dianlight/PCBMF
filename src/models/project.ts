import { Pcbdb } from "@/typings/pcbdb";
import { Tooldb } from "@/typings/tooldb";
import { IDictionary } from "./dictionary";
import { PcbLayer } from "./pcblayer";
import { OutlineWorkMode } from "@/workers/outlineWork";
import { ThiefWorkMode } from "@/workers/thiefWork";


export type MarginType = "Envelope"|"Board"|"ConvexHull";

export interface IProjectWork {
    layer: string,
    svg:string | undefined,
    gcode:string | undefined,
    geojson: Object | undefined
}

export interface IProjectCopper extends IProjectWork {
    unionDraw: boolean,
    toolTypes: Tooldb[] | undefined,
    dthickness:number | undefined,
    toolCycles: number | undefined,
    mode: ThiefWorkMode |undefined,
    margin: MarginType | undefined
}

export interface IProjectIsolation extends IProjectWork {
    showOutline: boolean,
    toolType: Tooldb | undefined,
    unionDraw: boolean,
//    useFillPitch: number,
    dthickness:number | undefined,
    doutline: number | undefined,
}

export interface IProjectDrill extends IProjectWork{
    showOutline: boolean,
    toolType: Tooldb | undefined,
    dthickness:number | undefined,
    doutline: number | undefined,
}

export interface IProjectOutline extends IProjectWork{
    showOutline: boolean,
    toolType: Tooldb | undefined,
    dthickness:number | undefined,
    doutline: number | undefined,
    mode: OutlineWorkMode | undefined,
    scale: number | undefined,
}
export interface IProject {
    md5: string | undefined,
    basedir: string | undefined,
    name: string | undefined,
    layers: PcbLayer[] | undefined,
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