import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
    if(!url||!publishableKey||!serviceKey)return Response.json({error:'Inlogconfiguratie ontbreekt.'},{status:500})
    const body=await request.json()
    const identifier=String(body.identifier||'').trim().toLowerCase()
    const password=String(body.password||'')
    if(!identifier||!password)return Response.json({error:'Vul je gebruikersnaam of e-mailadres en wachtwoord in.'},{status:400})

    let email=identifier
    if(!identifier.includes('@')){
      const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
      const {data:profile}=await service.from('profiles').select('id').eq('username',identifier).maybeSingle()
      if(!profile)return Response.json({error:'Gebruikersnaam/e-mailadres of wachtwoord is onjuist.'},{status:400})
      const {data:userResult}=await service.auth.admin.getUserById(profile.id)
      email=userResult?.user?.email||''
      if(!email)return Response.json({error:'Gebruikersnaam/e-mailadres of wachtwoord is onjuist.'},{status:400})
    }

    const authClient=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data,error}=await authClient.auth.signInWithPassword({email,password})
    if(error||!data.session)return Response.json({error:'Gebruikersnaam/e-mailadres of wachtwoord is onjuist.'},{status:400})
    return Response.json({access_token:data.session.access_token,refresh_token:data.session.refresh_token})
  } catch(error){return Response.json({error:error?.message||'Inloggen mislukt.'},{status:500})}
}
