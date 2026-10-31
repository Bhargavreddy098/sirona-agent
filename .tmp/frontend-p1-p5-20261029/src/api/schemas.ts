import {z} from 'zod';
export const sessionSchema=z.object({principalId:z.string(),workspaceId:z.string(),expiresAt:z.string(),csrfToken:z.string().optional()});
export const conversationSchema=z.object({id:z.string(),title:z.string(),model:z.string(),project_id:z.string().nullable().optional(),last_activity_at:z.union([z.string(),z.number()]).nullish()});
export const messageSchema=z.object({id:z.coerce.string(),role:z.string(),content:z.string().nullish().transform(x=>x??''),status:z.string().default('completed'),timestamp:z.number().optional(),clientTurnId:z.string().optional()});
export const projectSchema=z.object({id:z.string(),name:z.string()});
export const modelSchema=z.object({id:z.string(),name:z.string(),provider:z.string(),connectionName:z.string().nullish(),providerConnectionId:z.string().nullish(),hasConfiguredApiKey:z.boolean(),contextWindow:z.number().nullish()});
export const connectionSchema=z.object({id:z.string(),kind:z.string(),name:z.string().nullish(),baseUrl:z.string().nullish(),isActive:z.boolean(),hasApiKey:z.boolean()});
export const providerSchema=z.object({id:z.string(),name:z.string(),description:z.string().optional(),defaultBaseUrl:z.string().nullish()});
export const settingsSchema=z.object({primaryModel:z.string(),fallbackModel:z.string(),auxiliaryModels:z.record(z.string(),z.string()).optional(),temperature:z.number().optional(),maxTokens:z.number().optional()});
export type Conversation=z.infer<typeof conversationSchema>;
export type Message=z.infer<typeof messageSchema>;
export type Model=z.infer<typeof modelSchema>;
export type Connection=z.infer<typeof connectionSchema>;
export type Project=z.infer<typeof projectSchema>;
export type Settings=z.infer<typeof settingsSchema>;
export type ProviderInput={id?:string;kind:string;name:string;baseUrl?:string;apiKey?:string;isActive?:boolean};
declare global {interface Window {sirona?:{bootstrap():Promise<unknown>;saveConnection(input:ProviderInput):Promise<unknown>;copyText(text:string):Promise<void>}}}
