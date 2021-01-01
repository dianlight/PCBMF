export enum EWorkerDataTypeIn {
    CREATE,
    LOAD,
    ABORT,
    RESET,
    COMMIT
}

export enum EWorkerDataTypeOut {
    CHUNK,
    PROGRESS,
    INFO,
    END
}

export interface IWorkerDataProgress {
    in: number,
    done: number,
}

export interface IWorkerDataIn<T> {
    type: EWorkerDataTypeIn,
    data: T | IWorkerDataProgress,
}

export interface IWorkerDataOut<T> {
    type: EWorkerDataTypeOut,
    data: T | IWorkerDataProgress,
}