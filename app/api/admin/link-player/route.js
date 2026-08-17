import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://mijn-og-v2.vercel.app').replace(/\/$/, '')

    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      return Response.json({ error:'Serverconfiguratie ontbreekt.' }, { status:500 })
    }

    const authHeader=request.headers.get('authorization') || ''
    const token=authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if(!token) return Response.json({ error:'Niet ingelogd.' }, { status:401 })

    const userClient=createClient(supabaseUrl,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:userData,error:userError}=await userClient.auth.getUser(token)
    if(userError || !userData?.user) return Response.json({ error:'Sessie is niet geldig.' }, { status:401 })

    const service=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:adminProfile}=await service.from('profiles').select('role').eq('id',userData.user.id).maybeSingle()
    if(adminProfile?.role!=='admin') return Response.json({ error:'Alleen een clubbeheerder kan een account koppelen.' }, { status:403 })

    const body=await request.json()
    const profileId=String(body.profile_id || '').trim()
    const email=String(body.email || '').trim().toLowerCase()
    if(!profileId || !email || !email.includes('@')) return Response.json({ error:'Vul een geldig e-mailadres in.' }, { status:400 })

    const {data:profile,error:profileError}=await service.from('profiles')
      .select('id,first_name,last_name,is_placeholder')
      .eq('id',profileId).maybeSingle()
    if(profileError || !profile) return Response.json({ error:'Spelersprofiel niet gevonden.' }, { status:404 })
    if(!profile.is_placeholder) return Response.json({ error:'Dit profiel is al aan een Mijn OG-account gekoppeld.' }, { status:400 })

    // Controleer of het echte e-mailadres niet al door een andere Auth-user wordt gebruikt.
    const {data:listData,error:listError}=await service.auth.admin.listUsers({page:1,perPage:1000})
    if(listError) return Response.json({ error:`Accounts controleren mislukt: ${listError.message}` }, { status:500 })
    const existing=(listData?.users || []).find(u => String(u.email || '').toLowerCase()===email && u.id!==profileId)
    if(existing) return Response.json({ error:'Dit e-mailadres hoort al bij een ander Mijn OG-account.' }, { status:409 })

    const {error:updateUserError}=await service.auth.admin.updateUserById(profileId,{
      email,
      email_confirm:true,
      user_metadata:{
        first_name:profile.first_name || '',
        last_name:profile.last_name || '',
        placeholder_player:false,
        placeholder_email:false
      }
    })
    if(updateUserError) return Response.json({ error:`E-mailadres koppelen mislukt: ${updateUserError.message}` }, { status:400 })

    const {error:updateProfileError}=await service.from('profiles').update({
      is_placeholder:false
    }).eq('id',profileId)

    if(updateProfileError) {
      return Response.json({ error:`Account is gekoppeld, maar profielstatus bijwerken mislukt: ${updateProfileError.message}` }, { status:500 })
    }

    // Verstuur normale Supabase recovery-mail zodat de speelster zelf een wachtwoord kan kiezen.
    const mailClient=createClient(supabaseUrl,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {error:mailError}=await mailClient.auth.resetPasswordForEmail(email,{
      redirectTo:`${appUrl}/?recovery=1`
    })
    if(mailError) return Response.json({ error:`E-mailadres is gekoppeld, maar de wachtwoordmail kon niet worden verstuurd: ${mailError.message}` }, { status:500 })

    return Response.json({ ok:true })
  } catch(error) {
    return Response.json({ error:error?.message || 'Onbekende fout bij account koppelen.' }, { status:500 })
  }
}
