import { IModel } from "makerjs";

export interface IPlotterToSvgOption {
    useFill:boolean;
    useFillPitch: number;
}

export interface IPlotterToSvgResult {
    svg: string;
    model: IModel;
}
