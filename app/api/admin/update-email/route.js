import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
    if(!url||!key||!serviceKey) return Response.json({error:'Serverconfiguratie ontbreekt.'},{status:500})

    const header=request.headers.get('authorization')||''
    const token=header.startsWith('Bearer ')?header.slice(7):''
    if(!token) return Response.json({error:'Niet ingelogd.'},{status:401})

    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:userData,error:userError}=await client.auth.getUser(token)
    if(userError||!userData?.user) return Response.json({error:'Sessie is niet geldig.'},{status:401})

    const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:admin}=await service.from('profiles').select('role').eq('id',userData.user.id).maybeSingle()
    if(admin?.role!=='admin') return Response.json({error:'Alleen een clubbeheerder kan een e-mailadres wijzigen.'},{status:403})

    const body=await request.json()
    const profileId=String(body.profile_id||'').trim()
    const email=String(body.email||'').trim().toLowerCase()
    if(!profileId||!email||!email.includes('@')) return Response.json({error:'Vul een geldig e-mailadres in.'},{status:400})

    const {data:profile,error:profileError}=await service.from('profiles').select('id,is_placeholder').eq('id',profileId).maybeSingle()
    if(profileError||!profile) return Response.json({error:'Lid niet gevonden.'},{status:404})
    if(profile.is_placeholder) return Response.json({error:'Koppel eerst een echt account aan deze persoon.'},{status:400})

    const {data,error}=await service.auth.admin.updateUserById(profileId,{email,email_confirm:true})
    if(error) return Response.json({error:error.message},{status:400})
    return Response.json({ok:true,email:data?.user?.email||email})
  } catch(error) {
    return Response.json({error:error?.message||'E-mailadres wijzigen mislukt.'},{status:500})
  }
}
