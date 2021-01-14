
import { GlobalVarGlobalApplication } from "@/models/globalVarGlobal";
import { Worker } from "threads";


export interface IProgressiveResult {
    perc: number | undefined;
}

export interface IStoppable {
    stop():void;
}

export class WorkerUtils {

    static prevPerc:number;
    static lastSend: number
    static intervall:NodeJS.Timeout;
    static observer:ZenObservable.SubscriptionObserver<IProgressiveResult>;
    static abort = false;

    static abortWorker(worker: Worker):void{
        console.log("Abort Requested!",worker);
        this.abort = true;
    }

    static updateGlobalDataPogress(global: GlobalVarGlobalApplication, data: IProgressiveResult, stoppable?:IStoppable): void{
        global.progress.perc = data.perc;
        if(stoppable){
            // eslint-disable-next-line @typescript-eslint/unbound-method
            global.progress.abortFunction = stoppable.stop;
        }
    }

    static startProgress(worker: Worker,observer:ZenObservable.SubscriptionObserver<IProgressiveResult>):void{
        console.log("Start Progress...",worker);
        this.observer = observer;
        worker.addEventListener("abort",()=>{
            console.log("Received an abort message!");
            this.abort = true;
        })
    }

    static sendProgress(perc: number):void{
        if(this.abort){
            this.abort = false;
            throw Error("Abort Request!");
        }
        if(Date.now()-this.lastSend < 5)return;
        const nperc = Number(perc.toFixed(2));
        if(this.observer && nperc != this.prevPerc){
            this.observer.next({
                perc: perc
            });
            this.prevPerc = nperc; 
        }        
    }

    static sendCompleted(observer:ZenObservable.SubscriptionObserver<IProgressiveResult>,data: IProgressiveResult):void {
        data.perc=0;
        this.abort = false;
        observer.next(data);
        observer.complete();  
        clearInterval(this.intervall);      
    }

    /*
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static run<Exposed extends WorkerFunction | WorkerModule<any> = ArbitraryWorkerInterface>(application: GlobalVarGlobalApplication, worker: WorkerType, options?: {
        timeout?: number;
    }): Promise<ExposedToThreadType<Exposed>>{
        application.workers.push(worker);
//        console.log(worker);
        return spawn<Exposed>(worker,options).then( (wkrt)=>{ 
            Thread.events(wkrt).subscribe( event => {
//                console.log(event)
                if(event.type === "termination"){
//                    console.log("Fine Thread!",wkrt,worker);
                    application.workers.splice(application.workers.indexOf(worker),1);
                    application.progress.thread=undefined;
                    application.progress.worker=undefined;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion
                } else if (event.type === "message" && (event.data as ThreadProgressData).type === "progress"){
//                    console.log(JSON.stringify(event));
                    application.progress.thread = wkrt;
                    application.progress.worker = worker;
                    application.progress.perc = (event.data as ThreadProgressData).perc;
                }
            });
            return wkrt
        });
    }
*/    

}