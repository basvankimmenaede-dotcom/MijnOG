import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { filterRecipientsByPreference } from '../../../../lib/notification-preferences'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL, pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
    const vapidPublic=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, vapidPrivate=process.env.VAPID_PRIVATE_KEY, subject=process.env.VAPID_SUBJECT||'https://mijn-og-v2.vercel.app'
    if(!url||!pub||!serviceKey||!vapidPublic||!vapidPrivate)return Response.json({error:'Push-serverconfiguratie ontbreekt.'},{status:500})
    const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/,'')
    const userClient=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}}), {data:userData}=await userClient.auth.getUser(token)
    if(!userData?.user)return Response.json({error:'Niet ingelogd.'},{status:401})
    const {assignmentId}=await request.json(), service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:assignment}=await service.from('event_staff_assignments').select('id,event_id,task_role,invited_by,club_staff(profile_id),events(title,start_at,team_id)').eq('id',assignmentId).maybeSingle()
    if(!assignment||assignment.invited_by!==userData.user.id)return Response.json({error:'Geen rechten.'},{status:403})
    const profileId=assignment.club_staff?.profile_id
    const allowedIds=await filterRecipientsByPreference(service,[profileId],'staff_requests')
    if(!allowedIds.length)return Response.json({ok:true,sent:0})
    const {data:subscriptions}=await service.from('push_subscriptions').select('*').eq('profile_id',profileId).eq('enabled',true)
    webpush.setVapidDetails(subject,vapidPublic,vapidPrivate);let sent=0
    for(const row of subscriptions||[]){try{await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},JSON.stringify({title:'Nieuwe medewerkersuitnodiging',body:`${staffRoleLabel(assignment.task_role)} bij ${assignment.events?.title||'een OG-activiteit'}`,url:'/',tag:`staff-assignment-${assignment.id}`}));sent++}catch(error){if([404,410].includes(error?.statusCode))await service.from('push_subscriptions').delete().eq('id',row.id)}}
    return Response.json({ok:true,sent})
  } catch(error){return Response.json({error:error?.message||'Push mislukt.'},{status:500})}
}

function staffRoleLabel(role){return ({trainer:'Trainer',pitching_trainer:'Pitchingtrainer',catching_trainer:'Catchingtrainer',scorer:'Scoorder',team_manager:'Teammanager',physio:'Fysio',begeleider:'Begeleider',other:'Medewerker'})[role]||'Medewerker'}
