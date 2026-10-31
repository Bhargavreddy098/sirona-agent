import {useEffect,useId,useRef,type ReactNode} from 'react';
import {RiCloseLine} from '@remixicon/react';
export function Dialog({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null),id=useId();
  useEffect(()=>{const dialog=ref.current!;if(open&&!dialog.open)dialog.showModal();else if(!open&&dialog.open)dialog.close();},[open]);
  return <dialog ref={ref} aria-labelledby={id} onClose={onClose}><header className="dialog-heading"><h2 id={id}>{title}</h2><form method="dialog"><button aria-label="Close dialog" className="icon-button"><RiCloseLine size={21}/></button></form></header>{open&&children}</dialog>;
}
