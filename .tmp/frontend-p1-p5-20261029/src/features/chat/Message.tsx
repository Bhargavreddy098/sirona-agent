import {useState,type ReactNode} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {RiFileCopyLine,RiCheckLine} from '@remixicon/react';
import type {Message as MessageData} from '../../api/schemas';
export function CopyButton({text,label='Copy message'}:{text:string;label?:string}){const [copied,setCopied]=useState(false);return <button type="button" className="icon-button copy" aria-label={copied?'Copied':label} onClick={()=>{void (window.sirona?window.sirona.copyText(text):navigator.clipboard.writeText(text)).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500);}).catch(()=>setCopied(false));}}>{copied?<RiCheckLine size={19}/>:<RiFileCopyLine size={19}/>}</button>;}
function textOf(node:ReactNode):string{if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(textOf).join('');if(node&&typeof node==='object'&&'props'in node)return textOf((node.props as {children?:ReactNode}).children);return '';}
export function Message({message}:{message:MessageData}){
  const user=message.role==='user',completed=message.status==='completed';
  return <article className={`message ${user?'user':'assistant'}`} aria-label={user?'Your message':'Assistant response'}><div className="message-content">{!user&&<div className="author">Assistant</div>}<div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight,{ignoreMissing:true}]]} components={{pre:({children})=><div className="code-block"><div className="code-heading"><span>Code</span><CopyButton text={textOf(children)} label="Copy code"/></div><pre>{children}</pre></div>,a:({children,href})=><a href={href} target="_blank" rel="noreferrer">{children}</a>}}>{message.content}</ReactMarkdown></div>{!completed&&<p className="message-status" role="status">{message.status==='cancelled'?'Stopped or interrupted':message.status==='failed'?'This turn failed':'Completion has not been confirmed'}</p>}{!user&&completed&&<CopyButton text={message.content}/>}{message.timestamp&&<time className="message-time">{new Date(message.timestamp*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})}</time>}</div></article>;
}
