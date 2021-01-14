import { Worker as WorkerType } from "threads";
//import { ExposedToThreadType } from "@/utils/workerUtils";

export interface GlobalVarGlobal {
    $application: GlobalVarGlobalApplication,
}

export interface GlobalVarGlobalApplicationProgress {
//    worker: WorkerType | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
//    thread: ExposedToThreadType<any> | undefined,
    abortFunction: (()=>void) | undefined,
    perc: number | undefined
}

export interface GlobalVarGlobalApplication {
    workers:WorkerType[],
    progress: GlobalVarGlobalApplicationProgress,
}