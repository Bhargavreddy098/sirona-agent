export function readSse(response:Response,onEvent:(event:unknown)=>void,signal?:AbortSignal):Promise<void>;
