export const EVENT_DURATION_HOURS = 4

export const APPLICATIONS = [
  {
    id: 'cold',
    name: 'Kaeltekammer',
    duration: 10,
    displayDuration: '10 Min gesamt',
    capacity: 1,
    color: '#BFD9F5',
    textColor: '#0C447C',
    borderColor: '#185FA5',
    icon: '\u2744\uFE0F',
    maxPerPerson: 6,
  },
  {
    id: 'massage',
    name: 'Massage',
    duration: 20,
    displayDuration: '20 Min',
    capacity: 1,
    color: '#9FE1CB',
    textColor: '#085041',
    borderColor: '#0F6E56',
    icon: '\uD83D\uDC86',
  },
  {
    id: 'mcs',
    name: 'M.C.S.',
    duration: 10,
    displayDuration: '10 Min',
    capacity: 1,
    color: '#FAC775',
    textColor: '#633806',
    borderColor: '#854F0B',
    icon: '\u26A1',
  },
  {
    id: 'flow',
    name: 'Flow',
    duration: 12,
    displayDuration: '12 Min',
    capacity: 2,
    color: '#CECBF6',
    textColor: '#3C3489',
    borderColor: '#534AB7',
    icon: '\uD83C\uDF0A',
  },
  {
    id: 'training',
    name: 'Training',
    duration: 15,
    displayDuration: '15 Min',
    capacity: 3,
    color: '#C0DD97',
    textColor: '#27500A',
    borderColor: '#3B6D11',
    icon: '\uD83C\uDFCB\uFE0F',
  },
  {
    id: 'bodyscan',
    name: 'Body Scan',
    duration: 10,
    displayDuration: '10 Min',
    capacity: 1,
    color: '#F4C0D1',
    textColor: '#72243E',
    borderColor: '#993556',
    icon: '\uD83D\uDD0D',
  },
  {
    id: 'bio',
    name: 'Bio-Impedanz',
    duration: 10,
    displayDuration: '10 Min',
    capacity: 1,
    color: '#D3D1C7',
    textColor: '#444441',
    borderColor: '#5F5E5A',
    icon: '\uD83D\uDCCA',
  },
  {
    id: 'pause',
    name: 'Pause',
    duration: 10,
    displayDuration: 'Flexibel',
    capacity: 99,
    color: '#F1EFE8',
    textColor: '#5F5E5A',
    borderColor: '#888780',
    icon: '\u2615',
  },
]

export function getApp(id) {
  return APPLICATIONS.find(a => a.id === id)
}

export function fmtTime(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export function addMinutes(date, mins) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() + mins)
  return d
}
