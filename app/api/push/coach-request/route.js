import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
export const dynamic='force-dynamic'
export async function POST(request){
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL, pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
    const vapidPublic=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, vapidPrivate=process.env.VAPID_PRIVATE_KEY, subject=process.env.VAPID_SUBJECT||'https://mijn-og-v2.vercel.app'
    if(!url||!pub||!serviceKey||!vapidPublic||!vapidPrivate)return Response.json({error:'Push-serverconfiguratie ontbreekt.'},{status:500})
    const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,''); const body=await request.json()
    const userClient=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}}); const {data:userData}=await userClient.auth.getUser(token)
    if(!userData?.user)return Response.json({error:'Niet ingelogd.'},{status:401})
    const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:req}=await service.from('player_requests').select('*').eq('id',body.requestId).maybeSingle(); if(!req)return Response.json({error:'Verzoek niet gevonden.'},{status:404})
    const {data:profile}=await service.from('profiles').select('role').eq('id',userData.user.id).single(); const {data:membership}=await service.from('team_members').select('member_role').eq('profile_id',userData.user.id).eq('team_id',req.requesting_team_id).maybeSingle()
    if(profile?.role!=='admin'&&membership?.member_role!=='coach')return Response.json({error:'Geen rechten.'},{status:403})
    const {data:coaches}=await service.from('team_members').select('profile_id').eq('team_id',req.target_team_id).eq('member_role','coach'); const ids=[...new Set((coaches||[]).map(r=>r.profile_id))]
    const {data:subs}=ids.length?await service.from('push_subscriptions').select('*').in('profile_id',ids).eq('enabled',true):{data:[]}
    const date=new Date(req.event_start).toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/Amsterdam'})
    const time=new Date(req.event_start).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Amsterdam'})
    const meet=req.event_meet_at?new Date(req.event_meet_at).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Amsterdam'}):null
    const practical=[`${date} ${time}`,meet?`verzamelen ${meet}`:null,req.event_location||req.event_address||null].filter(Boolean).join(' · ')
    webpush.setVapidDetails(subject,vapidPublic,vapidPrivate);let sent=0
    for(const row of subs||[]){try{await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},JSON.stringify({title:'Nieuw invallerverzoek',body:`${req.event_title} · ${req.position} · ${practical}`,url:'/?tab=Coach',tag:`coach-request-${req.id}`,requireInteraction:true}));sent++}catch(e){if([404,410].includes(e?.statusCode))await service.from('push_subscriptions').delete().eq('id',row.id)}}
    return Response.json({ok:true,sent,coachCount:ids.length})
  }catch(error){return Response.json({error:error?.message||'Push mislukt.'},{status:500})}
}
