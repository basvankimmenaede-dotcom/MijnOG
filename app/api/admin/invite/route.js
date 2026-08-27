import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://mijn-og-v2.vercel.app').replace(/\/$/, '')

    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      return Response.json({ error: 'Serverconfiguratie voor uitnodigingen ontbreekt.' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return Response.json({ error: 'Niet ingelogd.' }, { status: 401 })

    const userClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData?.user) return Response.json({ error: 'Sessie is niet geldig.' }, { status: 401 })

    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: adminProfile, error: profileError } = await service
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profileError || adminProfile?.role !== 'admin') {
      return Response.json({ error: 'Alleen een clubbeheerder kan accounts uitnodigen.' }, { status: 403 })
    }

    const body = await request.json()
    const accountType = body.account_type === 'username' ? 'username' : 'email'
    const email = String(body.email || '').trim().toLowerCase()
    const username = String(body.username || '').trim().toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''
    const firstName = String(body.first_name || '').trim()
    const lastName = String(body.last_name || '').trim()
    const teamId = Number(body.team_id)
    const memberRole = ['player', 'coach', 'staff'].includes(body.member_role) ? body.member_role : 'player'

    if (!firstName || !lastName || !Number.isFinite(teamId)) return Response.json({ error: 'Vul naam, team en rol volledig in.' }, { status: 400 })
    if(accountType==='email' && (!email || !email.includes('@'))) return Response.json({error:'Vul een geldig e-mailadres in.'},{status:400})
    if(accountType==='username' && !/^[a-z0-9._-]{3,30}$/.test(username)) return Response.json({error:'Gebruik een gebruikersnaam van 3–30 letters, cijfers, punten, streepjes of underscores.'},{status:400})
    if(accountType==='username' && (password.length<8 || password.length>72)) return Response.json({error:'Gebruik een wachtwoord van 8–72 tekens.'},{status:400})

    const { data: team, error: teamError } = await service.from('teams').select('id,name').eq('id', teamId).maybeSingle()
    if (teamError || !team) return Response.json({ error: 'Het gekozen team bestaat niet meer.' }, { status: 400 })

    if(accountType==='username'){
      const {data:existingUsername}=await service.from('profiles').select('id').eq('username',username).maybeSingle()
      if(existingUsername) return Response.json({error:'Deze gebruikersnaam is al in gebruik.'},{status:409})
      const internalEmail=`account-${crypto.randomUUID()}@users.mijn-og.invalid`
      const {data:created,error:createError}=await service.auth.admin.createUser({email:internalEmail,password,email_confirm:true,user_metadata:{first_name:firstName,last_name:lastName,placeholder_email:true,username_only:true}})
      if(createError||!created?.user?.id) return Response.json({error:createError?.message||'Account aanmaken mislukt.'},{status:400})
      const id=created.user.id
      const {error:newProfileError}=await service.from('profiles').upsert({id,first_name:firstName,last_name:lastName,username,role:'player',is_placeholder:false})
      if(newProfileError){await service.auth.admin.deleteUser(id);return Response.json({error:`Profiel aanmaken mislukt: ${newProfileError.message}`},{status:500})}
      const {error:newMemberError}=await service.from('team_members').insert({team_id:teamId,profile_id:id,member_role:memberRole})
      if(newMemberError){await service.from('profiles').delete().eq('id',id);await service.auth.admin.deleteUser(id);return Response.json({error:`Team koppelen mislukt: ${newMemberError.message}`},{status:500})}
      return Response.json({ok:true,user_id:id,team:team.name,username_only:true})
    }

    const { error: inviteRowError } = await service.from('invitations').upsert({
      email,
      first_name: firstName,
      last_name: lastName,
      team_id: teamId,
      member_role: memberRole,
      invited_by: userData.user.id,
      status: 'pending',
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' })

    if (inviteRowError) return Response.json({ error: `Uitnodiging voorbereiden mislukt: ${inviteRowError.message}` }, { status: 500 })

    const { data: inviteData, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/?invite=1`,
      data: { first_name: firstName, last_name: lastName, invited_team_id: teamId, invited_member_role: memberRole }
    })

    if (inviteError) {
      await service.from('invitations').delete().eq('email', email).eq('status', 'pending')
      const already = /already|registered|exists/i.test(inviteError.message || '')
      return Response.json({ error: already ? 'Dit e-mailadres heeft al een Mijn OG-account. Gebruik Teamindeling om deze persoon aan een team toe te voegen.' : inviteError.message }, { status: 400 })
    }

    return Response.json({ ok: true, user_id: inviteData?.user?.id || null, team: team.name })
  } catch (error) {
    return Response.json({ error: error?.message || 'Onbekende fout bij uitnodigen.' }, { status: 500 })
  }
}
