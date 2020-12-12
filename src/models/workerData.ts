export enum IWorkerDataType {
    START,
    CHUNK,
    END,
    ABORT,
    RESET
}

export interface IWorkerData<T> {
    type: IWorkerDataType,
    data: T,
}