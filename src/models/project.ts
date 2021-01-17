import { Pcbdb } from "@/typings/pcbdb";
import { Tooldb } from "@/typings/tooldb";
import { PcbLayer } from "./pcblayer";
import { OutlineWorkMode } from "@/workers/outlineWork";
import { ThiefWorkMode } from "@/workers/thiefWork";
import { FeatureCollection } from "geojson";


export type MarginType = "Envelope"|"Board"|"ConvexHull";

export interface IProjectWork {
    layer: string,
    svg:string | undefined,
    gcode:string | undefined,
    geojson: FeatureCollection | undefined
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
//    showOutline: boolean,
    toolType: Tooldb | undefined,
//    unionDraw: boolean,
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
        blankType: Pcbdb | undefined,
        pcbSize: {
            y: number | undefined,
            x: number | undefined
        },
        isolations: Record<string,IProjectIsolation>,
        drills: Record<string,IProjectDrill>,
        outlines: Record<string,IProjectOutline>,
        coppers: Record<string,IProjectCopper>,
    }
}