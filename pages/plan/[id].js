import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getApp, fmtTime } from '../../lib/config'
import Head from 'next/head'

export default function ParticipantPlan() {
  const router = useRouter()
  const { id } = router.query
  const [participant, setParticipant] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      const [{ data: p }, { data: bs }] = await Promise.all([
        supabase.from('participants').select('*').eq('id', id).single(),
        supabase.from('bookings').select('*').eq('participant_id', id).order('start_time'),
      ])
      setParticipant(p)
      setBookings(bs || [])
      setLoading(false)
    }
    load()

    const channel = supabase.channel('plan-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `participant_id=eq.${id}` }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', color: '#9B9A94', fontSize: 14 }}>
      Laden…
    </div>
  )

  if (!participant) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', color: '#9B9A94', fontSize: 14 }}>
      Teilnehmer nicht gefunden
    </div>
  )

  const coldCount = bookings.filter(b => b.application === 'cold').length

  return (
    <>
      <Head><title>{participant.name} – Race Event</title></Head>
      <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#F0EFE8', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 16px 60px', maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>❄️</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Hallo, {participant.name}!</h1>
          <p style={{ fontSize: 13, color: '#9B9A94' }}>Dein persönlicher Eventplan</p>
        </div>

        {/* Cold rounds */}
        <div style={{
          background: '#111118', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 14, padding: 16, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Kältekammer-Runden</span>
            <span style={{ fontSize: 13, color: '#9B9A94' }}>{coldCount} von 6</span>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} style={{
                flex: 1, height: 8, borderRadius: 4,
                background: i < coldCount ? '#BFD9F5' : '#1A1A24',
                transition: 'background .3s',
              }} />
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Dein Zeitplan</div>

        {bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#5C5B57', fontSize: 14 }}>
            Noch keine Buchungen.<br />Wende dich an den Admin.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookings.map(b => {
              const app = getApp(b.application)
              const isCold = b.application === 'cold'
              return (
                <div key={b.id} style={{
                  background: '#111118',
                  border: `1px solid ${app.borderColor}33`,
                  borderLeft: `4px solid ${app.borderColor}`,
                  borderRadius: '0 12px 12px 0',
                  padding: isCold ? '14px 16px' : '11px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: app.color, color: app.textColor,
                      padding: '4px 10px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                    }}>
                      {app.icon} {app.name}
                    </div>
                    <div style={{ fontSize: 13, color: '#9B9A94', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                    </div>
                  </div>
                  {isCold && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#5C5B57', lineHeight: 1.5 }}>
                      5 Min Umziehen → 3 Min Kälte → 5 Min Aufwärmen → 5 Min Umziehen
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p style={{ fontSize: 11, color: '#5C5B57', textAlign: 'center', marginTop: 32 }}>
          Diese Seite aktualisiert sich automatisch wenn der Admin Änderungen vornimmt.
        </p>
      </div>
    </>
  )
}
