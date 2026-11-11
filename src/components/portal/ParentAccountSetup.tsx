import React,{useState} from 'react';
import {api,errorMessage} from '../admin/api';
import {EntryForm,Field,secondaryClass} from '../admin/WorkspaceUI';

export function ParentRegistration({cancel}:{cancel:()=>void}){
  const [error,setError]=useState('');
  return <div className="mt-6"><EntryForm title="Create your parent account" submitLabel="Create account" onCancel={cancel} onSave={async data=>{
    setError('');if(data.password!==data.confirm_password){setError('Your passwords do not match.');return false;}
    try{await api('/api/auth/parent/register',{method:'POST',body:JSON.stringify({full_name:data.full_name,email:data.email,password:data.password})});window.location.reload();return true;}catch(reason){setError(errorMessage(reason));return false;}
  }}><Field label="Full name" name="full_name" autoComplete="name" required/><Field label="Email address" name="email" type="email" autoComplete="email" required/><Field label="Password" name="password" type="password" minLength={12} maxLength={200} autoComplete="new-password" required/><Field label="Confirm password" name="confirm_password" type="password" minLength={12} autoComplete="new-password" required/>{error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}<p className="text-xs leading-5 text-[#625B69]">You can sign in immediately. Add your children afterwards using the student IDs and private linking code issued by the school.</p></EntryForm></div>;
}

export function LinkChildren({done}:{done:()=>void}){
  const [rows,setRows]=useState(['']),[error,setError]=useState('');
  return <div className="max-w-xl"><EntryForm title="Link your children" submitLabel="Link children" resetOnSuccess={false} onSave={async data=>{
    setError('');try{await api('/api/auth/parent/link-children',{method:'POST',body:JSON.stringify({link_code:data.link_code,student_codes:rows.map(value=>value.trim())})});setRows(['']);done();return true;}catch(reason){setError(errorMessage(reason));return false;}
  }}><p className="text-sm leading-6">Enter the student IDs and private, single-use linking code the school gave you. You can add several children at once. No staff approval is required after linking.</p>
  {rows.map((value,index)=><div key={index} className="flex items-end gap-2"><div className="flex-1"><Field label={`Student ID ${index+1}`} name={`student_${index}`} value={value} maxLength={50} required onChange={event=>setRows(old=>old.map((row,i)=>i===index?event.target.value:row))}/></div>{rows.length>1?<button type="button" className={secondaryClass} aria-label={`Remove student ID ${index+1}`} onClick={()=>setRows(old=>old.filter((_,i)=>i!==index))}>Remove</button>:null}</div>)}
  <button type="button" disabled={rows.length>=20} className={secondaryClass} onClick={()=>setRows(old=>[...old,''])}>Add another child</button>
  <Field label="Private linking code" name="link_code" autoComplete="off" required maxLength={32}/>
  {error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}<p className="text-xs leading-5 text-[#625B69]">A student ID alone does not grant access. Your code works only for the children assigned to it and expires after seven days. Ask the school for a new code if it has expired or you need to add another child later.</p></EntryForm></div>;
}
