import WebpackWorker from "*.worker";
import { IWorkerDataIn, IWorkerDataOut, EWorkerDataTypeIn, EWorkerDataTypeOut, IWorkerDataProgress } from "@/models/workerData";

export interface IGerberToSvgOption {
}

export interface IGerberToSvgResult {
    svg: string;
}

export abstract class JobWorkerClient<I, O> {

    worker: WebpackWorker;


    abstract chunk(data: I): void;
    abstract progress(loaded: number, done: number): void;
    abstract info(data: I): boolean;
    abstract end(data: I): void

    constructor(worker: WebpackWorker, initialData: O) {
        this.worker = worker;
        worker.onmessage = (event) => {
            //  console.log("From Render Warker!", event);
            const data = event.data as IWorkerDataOut<I>;
            if (data.type === EWorkerDataTypeOut.END) {
                this.end(data.data as I);
            } else if (data.type === EWorkerDataTypeOut.CHUNK) {
                this.chunk(data.data as I);
            } else if (data.type === EWorkerDataTypeOut.INFO) {
                this.info(data.data as I);
            } else if (data.type === EWorkerDataTypeOut.PROGRESS) {
                this.progress((data.data as IWorkerDataProgress).in, (data.data as IWorkerDataProgress).done);
            } else {
                console.error("Invalid message from worker!", data);
            }
        };
        worker.postMessage({ type: EWorkerDataTypeIn.CREATE, data: initialData });
    }

    load(data: O):void{
       this.worker.postMessage({ type: EWorkerDataTypeIn.LOAD, data: data });
    }

    abort():void {
        this.worker.postMessage({ type: EWorkerDataTypeIn.ABORT });
    }

    reset(data: O):void{
        this.worker.postMessage({ type: EWorkerDataTypeIn.RESET, data: data });
    }

    commit():void{
        this.worker.postMessage({ type: EWorkerDataTypeIn.COMMIT });
    }
}