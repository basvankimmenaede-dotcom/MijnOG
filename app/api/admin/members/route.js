import { createClient } from '@supabase/supabase-js'

async function adminContext(request) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!key||!serviceKey) throw new Error('Serverconfiguratie ontbreekt.')
  const header=request.headers.get('authorization')||''
  const token=header.startsWith('Bearer ')?header.slice(7):''
  if(!token) return {error:Response.json({error:'Niet ingelogd.'},{status:401})}
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error}=await client.auth.getUser(token)
  if(error||!data?.user) return {error:Response.json({error:'Sessie is niet geldig.'},{status:401})}
  const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:profile}=await service.from('profiles').select('role').eq('id',data.user.id).maybeSingle()
  if(profile?.role!=='admin') return {error:Response.json({error:'Alleen een clubbeheerder kan de ledenlijst bekijken.'},{status:403})}
  return {service}
}

export async function GET(request) {
  try {
    const context=await adminContext(request)
    if(context.error) return context.error
    const {service}=context
    const [{data:profiles,error:profileError},{data:authData,error:authError}]=await Promise.all([
      service.from('profiles').select('id,first_name,last_name,username,jersey_number,primary_position,secondary_positions,date_of_birth,is_placeholder,role').order('first_name'),
      service.auth.admin.listUsers({page:1,perPage:1000})
    ])
    if(profileError) return Response.json({error:profileError.message},{status:500})
    if(authError) return Response.json({error:authError.message},{status:500})
    const emails=new Map((authData?.users||[]).map(user=>[user.id,user.email||'']))
    return Response.json({members:(profiles||[]).map(profile=>({...profile,email:profile.is_placeholder?'':emails.get(profile.id)||''}))})
  } catch(error) {
    return Response.json({error:error?.message||'Ledenlijst laden mislukt.'},{status:500})
  }
}
