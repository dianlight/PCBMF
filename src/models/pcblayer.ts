import { FeatureCollection } from 'geojson';
import { GerberSide, GerberType } from 'whats-that-gerber'

export interface PcbLayer { 
    id: number,
    enabled:boolean, 
    name: string,
    filename: string, 
    gerber: Buffer, 
    geoJson: FeatureCollection | undefined,
    type: GerberType | undefined, 
    side: GerberSide | undefined 
}
