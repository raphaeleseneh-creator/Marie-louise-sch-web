/** Retry only the two read-only sign-in bootstrap endpoints. */
export async function fetchSignInRead(path,options={}){
  if(!['/api/health','/api/auth/me'].includes(path)||(options.method&&options.method!=='GET'))throw new Error('Only sign-in status reads can be retried.');
  for(let attempt=0;attempt<2;attempt++){
    options.signal?.throwIfAborted();
    const timeout=AbortSignal.timeout(22000);
    try{
      const response=await fetch(path,{...options,cache:'no-store',signal:options.signal?AbortSignal.any([options.signal,timeout]):timeout});
      if(![500,502,503,504].includes(response.status)||attempt===1)return response;
      await response.body?.cancel();
    }catch(error){if(options.signal?.aborted||attempt===1)throw error;}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error('School sign-in could not be reached.');
}
