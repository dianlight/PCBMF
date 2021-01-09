import * as jsts from "jsts";
import {FeatureCollection, Feature, Geometry} from "geojson";


export function featureCollectionToGeometries(data:FeatureCollection,reader?:jsts.io.GeoJSONReader):jsts.geom.Geometry[]{
    if(!reader)reader = new jsts.io.GeoJSONReader();

    return data.features.reduce( (ret,cur)=>{
        ret.push(reader?.read(cur.geometry) as jsts.geom.Geometry);
        return ret;
    },[] as jsts.geom.Geometry[]);
}

export function geometryToFeature(data:jsts.geom.Geometry,options?:Record<string,string|number|undefined>,writer?:jsts.io.GeoJSONWriter): Feature {
    if(!writer)writer = new jsts.io.GeoJSONWriter();
    return {
        "type": "Feature",
        "properties": {
            "userData": data.getUserData(),
            ...options
        },
        "geometry": writer.write(data) as Geometry
        } as Feature;
}

export function geometriesToFeatures(data:jsts.geom.Geometry[],options?:Record<string,string|number|undefined>,writer?:jsts.io.GeoJSONWriter): Feature[] {
    if(!writer)writer = new jsts.io.GeoJSONWriter();
    return data.map( (geometry)=> geometryToFeature(geometry,options,writer));
}