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
    if(admin?.role!=='admin') return Response.json({error:'Alleen een clubbeheerder kan wachtwoorden wijzigen.'},{status:403})

    const body=await request.json()
    const profileId=String(body.profile_id||'').trim()
    const password=typeof body.password==='string'?body.password:''
    if(!profileId) return Response.json({error:'Kies eerst een gekoppeld account.'},{status:400})
    if(password.length<8) return Response.json({error:'Gebruik minimaal 8 tekens.'},{status:400})
    if(password.length>72) return Response.json({error:'Gebruik maximaal 72 tekens.'},{status:400})

    const {data:profile,error:profileError}=await service.from('profiles').select('id,is_placeholder').eq('id',profileId).maybeSingle()
    if(profileError||!profile) return Response.json({error:'Lid niet gevonden.'},{status:404})
    if(profile.is_placeholder) return Response.json({error:'Koppel eerst een echt account aan deze persoon.'},{status:400})

    const {data:account,error:accountError}=await service.auth.admin.getUserById(profileId)
    if(accountError||!account?.user) return Response.json({error:'Dit lid heeft geen gekoppeld account.'},{status:400})

    const {error:updateError}=await service.auth.admin.updateUserById(profileId,{password})
    if(updateError) return Response.json({error:updateError.message},{status:400})
    return Response.json({ok:true})
  } catch(error) {
    return Response.json({error:error?.message||'Wachtwoord wijzigen mislukt.'},{status:500})
  }
}
