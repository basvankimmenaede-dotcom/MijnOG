const allowedKeys=new Set(['activities','team_messages','substitute_requests','maybe_reminders','staff_requests'])

export async function filterRecipientsByPreference(service,profileIds,key){
  const ids=[...new Set((profileIds||[]).filter(Boolean))]
  if(!ids.length||!allowedKeys.has(key))return ids
  const {data,error}=await service.from('notification_preferences').select(`profile_id,${key}`).in('profile_id',ids)
  if(error)return ids
  const disabled=new Set((data||[]).filter(row=>row[key]===false).map(row=>row.profile_id))
  return ids.filter(id=>!disabled.has(id))
}
