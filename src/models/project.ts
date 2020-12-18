import { Pcbdb } from "@/typings/pcbdb";
import { Tooldb } from "@/typings/tooldb";
import { IDictionary } from "./dictionary";
import { PcbLayers } from "./pcblayer";


export interface IProjectIsolation {
    layer: string,
    showOutline: boolean,
    useFill: boolean,
    useFillPitch: number,
    toolType: Tooldb | undefined,
    dthickness:number | undefined,
    doutline: number | undefined,
    svg:string | undefined,
    gcode:string | undefined
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
        isolations: IProjectIsolation[]
    }
}