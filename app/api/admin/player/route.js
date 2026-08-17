import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !publishableKey || !serviceRoleKey) return Response.json({ error: 'Serverconfiguratie ontbreekt.' }, { status: 500 })
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return Response.json({ error: 'Niet ingelogd.' }, { status: 401 })
    const userClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession:false, autoRefreshToken:false } })
    const { data:userData, error:userError } = await userClient.auth.getUser(token)
    if (userError || !userData?.user) return Response.json({ error:'Sessie is niet geldig.' }, { status:401 })
    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession:false, autoRefreshToken:false } })
    const { data:adminProfile } = await service.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (adminProfile?.role !== 'admin') return Response.json({ error:'Alleen een clubbeheerder kan een speler zonder account aanmaken.' }, { status:403 })

    const body = await request.json()
    const firstName=String(body.first_name||'').trim(), lastName=String(body.last_name||'').trim()
    const teamId=Number(body.team_id)
    if (!firstName || !lastName || !Number.isFinite(teamId)) return Response.json({ error:'Vul voornaam, achternaam en team in.' }, { status:400 })

    // Auth-record zonder e-mailadres: de speler kan hiermee niet inloggen.
    const { data:created, error:createError } = await service.auth.admin.createUser({
      user_metadata:{ first_name:firstName, last_name:lastName, placeholder_player:true }
    })
    if (createError || !created?.user?.id) return Response.json({ error:createError?.message || 'Voorlopige speler aanmaken mislukt.' }, { status:400 })
    const id=created.user.id
    const secondary=Array.isArray(body.secondary_positions) ? body.secondary_positions.filter(Boolean) : []
    const profilePayload={
      id, first_name:firstName, last_name:lastName, role:'player',
      jersey_number:String(body.jersey_number||'').trim() || null,
      primary_position:String(body.primary_position||'').trim() || null,
      secondary_positions:secondary,
      throws_hand:['L','R'].includes(body.throws_hand) ? body.throws_hand : null,
      bats_side:['L','R','S'].includes(body.bats_side) ? body.bats_side : null,
      is_placeholder:true,
      placeholder_created_by:userData.user.id
    }
    const { error:profileError } = await service.from('profiles').upsert(profilePayload)
    if (profileError) { await service.auth.admin.deleteUser(id); return Response.json({ error:`Profiel aanmaken mislukt: ${profileError.message}` }, { status:500 }) }
    const { error:memberError } = await service.from('team_members').insert({ team_id:teamId, profile_id:id, member_role:'player' })
    if (memberError) { await service.from('profiles').delete().eq('id',id); await service.auth.admin.deleteUser(id); return Response.json({ error:`Team koppelen mislukt: ${memberError.message}` }, { status:500 }) }
    return Response.json({ ok:true, profile_id:id })
  } catch (error) { return Response.json({ error:error?.message || 'Onbekende fout.' }, { status:500 }) }
}
