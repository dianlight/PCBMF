import { GerberSide, GerberType } from 'whats-that-gerber'

export interface PcbLayers { 
    enabled:boolean, 
    filename: string, 
    gerber: Buffer, 
    type: GerberType | undefined, 
    side: GerberSide | undefined 
}
