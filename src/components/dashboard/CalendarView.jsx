import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export default function CalendarView({ sessions, onSessionClick, getPhaseColor }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  
  // Adjust to start on Monday (JS Date: 0 = Sunday)
  let startDay = firstDayOfMonth.getDay()
  startDay = startDay === 0 ? 6 : startDay - 1

  const daysInMonth = lastDayOfMonth.getDate()
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  const calendarDays = []

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthLastDay - i,
      month: month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false
    })
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true
    })
  }

  // Next month days
  const remainingDays = 42 - calendarDays.length
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({
      day: i,
      month: month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false
    })
  }

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const handleToday = () => setCurrentDate(new Date())

  const isToday = (d, m, y) => {
    const now = new Date()
    return d === now.getDate() && m === now.getMonth() && y === now.getFullYear()
  }

  const getSessionsForDay = (d, m, y) => {
    const dayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return sessions.filter(s => s.date && s.date.startsWith(dayStr))
  }

  return (
    <div className="calendar-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Calendar Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'var(--space-md)', padding: '0 var(--space-xs)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-800)' }}>
            {MONTHS[month]} {year}
          </h4>
          <button className="btn btn-ghost" onClick={handleToday} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>Aujourd'hui</button>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          <button className="btn btn-ghost btn-icon" onClick={handlePrevMonth}><ChevronLeft size={18} /></button>
          <button className="btn btn-ghost btn-icon" onClick={handleNextMonth}><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* Days Legend */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        textAlign: 'center', marginBottom: 'var(--space-xs)'
      }}>
        {DAYS.map(d => (
          <div key={d} style={{
            fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gridAutoRows: 'minmax(100px, 1fr)', gap: '1px',
        backgroundColor: 'var(--border-light)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden', flex: 1
      }}>
        {calendarDays.map((dateObj, idx) => {
          const daySessions = getSessionsForDay(dateObj.day, dateObj.month, dateObj.year)
          const today = isToday(dateObj.day, dateObj.month, dateObj.year)
          
          return (
            <div
              key={idx}
              style={{
                backgroundColor: 'white', padding: '8px',
                display: 'flex', flexDirection: 'column', gap: '4px',
                opacity: dateObj.isCurrentMonth ? 1 : 0.4,
                position: 'relative', minHeight: 0
              }}
            >
              {/* Day Number */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{
                  fontSize: '0.85rem', fontWeight: today ? 800 : 500,
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', background: today ? 'var(--primary-600)' : 'transparent',
                  color: today ? 'white' : 'inherit'
                }}>
                  {dateObj.day}
                </span>
              </div>

              {/* Sessions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
                {daySessions.sort((a,b) => a.date.localeCompare(b.date)).map(s => {
                  const colors = getPhaseColor(s.phase || 'debut')
                  return (
                    <div
                      key={s.id}
                      onClick={() => onSessionClick(s)}
                      style={{
                        fontSize: '0.65rem', padding: '2px 6px',
                        borderRadius: '4px', cursor: 'pointer',
                        background: colors?.bg || 'var(--primary-50)',
                        borderLeft: `3px solid ${colors?.color || 'var(--primary-500)'}`,
                        color: colors?.color || 'var(--primary-900)',
                        fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        overflow: 'hidden', transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'}
                      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                    >
                      {s.date.split('T')[1].substring(0, 5)} {s.clientName || 'Séance'}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
