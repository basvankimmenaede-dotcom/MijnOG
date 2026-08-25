import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
    const appUrl=(process.env.NEXT_PUBLIC_APP_URL||'https://mijn-og-v2.vercel.app').replace(/\/$/,'')
    if(!url||!key||!serviceKey) return Response.json({error:'Serverconfiguratie ontbreekt.'},{status:500})
    const header=request.headers.get('authorization')||''
    const token=header.startsWith('Bearer ')?header.slice(7):''
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data,error}=await client.auth.getUser(token)
    if(error||!data?.user) return Response.json({error:'Sessie is niet geldig.'},{status:401})
    const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:admin}=await service.from('profiles').select('role').eq('id',data.user.id).maybeSingle()
    if(admin?.role!=='admin') return Response.json({error:'Alleen een clubbeheerder kan een resetmail sturen.'},{status:403})
    const {profile_id:profileId}=await request.json()
    const {data:userData,error:userError}=await service.auth.admin.getUserById(String(profileId||''))
    const email=userData?.user?.email
    if(userError||!email) return Response.json({error:'Dit lid heeft geen gekoppeld e-mailadres.'},{status:400})
    const mailClient=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
    const {error:mailError}=await mailClient.auth.resetPasswordForEmail(email,{redirectTo:`${appUrl}/?recovery=1`})
    if(mailError) return Response.json({error:mailError.message},{status:400})
    return Response.json({ok:true,email})
  } catch(error) {
    return Response.json({error:error?.message||'Resetmail versturen mislukt.'},{status:500})
  }
}
