export function readRunEvents(response:Response,onEvent:(event:{id:string;type:string;payload:Record<string,unknown>})=>void,signal:AbortSignal,after?:string):Promise<void>;
