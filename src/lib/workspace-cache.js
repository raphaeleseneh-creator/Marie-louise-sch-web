// Component-owned, short-lived catalogs. Never shared between users or stored
// in browser storage. Explicit refresh and successful writes invalidate them.
export function createWorkspaceCache(){
  const entries=new Map();
  return{
    clear(){entries.clear();},
    read(userId,path,load){
      const key=String(userId)+':'+path,now=Date.now(),old=entries.get(key);
      if(old&&now-old.created<30000)return old.promise;
      const promise=Promise.resolve().then(load);entries.set(key,{created:now,promise});
      promise.catch(()=>{if(entries.get(key)?.promise===promise)entries.delete(key);});
      return promise;
    },
  };
}
