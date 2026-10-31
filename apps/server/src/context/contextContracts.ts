import {z} from 'zod-v4';
import {digestSchema,relativePathSchema} from '../tools/toolContracts.js';

export const contextPolicySchema=z.object({version:z.literal('p6.1'),files:z.array(relativePathSchema).min(1).max(100),snapshotMode:z.enum(['pinned','current']).default('pinned'),maxBytes:z.number().int().min(256).max(32768).default(8192),maxFiles:z.number().int().min(1).max(20).default(8),toolRevisionId:z.uuid().optional(),toolRevisionDigest:digestSchema.optional()}).strict().refine(v=>Boolean(v.toolRevisionId)===Boolean(v.toolRevisionDigest),'Revision id and digest must be specified together');
export const symbolSchema=z.object({name:z.string().max(512),kind:z.enum(['definition','import']),startLine:z.number().int().positive(),endLine:z.number().int().positive()}).strict();
export const indexedFileSchema=z.object({path:relativePathSchema,sha256:digestSchema,parserDigest:digestSchema,language:z.enum(['javascript','typescript','tsx','sql']),symbols:z.array(symbolSchema).max(2000),warnings:z.array(z.enum(['PARSE_ERRORS','SYMBOL_LIMIT'])).max(2)}).strict();
export type IndexedFile=z.infer<typeof indexedFileSchema>;
export const contextBundleSchema=z.object({version:z.literal('p6.1'),snapshotDigest:digestSchema,policyDigest:digestSchema,indexDigest:digestSchema,sources:z.array(z.object({path:relativePathSchema,sha256:digestSchema,startLine:z.number().int().positive(),endLine:z.number().int().positive()}).strict()).max(20),text:z.string().max(32768),byteLength:z.number().int().nonnegative(),warnings:z.array(z.string().max(100)).max(100)}).strict();
