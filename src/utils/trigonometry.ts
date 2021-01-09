
// Based on https://forum.electricunicycle.org/topic/11205-milling-pcbs-with-cheap-chinese-desktop-cnc-router/
export function getTipDiamaterForVTool(tipdiameter:number, bitdegrees:number, depthofcut: number): number{
    const ret = tipdiameter+2*Math.tan((bitdegrees*Math.PI/180)/2)*depthofcut;
    //console.log("New Tockness is:",tipdiameter,bitdegrees,depthofcut,ret);
    return ret;
} 