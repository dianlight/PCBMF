import { GerberSide, GerberType } from 'whats-that-gerber'

export interface PcbLayers { 
    id: number,
    enabled:boolean, 
    name: string,
    filename: string, 
    gerber: Buffer, 
    type: GerberType | undefined, 
    side: GerberSide | undefined 
}
