import { IWorkerDataIn, IWorkerDataOut, EWorkerDataTypeIn, EWorkerDataTypeOut, IWorkerDataProgress } from "@/models/workerData";

export abstract class JobWorker<I,O> {

    ctx: Worker;
    inchunks= 0;
    outchunks = 0;

    abstract abort(): void;
    abstract create(data: I): void;
    abstract reset(data: I): void;
    abstract load(data: I): boolean;
    abstract commit(): O|undefined;

    constructor(ctx:Worker) {
        this.ctx = ctx;
        // Respond to message from parent thread
        ctx.addEventListener("message", (event) => {
            // console.log("From main", event)
            const data = event.data as IWorkerDataIn<I>;
            switch (data.type) {
                case EWorkerDataTypeIn.ABORT:
                    this.abort();
                    break
                case EWorkerDataTypeIn.CREATE:
                    this.create(data.data as I);
                    this.inchunks = this.outchunks = 0;
                    break
                case EWorkerDataTypeIn.RESET:
                    this.reset(data.data as I);
                    this.inchunks = this.outchunks = 0;
                    break;
                case EWorkerDataTypeIn.LOAD:
                    if(this.load(data.data as I)){
                        this.inchunks++;
                        this.sendProgress();
                    }
                    break;
                case EWorkerDataTypeIn.COMMIT:
                    const res = this.commit();
                    if(res) ctx.postMessage({ type: EWorkerDataTypeOut.END, data: res });
                    break;
                default:
                    console.error("Unknown worker command!", data);
                    break;
            }
        });
    }

    chunk(data:O):void{
        this.ctx.postMessage({type: EWorkerDataTypeOut.CHUNK, data});
        this.outchunks++;
        this.sendProgress();
    }

    sendProgress():void{
        if(this.inchunks > 0){
            this.ctx.postMessage({type: EWorkerDataTypeOut.PROGRESS, data: {in: this.inchunks, done:this.outchunks} as IWorkerDataProgress});
        }
    }

    info(data:O):void{
        this.ctx.postMessage({type: EWorkerDataTypeOut.INFO, data});
    }

    end(data:O):void{
        this.ctx.postMessage({type: EWorkerDataTypeOut.END, data});
    }

}