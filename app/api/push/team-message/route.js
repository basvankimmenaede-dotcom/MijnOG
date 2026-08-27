import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { filterRecipientsByPreference } from '../../../../lib/notification-preferences'
export const dynamic='force-dynamic'
export async function POST(request){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPublic=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, vapidPrivate=process.env.VAPID_PRIVATE_KEY, subject=process.env.VAPID_SUBJECT||'mailto:info@onzegezellen.nl'
  if(!url||!pub||!serviceKey||!vapidPublic||!vapidPrivate) return Response.json({error:'Push-serverconfiguratie ontbreekt.'},{status:500})
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,''); const body=await request.json()
  const userClient=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}}); const {data:u}=await userClient.auth.getUser(token); if(!u?.user)return Response.json({error:'Niet ingelogd.'},{status:401})
  const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:profile}=await service.from('profiles').select('role').eq('id',u.user.id).single(); const {data:member}=await service.from('team_members').select('member_role').eq('profile_id',u.user.id).eq('team_id',body.teamId).maybeSingle()
  if(profile?.role!=='admin'&&member?.member_role!=='coach')return Response.json({error:'Geen rechten.'},{status:403})
  const {data:members}=await service.from('team_members').select('profile_id').eq('team_id',body.teamId); const ids=await filterRecipientsByPreference(service,(members||[]).map(m=>m.profile_id),'team_messages')
  const {data:subs}=ids.length?await service.from('push_subscriptions').select('*').in('profile_id',ids).eq('enabled',true):{data:[]}
  webpush.setVapidDetails(subject,vapidPublic,vapidPrivate); let sent=0
  for(const row of subs||[]){try{await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},JSON.stringify({title:body.title,body:body.body,url:'/',tag:`team-message-${body.teamId}-${Date.now()}`}));sent++}catch(e){if([404,410].includes(e?.statusCode))await service.from('push_subscriptions').delete().eq('id',row.id)}}
  return Response.json({ok:true,sent})
 }catch(e){return Response.json({error:e?.message||'Push mislukt.'},{status:500})}
}
