export const EVENT_DURATION_HOURS = 4

export const APPLICATIONS = [
  {
    id: 'cold',
    name: 'Kältekammer',
    duration: 18, // 5 umziehen + 3 kälte + 5 aufwärmen + 5 umziehen
    displayDuration: '5 Min Kälte ,
    capacity: 1,
    color: '#BFD9F5',
    textColor: '#0C447C',
    borderColor: '#185FA5',
    icon: '❄️',
    maxPerPerson: 6,
    phases: [
      { name: 'Umziehen', duration: 5 },
      { name: 'Kältekammer', duration: 3 },
      { name: 'Aufwärmen', duration: 5 },
      { name: 'Umziehen', duration: 5 },
    ]
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
    icon: '💆',
  },
  {
    id: 'mcs',
    name: 'M.C.S.',
    duration: 10, // 9 + 5 umziehen
    displayDuration: '9 Min + 5 Min Umziehen',
    capacity: 1,
    color: '#FAC775',
    textColor: '#633806',
    borderColor: '#854F0B',
    icon: '⚡',
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
    icon: '🌊',
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
    icon: '🏋️',
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
    icon: '🔍',
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
    icon: '📊',
  },
  {
    id: 'pause',
    name: 'Pause / Essen & Trinken',
    duration: 10,
    displayDuration: 'Flexibel',
    capacity: 99,
    color: '#F1EFE8',
    textColor: '#5F5E5A',
    borderColor: '#888780',
    icon: '☕',
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
