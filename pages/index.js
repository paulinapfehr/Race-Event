import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { APPLICATIONS, getApp, fmtTime, addMinutes } from '../lib/config'
import Head from 'next/head'

const SLOT_MINUTES = 1
const EVENT_HOURS = 4

function useEvent() {
  const [startTime, setStartTime] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('raceEventStart')
    if (stored) {
      setStartTime(new Date(stored))
    }
  }, [])

  function setEvent(date) {
    localStorage.setItem('raceEventStart', date.toISOString())
    setStartTime(date)
  }

  return { startTime, setEvent }
}

export default function Home() {
  const { startTime, setEvent } = useEvent()
  const [participants, setParticipants] = useState([])
  const [bookings, setBookings] = useState([])
  const [view, setView] = useState('overview') // overview | participant
  const [selectedP, setSelectedP] = useState(null)
  const [modal, setModal] = useState(null) // { type: 'addParticipant' | 'book', data }
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const endTime = startTime ? addMinutes(startTime, EVENT_HOURS * 60) : null

  const showMsg = (text, type = 'ok') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  const load = useCallback(async () => {
    const [{ data: ps }, { data: bs }] = await Promise.all([
      supabase.from('participants').select('*').order('created_at'),
      supabase.from('bookings').select('*').order('start_time'),
    ])
    setParticipants(ps || [])
    setBookings(bs || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Real-time updates
  useEffect(() => {
    const channel = supabase.channel('changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load])

  async function addParticipant() {
    if (!newName.trim()) return
    setSaving(true)
    const { error } = await supabase.from('participants').insert({ name: newName.trim() })
    if (error) showMsg('Fehler: ' + error.message, 'err')
    else { showMsg(newName.trim() + ' hinzugefügt'); setNewName(''); setModal(null) }
    setSaving(false)
  }

  async function deleteParticipant(id, name) {
    if (!confirm(`${name} wirklich löschen? Alle Buchungen werden ebenfalls gelöscht.`)) return
    setSaving(true)
    await supabase.from('participants').delete().eq('id', id)
    if (selectedP === id) setSelectedP(null)
    setSaving(false)
  }

  async function addBooking(participantId, appId, startISO) {
    const app = getApp(appId)
    const start = new Date(startISO)
    const end = addMinutes(start, app.duration)
    setSaving(true)
    const { error } = await supabase.from('bookings').insert({
      participant_id: participantId,
      application: appId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    })
    if (error) showMsg('Fehler: ' + error.message, 'err')
    else { showMsg('Buchung gespeichert'); setModal(null) }
    setSaving(false)
  }

  async function deleteBooking(id) {
    setSaving(true)
    await supabase.from('bookings').delete().eq('id', id)
    setSaving(false)
  }

  function getParticipantBookings(pid) {
    return bookings.filter(b => b.participant_id === pid).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  }

  function getColdRounds(pid) {
    return bookings.filter(b => b.participant_id === pid && b.application === 'cold').length
  }

  // Check conflicts: is this appId already booked during [start, end)?
  function getConflicts(appId, startISO, durationMins, excludeBookingId = null) {
    const app = getApp(appId)
    const start = new Date(startISO)
    const end = addMinutes(start, durationMins)
    const overlapping = bookings.filter(b => {
      if (b.id === excludeBookingId) return false
      if (b.application !== appId) return false
      const bs = new Date(b.start_time), be = new Date(b.end_time)
      return start < be && end > bs
    })
    return overlapping.length
  }

  function isSlotAvailable(appId, startISO, durationMins) {
    const app = getApp(appId)
    return getConflicts(appId, startISO, durationMins) < app.capacity
  }

  function getTimeSlots() {
    if (!startTime) return []
    const slots = []
    let cur = new Date(startTime)
    while (cur < endTime) {
      slots.push(new Date(cur))
      cur = addMinutes(cur, 5)
    }
    return slots
  }

  const timeSlots = getTimeSlots()

  // Setup screen
  if (!startTime) {
    return <SetupScreen onStart={setEvent} />
  }

  const currentParticipant = participants.find(p => p.id === selectedP)

  return (
    <>
      <Head><title>Race Event</title></Head>

      {/* Toast */}
      {msg && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 1000,
          background: msg.type === 'err' ? '#7f1d1d' : '#14532d',
          color: '#fff', padding: '10px 16px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,.4)',
          animation: 'fadeIn .2s ease',
        }}>{msg.text}</div>
      )}

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{
          width: 240, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          {/* Header */}
          <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 16 }}>❄️</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Race Event</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {fmtTime(startTime)} – {fmtTime(endTime)} Uhr
            </div>
          </div>

          {/* Nav */}
          <div style={{ padding: '8px 8px 4px' }}>
            <NavBtn active={view === 'overview' && !selectedP} onClick={() => { setView('overview'); setSelectedP(null) }}>
              Übersicht
            </NavBtn>
          </div>

          {/* Participants list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: 'var(--text3)', textTransform: 'uppercase', padding: '8px 6px 6px' }}>
              Teilnehmer ({participants.length})
            </div>
            {participants.map(p => {
              const coldCount = getColdRounds(p.id)
              const isActive = selectedP === p.id
              return (
                <div
                  key={p.id}
                  onClick={() => { setSelectedP(p.id); setView('participant') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
                    borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                    background: isActive ? 'rgba(91,143,232,.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(91,143,232,.3)' : '1px solid transparent',
                  }}
                  onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
                  onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                >
                  <Avatar name={p.name} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>❄️ {coldCount}×</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteParticipant(p.id, p.name) }}
                    style={{ background: 'none', color: 'var(--text3)', fontSize: 16, lineHeight: 1, padding: '2px 4px', borderRadius: 4, opacity: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = 0; e.currentTarget.style.color = 'var(--text3)' }}
                  >×</button>
                </div>
              )
            })}
          </div>

          {/* Add participant button */}
          <div style={{ padding: 10, borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setModal({ type: 'addParticipant' })}
              style={{
                width: '100%', padding: '8px', borderRadius: 8,
                background: 'rgba(91,143,232,.12)', color: 'var(--accent)',
                fontSize: 13, fontWeight: 500, border: '1px dashed rgba(91,143,232,.3)',
              }}
            >+ Teilnehmer hinzufügen</button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          {view === 'overview' && !selectedP && (
            <OverviewView
              participants={participants}
              bookings={bookings}
              startTime={startTime}
              endTime={endTime}
              timeSlots={timeSlots}
              loading={loading}
              onSelectParticipant={pid => { setSelectedP(pid); setView('participant') }}
            />
          )}
          {view === 'participant' && currentParticipant && (
            <ParticipantView
              participant={currentParticipant}
              bookings={getParticipantBookings(currentParticipant.id)}
              allBookings={bookings}
              startTime={startTime}
              endTime={endTime}
              onBook={(appId, startISO) => addBooking(currentParticipant.id, appId, startISO)}
              onDeleteBooking={deleteBooking}
              isSlotAvailable={isSlotAvailable}
              coldRounds={getColdRounds(currentParticipant.id)}
              saving={saving}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {modal?.type === 'addParticipant' && (
        <Modal onClose={() => setModal(null)} title="Teilnehmer hinzufügen">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addParticipant()}
            placeholder="Name eingeben…"
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg3)', border: '1px solid var(--border2)',
              color: 'var(--text)', fontSize: 14, marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => setModal(null)} secondary>Abbrechen</Btn>
            <Btn onClick={addParticipant} disabled={!newName.trim() || saving}>Hinzufügen</Btn>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  )
}

// ── OVERVIEW ────────────────────────────────────────────────────────────────

function OverviewView({ participants, bookings, startTime, endTime, timeSlots, loading, onSelectParticipant }) {
  if (loading) return <div style={{ padding: 32, color: 'var(--text2)' }}>Laden…</div>
  if (!participants.length) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text2)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6, color: 'var(--text)' }}>Noch keine Teilnehmer</div>
      <div style={{ fontSize: 13 }}>Füge Teilnehmer in der Seitenleiste hinzu</div>
    </div>
  )

  // Build timeline: every 5 min slot
  const HEADER_SLOTS = timeSlots.filter((_, i) => i % 6 === 0) // every 30 min

  function getBookingsForSlot(pid, slotTime) {
    const slotEnd = addMinutes(slotTime, 5)
    return bookings.filter(b =>
      b.participant_id === pid &&
      new Date(b.start_time) < slotEnd &&
      new Date(b.end_time) > slotTime
    )
  }

  return (
    <div style={{ padding: '20px 20px 40px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Zeitplan-Übersicht</h1>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>Alle Teilnehmer auf einen Blick. Klicke auf einen Namen für Details.</p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {APPLICATIONS.map(a => (
          <div key={a.id} style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
            padding: '3px 8px', borderRadius: 99, background: a.color, color: a.textColor, fontWeight: 500,
          }}>{a.icon} {a.name}</div>
        ))}
      </div>

      {/* Timeline table */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 600 }}>
          {/* Time header */}
          <div style={{ display: 'flex', paddingLeft: 130, marginBottom: 4 }}>
            {HEADER_SLOTS.map(s => (
              <div key={s.toISOString()} style={{
                fontSize: 11, color: 'var(--text3)', minWidth: 60,
                flex: '0 0 calc((100% - 130px) / ' + HEADER_SLOTS.length + ')',
              }}>{fmtTime(s)}</div>
            ))}
          </div>

          {participants.map(p => {
            const pBookings = bookings.filter(b => b.participant_id === p.id)
            return (
              <div
                key={p.id}
                onClick={() => onSelectParticipant(p.id)}
                style={{ display: 'flex', alignItems: 'center', marginBottom: 3, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div style={{ width: 130, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, paddingRight: 8 }}>
                  <Avatar name={p.name} size={22} />
                  <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text2)' }}>{p.name}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', height: 22, gap: '1px', borderRadius: 4, overflow: 'hidden' }}>
                  {timeSlots.map(slot => {
                    const slotBookings = getBookingsForSlot(p.id, slot)
                    const b = slotBookings[0]
                    const app = b ? getApp(b.application) : null
                    return (
                      <div key={slot.toISOString()} style={{
                        flex: 1, background: app ? app.color : 'var(--bg3)',
                        minWidth: 0,
                      }} title={app ? `${app.name} ${fmtTime(b.start_time)}–${fmtTime(b.end_time)}` : fmtTime(slot)} />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginTop: 28 }}>
        {APPLICATIONS.slice(0, 7).map(a => {
          const count = bookings.filter(b => b.application === a.id).length
          return (
            <div key={a.id} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{a.icon} {a.name}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Buchungen</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── PARTICIPANT VIEW ─────────────────────────────────────────────────────────

function ParticipantView({ participant, bookings, allBookings, startTime, endTime, onBook, onDeleteBooking, isSlotAvailable, coldRounds, saving }) {
  const [bookingApp, setBookingApp] = useState(null) // appId being booked
  const [bookingTime, setBookingTime] = useState('')

  const coldApp = getApp('cold')
  const maxCold = coldApp.maxPerPerson

  function getTimeOptions(appId) {
    const app = getApp(appId)
    const options = []
    let cur = new Date(startTime)
    while (addMinutes(cur, app.duration) <= endTime) {
      // Check if participant is free
      const pFree = !bookings.some(b => {
        const bs = new Date(b.start_time), be = new Date(b.end_time)
        const ts = cur, te = addMinutes(cur, app.duration)
        return ts < be && te > bs
      })
      // Check capacity
      const capFree = isSlotAvailable(appId, cur.toISOString(), app.duration)
      options.push({ time: new Date(cur), pFree, capFree })
      cur = addMinutes(cur, 5)
    }
    return options
  }

  function handleBook() {
    if (!bookingApp || !bookingTime) return
    onBook(bookingApp, bookingTime)
    setBookingApp(null)
    setBookingTime('')
  }

  const timeOptions = bookingApp ? getTimeOptions(bookingApp) : []

  return (
    <div style={{ padding: '20px 24px 60px', maxWidth: 680 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Avatar name={participant.name} size={44} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>{participant.name}</h1>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            ❄️ {coldRounds} / {maxCold} Kälterunden
          </div>
        </div>
      </div>

      {/* Cold progress */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Kältekammer-Runden</span>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{coldRounds} von {maxCold}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: maxCold }, (_, i) => (
            <div key={i} style={{
              flex: 1, height: 8, borderRadius: 4,
              background: i < coldRounds ? '#BFD9F5' : 'var(--bg3)',
              transition: 'background .3s',
            }} />
          ))}
        </div>
      </div>

      {/* Book new slot */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Neue Buchung</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 7, marginBottom: 12 }}>
          {APPLICATIONS.map(a => {
            const disabled = a.id === 'cold' && coldRounds >= maxCold
            const isSelected = bookingApp === a.id
            return (
              <button
                key={a.id}
                onClick={() => { setBookingApp(isSelected ? null : a.id); setBookingTime('') }}
                disabled={disabled}
                style={{
                  padding: '8px 10px', borderRadius: 8, textAlign: 'left',
                  background: isSelected ? a.color : 'var(--bg3)',
                  border: isSelected ? `2px solid ${a.borderColor}` : '1px solid var(--border)',
                  color: isSelected ? a.textColor : disabled ? 'var(--text3)' : 'var(--text)',
                  fontSize: 12, fontWeight: 500,
                  opacity: disabled ? 0.4 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all .15s',
                }}
              >
                <div>{a.icon} {a.name}</div>
                <div style={{ fontSize: 11, marginTop: 2, opacity: .7, color: isSelected ? a.textColor : 'var(--text3)' }}>{a.displayDuration}</div>
              </button>
            )
          })}
        </div>

        {bookingApp && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Startzeit wählen:</div>
            <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg3)' }}>
              {timeOptions.map(({ time, pFree, capFree }) => {
                const available = pFree && capFree
                const isSelected = bookingTime === time.toISOString()
                return (
                  <div
                    key={time.toISOString()}
                    onClick={() => available && setBookingTime(time.toISOString())}
                    style={{
                      padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: isSelected ? 'rgba(91,143,232,.2)' : 'transparent',
                      cursor: available ? 'pointer' : 'not-allowed',
                      borderBottom: '1px solid var(--border)',
                      opacity: available ? 1 : 0.4,
                    }}
                  >
                    <span style={{ fontSize: 13, color: isSelected ? 'var(--accent)' : 'var(--text)', fontWeight: isSelected ? 600 : 400 }}>
                      {fmtTime(time)} – {fmtTime(addMinutes(time, getApp(bookingApp).duration))}
                    </span>
                    <span style={{ fontSize: 11, color: available ? '#4ade80' : '#f87171' }}>
                      {!pFree ? 'Belegt' : !capFree ? 'Ausgebucht' : 'Frei'}
                    </span>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Btn secondary onClick={() => { setBookingApp(null); setBookingTime('') }}>Abbrechen</Btn>
              <Btn onClick={handleBook} disabled={!bookingTime || saving}>
                {saving ? 'Speichern…' : 'Buchen'}
              </Btn>
            </div>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Heutiger Plan</div>
        {bookings.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: 13, padding: '16px 0' }}>Noch keine Buchungen</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bookings.map(b => {
              const app = getApp(b.application)
              return (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${app.borderColor}`,
                  borderRadius: '0 10px 10px 0', padding: '10px 14px',
                }}>
                  <div style={{ minWidth: 90, fontSize: 12, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
                    padding: '3px 9px', borderRadius: 99, background: app.color, color: app.textColor,
                  }}>
                    {app.icon} {app.name}
                  </div>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => onDeleteBooking(b.id)}
                    style={{ background: 'none', color: 'var(--text3)', fontSize: 16, padding: '2px 6px', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                  >×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── SETUP SCREEN ─────────────────────────────────────────────────────────────

function SetupScreen({ onStart }) {
  const [time, setTime] = useState('18:00')

  function handleStart() {
    const today = new Date()
    const [h, m] = time.split(':').map(Number)
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0)
    onStart(d)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20,
        padding: 40, width: 360, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>❄️</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Race Event</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>Wann startet das Event heute?</p>

        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, marginBottom: 16,
            background: 'var(--bg3)', border: '1px solid var(--border2)',
            color: 'var(--text)', fontSize: 18, textAlign: 'center',
            fontWeight: 600, letterSpacing: 2,
          }}
        />
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
          Event läuft 4 Stunden — endet um {(() => {
            const [h, m] = time.split(':').map(Number)
            const end = new Date(2000, 0, 1, h, m + 240)
            return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
          })()} Uhr
        </p>
        <Btn onClick={handleStart} style={{ width: '100%', padding: '12px' }}>
          Event starten
        </Btn>
      </div>
    </div>
  )
}

// ── SHARED COMPONENTS ────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }) {
  const colors = ['#5B8FE8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color + '22', border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, color, flexShrink: 0,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function Btn({ children, onClick, disabled, secondary, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        background: secondary ? 'transparent' : 'var(--accent)',
        color: secondary ? 'var(--text2)' : '#fff',
        border: secondary ? '1px solid var(--border2)' : 'none',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity .15s',
        ...style,
      }}
    >{children}</button>
  )
}

function NavBtn({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 8,
        background: active ? 'rgba(91,143,232,.15)' : 'transparent',
        border: active ? '1px solid rgba(91,143,232,.3)' : '1px solid transparent',
        color: active ? 'var(--accent)' : 'var(--text2)',
        fontSize: 13, fontWeight: active ? 500 : 400,
        cursor: 'pointer', marginBottom: 2,
      }}
    >{children}</button>
  )
}

function Modal({ children, title, onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
      }}
    >
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 16, padding: 24, width: 360,
        animation: 'fadeIn .15s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text3)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
