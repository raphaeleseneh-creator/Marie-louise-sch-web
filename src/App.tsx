import React,{lazy,Suspense,useEffect,useState} from 'react';
const SchoolWebsite=lazy(()=>import('./SchoolWebsite'));
const ParentPortalPage=lazy(()=>import('./components/portal/ParentPortalPage').then(module=>({default:module.ParentPortalPage})));
const AdminDashboard=lazy(()=>import('./components/admin/AdminDashboard').then(module=>({default:module.AdminDashboard})));
function currentRoute(){const path=window.location.pathname.replace(/\/+$/,'');return path==='/parent-portal'?'parent':path==='/admin'?'admin':'school';}
class RouteBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return{failed:true};}
 render(){return this.state.failed?<main className="flex min-h-screen items-center justify-center bg-[#F4F1F7] p-6 text-[#29166F]"><section><h1 className="text-xl font-bold">Please refresh to open this page</h1><p className="mt-3">The website may have been updated while you were browsing.</p><button onClick={()=>window.location.reload()} className="mt-5 min-h-11 rounded-lg bg-[#581C87] px-5 font-bold text-white">Refresh page</button></section></main>:this.props.children;}
}
export default function App(){
 const [route,setRoute]=useState(currentRoute);
 useEffect(()=>{const update=()=>setRoute(currentRoute());window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update);},[]);
 const navigate=(path:string)=>{window.history.pushState({},'',path);window.scrollTo({top:0});setRoute(currentRoute());};
 return <RouteBoundary key={route}><Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#F4F1F7] text-[#29166F]"><p role="status">{route==='parent'?'Opening parent portal…':route==='admin'?'Opening staff workspace…':'Loading school website…'}</p></main>}>
 {route==='parent'?<ParentPortalPage onBackToSchool={()=>navigate('/')}/>:route==='admin'?<AdminDashboard onBackToSchool={()=>navigate('/')}/>:<SchoolWebsite openParentPortal={()=>navigate('/parent-portal')}/>}
 </Suspense></RouteBoundary>;
}
