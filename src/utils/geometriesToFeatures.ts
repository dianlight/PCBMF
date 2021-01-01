import * as jsts from "jsts";
import {GeoJSON, FeatureCollection, Feature, Geometry} from "geojson";
import { IDictionary } from "@/models/dictionary";


export function featureCollectionToGeometries(data:FeatureCollection,reader?:jsts.io.GeoJSONReader):jsts.geom.Geometry[]{
    if(!reader)reader = new jsts.io.GeoJSONReader();

    return data.features.reduce( (ret,cur,index,all)=>{
        ret.push(reader!.read(cur.geometry));
        return ret;
    },[] as jsts.geom.Geometry[]);
}

export function geometryToFeature(data:jsts.geom.Geometry,options?:IDictionary<string|number|undefined>,writer?:jsts.io.GeoJSONWriter): Feature {
    if(!writer)writer = new jsts.io.GeoJSONWriter();
    return {
        "type": "Feature",
        "properties": {
            "userData": data.getUserData(),
            ...options
        },
        "geometry": writer!.write(data) as Geometry
        } as Feature;
}

export function geometriesToFeatures(data:jsts.geom.Geometry[],options?:IDictionary<string|number|undefined>,writer?:jsts.io.GeoJSONWriter): Feature[] {
    if(!writer)writer = new jsts.io.GeoJSONWriter();
    return data.map( (geometry)=> geometryToFeature(geometry,options,writer));
}