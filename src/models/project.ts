import { Pcbdb } from "@/typings/pcbdb";
import { Tooldb } from "@/typings/tooldb";
import { IDictionary } from "./dictionary";
import { PcbLayers } from "./pcblayer";

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
        isolation: {
            toolType: IDictionary<Tooldb> | undefined,
            dthickness: IDictionary<number> | undefined,
            doutline: IDictionary<number> | undefined,
            json: IDictionary<string> | undefined,
        }
    }
}