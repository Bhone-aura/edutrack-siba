import React, { useEffect, useState, useMemo } from 'react'

const KEY_USERS = 'edutrack_users'
const KEY_CURRENT = 'edutrack_current_user'
const KEY_CLASSES_MAP = 'edutrack_classes_map'
const KEY_ASSIGN_MAP = 'edutrack_assignments_map'
const KEY_DARK = 'edutrack_dark' // kept for backward compatibility
const DEFAULT_DARK = false // force initial theme: false = light, true = dark

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial }
    catch(e) { return initial }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)) }, [key, state])
  return [state, setState]
}

function uid() { return Math.random().toString(36).slice(2,9) }

export default function App(){
  // users + current user
  const [users, setUsers] = useLocalStorage(KEY_USERS, [])
  const [currentUser, setCurrentUser] = useLocalStorage(KEY_CURRENT, null)

  // store class & assignment maps per-user to keep data isolated
  const [classesMap, setClassesMap] = useLocalStorage(KEY_CLASSES_MAP, {})
  const [assignMap, setAssignMap] = useLocalStorage(KEY_ASSIGN_MAP, {})

  // legacy/global dark setting (kept but we also persist to user profile)
  const [dark, setDark] = useLocalStorage(KEY_DARK, DEFAULT_DARK)

  // UI state
  const [section, setSection] = useState('dashboard')
  const [selectedDay, setSelectedDay] = useState(() => new Date().toLocaleDateString(undefined,{weekday:'long'}))
  const [showClassModal, setShowClassModal] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [assignFilter, setAssignFilter] = useState('all')
  const [showAuthPage, setShowAuthPage] = useState(false)
  const [authMode, setAuthMode] = useState('login') // 'login' or 'register'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(()=>{
    const t = setInterval(()=> setNow(new Date()), 60_000)
    return ()=> clearInterval(t)
  },[])

  // derive current user id (use 'guest' when not logged in)
  const userId = currentUser?.id || 'guest'

  // derive visible lists from the maps
  const classes = classesMap[userId] || []
  const assignments = assignMap[userId] || []

  // theme: apply dark class and keep preference per-user when logged in
  useEffect(()=>{ document.documentElement.classList.toggle('dark', !!dark) },[dark])

  useEffect(()=>{
    // if the user has a stored dark preference, use it; otherwise leave global
    if (currentUser?.dark !== undefined) setDark(!!currentUser.dark)
  },[currentUser])

  // when dark toggles and a user is logged in, persist to user profile
  useEffect(()=>{
    if (!currentUser) return
    const updated = users.map(u=> u.id===currentUser.id? {...u, dark}:{...u})
    setUsers(updated)
    setCurrentUser({...currentUser, dark})
  },[dark])

  // simple auth helpers
  function register(username, password, name){
    if(!username || !password) return alert('Username and password required')
    if(users.find(u=>u.username===username)) return alert('Username already exists')
    const displayName = name?.trim() || username
    const user = { id: uid(), username, password, dark:false, name: displayName }
    setUsers(prev=>[...prev, user])
    // initialize empty maps for this user
    setClassesMap(prev=>({ ...prev, [user.id]: [] }))
    setAssignMap(prev=>({ ...prev, [user.id]: [] }))
    setCurrentUser(user)
    alert('Registered and logged in as ' + username)
  }
  function login(username, password){
    const user = users.find(u=>u.username===username && u.password===password)
    if(!user) return alert('Invalid credentials')
    setCurrentUser(user)
    setDark(!!user.dark)
    alert('Logged in as ' + username)
  }
  function logout(){ setCurrentUser(null); setDark(false); alert('Logged out') }

  // Full-screen Auth page (Google-like design)
  function AuthScreen(){
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')

    function submit(e){
      e.preventDefault();
      if(authMode==='login'){
        login(email, password)
      } else {
        register(email, password, name)
      }
      setShowAuthPage(false);
      setEmail(''); setPassword(''); setName('')
    }

    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 ${showAuthPage? '':'hidden'}`}>
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-2xl mx-4 p-6 md:p-10">
          <div className="md:flex md:gap-6">
            <div className="hidden md:flex md:flex-col md:items-center md:justify-center md:w-1/2 bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-2xl p-6 text-white">
              <div className="text-4xl font-bold mb-3">EduTrack</div>
              <div className="text-sm opacity-90">Organize classes, assignments, and schedules</div>
            </div>

            <div className="w-full md:w-1/2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-semibold">{authMode==='login'? 'Sign in' : 'Create account'}</h3>
                <button onClick={()=>{ setShowAuthPage(false) }} className="text-sm text-slate-500">Close</button>
              </div>

              <div className="space-y-4">
                <form onSubmit={submit} className="space-y-3">
                  {authMode==='register' && (
                    <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700" />
                  )}
                  <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email or username" className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700" />
                  <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700" />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <label className="flex items-center gap-2"><input type="checkbox" /> Remember</label>
                    {authMode==='login' && <button type="button" className="text-indigo-600">Forgot password?</button>}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={()=>{ setAuthMode(authMode==='login'?'register':'login') }} className="px-4 py-2 rounded-lg bg-slate-100">{authMode==='login'? 'Create account' : 'Have an account?'}</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white">{authMode==='login'? 'Sign in' : 'Register'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // seed sample on first load (create a demo user if nothing exists)
  useEffect(()=>{
    if (Object.keys(classesMap).length===0 && Object.keys(assignMap).length===0 && users.length===0) {
      const today = new Date()
      const tomorrow = new Date(); tomorrow.setDate(today.getDate()+1)
      const in3 = new Date(); in3.setDate(today.getDate()+3)
      const in6 = new Date(); in6.setDate(today.getDate()+6)
    // Intentionally do not create a demo user — start on the auth/login screen
    // Leave users  /classes/assignments empty so the app opens at the login/register page
    }
  }, [])

  // Helpers: classes CRUD (operate on classesMap for current user)
  function addClass(obj){
    setClassesMap(prev=>{
      const nxt = { ...prev }
      const list = nxt[userId] ? [...nxt[userId]] : []
      list.push({ id: uid(), ...obj })
      nxt[userId] = list
      return nxt
    })
  }
  function updateClass(id, updates){
    setClassesMap(prev=>{
      const nxt = { ...prev }
      nxt[userId] = (nxt[userId] || []).map(c=> c.id===id? {...c,...updates}: c)
      return nxt
    })
  }
  function deleteClass(id){
    setClassesMap(prev=>{
      const nxt = { ...prev }
      nxt[userId] = (nxt[userId] || []).filter(c=> c.id!==id)
      return nxt
    })
  }

  // assignments CRUD (per-user)
  function addAssignment(obj){
    setAssignMap(prev=>{
      const nxt = { ...prev }
      const list = nxt[userId] ? [...nxt[userId]] : []
      list.push({ id: uid(), completed:false, ...obj })
      nxt[userId] = list
      return nxt
    })
  }
  function updateAssignment(id, updates){
    setAssignMap(prev=>{
      const nxt = { ...prev }
      nxt[userId] = (nxt[userId] || []).map(a=> a.id===id? {...a,...updates}: a)
      return nxt
    })
  }
  function deleteAssignment(id){
    setAssignMap(prev=>{
      const nxt = { ...prev }
      nxt[userId] = (nxt[userId] || []).filter(a=> a.id!==id)
      return nxt
    })
  }

  function markAssignment(id, completed){ updateAssignment(id, { completed }) }

  // Date helpers
  function formatPretty(iso){ if(!iso) return ''; const d=new Date(iso+'T00:00:00'); return d.toLocaleDateString(undefined,{month:'short', day:'numeric'}) }
  function isOverdue(iso){ if(!iso) return false; const today=new Date(); today.setHours(0,0,0,0); const d=new Date(iso+'T00:00:00'); return d < today }
  function inNextNDays(iso,n){ if(!iso) return false; const today=new Date(); today.setHours(0,0,0,0); const d=new Date(iso+'T00:00:00'); const diff=(d-today)/(1000*60*60*24); return diff>=0 && diff<=n }

  // dashboard today's classes using getDay()
  const todayName = useMemo(()=>{ const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; return days[new Date().getDay()] },[])
  const todaysClasses = classes.filter(c=>c.day===todayName).sort((a,b)=>a.startTime.localeCompare(b.startTime))
  const dueSoon = assignments.filter(a=>inNextNDays(a.dueDate,7)).sort((x,y)=>x.dueDate.localeCompare(y.dueDate))

  // schedule list for selectedDay
  const classesForSelected = classes.filter(c=>c.day===selectedDay).sort((a,b)=>a.startTime.localeCompare(b.startTime))

  // assignments with filter
  const assignmentsFiltered = assignments.slice().sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).filter(a=>assignFilter==='all'?true:assignFilter==='pending'?!a.completed:a.completed)

  // UI components
  const DaySelector = ()=>{
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    return (
      <div id="day-selector" className="flex gap-2 overflow-x-auto">
        {days.map(d=> (
          <button key={d} onClick={()=>setSelectedDay(d)} className={`px-3 py-2 rounded-lg ${d===selectedDay?'bg-indigo-600 text-white':'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>{d.slice(0,3)}</button>
        ))}
      </div>
    )
  }

  function openAddClass(day){ setEditingClass(null); setShowClassModal(true); if(day) setSelectedDay(day) }
  function openEditClass(c){ setEditingClass(c); setShowClassModal(true) }

  // Class form component (modal)
  function ClassModal(){
    const [day,setDay] = useState(editingClass?.day || selectedDay || 'Monday')
    const [start,setStart] = useState(editingClass?.startTime || '09:00')
    const [end,setEnd] = useState(editingClass?.endTime || '10:00')
    const [subject,setSubject] = useState(editingClass?.subject || '')
    const [teacher,setTeacher] = useState(editingClass?.teacher || '')
    const [room,setRoom] = useState(editingClass?.room || '')

    useEffect(()=>{
      setDay(editingClass?.day || selectedDay || 'Monday')
      setStart(editingClass?.startTime || '09:00')
      setEnd(editingClass?.endTime || '10:00')
      setSubject(editingClass?.subject || '')
      setTeacher(editingClass?.teacher || '')
      setRoom(editingClass?.room || '')
    },[editingClass, selectedDay])

    function submit(e){ e.preventDefault();
      if(!subject.trim()) return alert('Please enter a subject.')
      const payload = { day, startTime:start, endTime:end, subject:subject.trim(), teacher:teacher.trim(), room:room.trim() }
      if(editingClass) updateClass(editingClass.id, payload)
      else addClass(payload)
      setShowClassModal(false)
    }

    return (
      <div className={`fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 ${showClassModal?'':'hidden'}`} onClick={(e)=>{ if(e.target===e.currentTarget) setShowClassModal(false) }}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-3">{editingClass? 'Edit Class' : 'Add Class'}</h3>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label>
                <div className="text-xs text-slate-500 mb-1">Day</div>
                <select value={day} onChange={e=>setDay(e.target.value)} className="w-full rounded-lg p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d=> <option key={d}>{d}</option>)}
                </select>
              </label>
              <label>
                <div className="text-xs text-slate-500 mb-1">Room</div>
                <input value={room} onChange={e=>setRoom(e.target.value)} className="w-full rounded-lg p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700" placeholder="e.g., Room 101" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <div className="text-xs text-slate-500 mb-1">Start</div>
                <input type="time" value={start} onChange={e=>setStart(e.target.value)} className="w-full rounded-lg p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700" />
              </label>
              <label>
                <div className="text-xs text-slate-500 mb-1">End</div>
                <input type="time" value={end} onChange={e=>setEnd(e.target.value)} className="w-full rounded-lg p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700" />
              </label>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Subject</div>
              <input value={subject} onChange={e=>setSubject(e.target.value)} className="w-full rounded-lg p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700" placeholder="e.g., Math" />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Teacher</div>
              <input value={teacher} onChange={e=>setTeacher(e.target.value)} className="w-full rounded-lg p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700" placeholder="e.g., Ms. Smith" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={()=>setShowClassModal(false)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Save</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // topbar / sidebar / mobile bottom nav UI
  function Sidebar(){
    // removed desktop sidebar to use the mobile header for all sizes
    return null
  }

  function Topbar(){
    // removed desktop topbar — MobileTop will be used for all sizes
    return null
  }

  function MobileTop(){
    return (
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60">
        <button onClick={()=>setMobileNavOpen(true)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Open navigation">
          <svg className="w-6 h-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">ET</div>
          <div>
            <div className="font-semibold">EduTrack</div>
            <div className="text-xs text-slate-500 dark:text-slate-300">SIBA College</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser? (
            <button onClick={logout} className="px-3 py-1 rounded bg-red-100 text-red-600 text-xs">Logout</button>
          ) : (
            <button onClick={()=>{ setAuthMode('login'); setShowAuthPage(true) }} className="px-3 py-1 rounded bg-indigo-600 text-white text-xs">Login</button>
          )}
        </div>
      </div>
    )
  }

  // Mobile navigation overlay (slide-in) for small screens
  function MobileNavOverlay(){
    if(!mobileNavOpen) return null
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/40" onClick={()=>setMobileNavOpen(false)} />
        <div className="relative w-64 bg-white dark:bg-slate-800 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">ET</div>
              <div>
                <div className="font-semibold">EduTrack</div>
                <div className="text-xs text-slate-500 dark:text-slate-300">SIBA College</div>
              </div>
            </div>
            <button onClick={()=>setMobileNavOpen(false)} className="px-2 py-1 rounded bg-slate-100 text-sm">Close</button>
          </div>

          <nav className="space-y-2">
            {[['dashboard','Home'],['schedule','Schedule'],['assignments','Assignments'],['settings','Settings']].map(([id,label])=> (
              <button key={id} onClick={()=>{ setSection(id); setMobileNavOpen(false) }} className={`w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 flex items-center gap-3 ${section===id? 'bg-indigo-50 dark:bg-slate-700': ''}`}>
                <span className="text-indigo-600 font-medium">{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 text-sm text-slate-500 dark:text-slate-300">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button onClick={()=>{ setDark(!dark); setMobileNavOpen(false) }} className="px-2 py-1 rounded bg-slate-100 text-xs">Theme</button>
                <button onClick={()=>{ logout(); setMobileNavOpen(false) }} className="px-2 py-1 rounded bg-red-100 text-red-600 text-xs">Logout</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={()=>{ setAuthMode('login'); setShowAuthPage(true); setMobileNavOpen(false) }} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs">Login</button>
                <button onClick={()=>{ setAuthMode('register'); setShowAuthPage(true); setMobileNavOpen(false) }} className="px-2 py-1 rounded bg-slate-100 text-xs">Register</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Mobile bottom navigation for small screens
  function BottomNav(){
    // Hidden because Sidebar is shown on md+ and mobile overlay provides nav
    return null
  }

  // Sections
  function Dashboard(){
    const hour = now.getHours();
    const greet = hour<12? 'Good morning' : hour<18? 'Good afternoon' : 'Good evening'
    const displayName = currentUser?.name || currentUser?.username || 'Student'
    const firstName = String(displayName).split(' ')[0]
     return (
      <section id="dashboard">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="text-2xl font-bold flex items-center gap-3"><span className="text-indigo-600">EduTrack</span><span className="text-sm text-slate-500 dark:text-slate-300">• SIBA Student</span></div>
            <div id="greeting" className="text-slate-600 dark:text-slate-300 mt-1">{greet}, {firstName}!</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500 dark:text-slate-300 hidden md:block">Quick actions</div>
            <button onClick={()=>{ setSection('schedule'); }} id="open-schedule" className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Open Schedule</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Today's Classes</h3>
              <div className="text-sm text-slate-500 dark:text-slate-300" id="today-date">{new Date().toLocaleDateString()}</div>
            </div>
            <div id="today-classes-list" className="space-y-3">
              {todaysClasses.length===0? (
                <div className="text-sm text-slate-500 dark:text-slate-300">No classes today.</div>
              ) : todaysClasses.map(c=> (
                <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{c.subject}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">{c.teacher} • {c.room}</div>
                  </div>
                  <div className="text-sm text-indigo-600 font-medium">{c.startTime} - {c.endTime}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Assignments Due Soon</h3>
              <div className="text-sm text-slate-500 dark:text-slate-300">Next 7 days</div>
            </div>
            <div id="due-soon-list" className="space-y-3">
              {dueSoon.length===0? (
                <div className="text-sm text-slate-500 dark:text-slate-300">No upcoming assignments in the next 7 days.</div>
              ) : dueSoon.map(a=> (
                <div key={a.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <div className={`font-semibold ${a.completed? 'line-through text-slate-400':''}`}>{a.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">{a.subject}</div>
                  </div>
                  <div className="text-right">
                    <div className={`${isOverdue(a.dueDate) && !a.completed? 'text-red-500 font-medium':'text-slate-600 dark:text-slate-300'}`}>{formatPretty(a.dueDate)}</div>
                    <div className="text-xs text-slate-400">{a.completed? 'Completed':'Due'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  function Schedule(){
    return (
      <section id="schedule" className="section-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Schedule</h2>
          <div className="text-sm text-slate-500 dark:text-slate-300">View and manage classes</div>
        </div>
        <DaySelector />
        <div className="space-y-4 mt-4" id="classes-for-day">
          {classesForSelected.length===0? <div className="text-sm text-slate-500 dark:text-slate-300">No classes for this day.</div> : classesForSelected.map(c=> (
            <div key={c.id} className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow flex items-center justify-between">
              <div>
                <div className="font-semibold text-indigo-600">{c.subject}</div>
                <div className="text-sm text-slate-500 dark:text-slate-300">{c.teacher} • {c.room}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-slate-500 dark:text-slate-300 mr-2">{c.startTime} - {c.endTime}</div>
                <button onClick={()=>openEditClass(c)} className="edit-class px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-sm">Edit</button>
                <button onClick={()=>{ if(confirm('Delete this class?')) deleteClass(c.id) }} className="delete-class px-2 py-1 rounded bg-red-100 text-red-600 text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={()=>openAddClass(selectedDay)} id="open-add-class" className="fixed right-4 bottom-20 md:bottom-8 md:right-8 fab bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 z-40">
          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
        </button>
      </section>
    )
  }

  function Assignments(){
    // add form state
    const [title,setTitle] = useState('')
    const [subject,setSubject] = useState('')
    const [due,setDue] = useState('')
    const [desc,setDesc] = useState('')

    function submit(e){ e.preventDefault(); if(!title.trim()) return; addAssignment({ title:title.trim(), subject:subject.trim(), dueDate:due, description:desc.trim() }); setTitle(''); setSubject(''); setDue(''); setDesc(''); }

    const btnClass = (f) => 'assign-filter px-3 py-1 rounded-lg ' + (assignFilter===f ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200')

    return (
      <section id="assignments" className="section-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Assignments</h2>
          <div className="text-sm text-slate-500 dark:text-slate-300">Track due dates & status</div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow mb-4">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={()=>setAssignFilter('all')} className={btnClass('all')} data-filter="all">All</button>
            <button onClick={()=>setAssignFilter('pending')} className={btnClass('pending')} data-filter="pending">Pending</button>
            <button onClick={()=>setAssignFilter('completed')} className={btnClass('completed')} data-filter="completed">Completed</button>
            <div className="ml-auto text-sm text-slate-500 dark:text-slate-300">
              <button onClick={()=>{ setSection('schedule'); setTimeout(()=>openAddClass(),100) }} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Add Assignment</button>
            </div>
          </div>

          <form id="assignment-form" onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input id="a-title" value={title} onChange={e=>setTitle(e.target.value)} required placeholder="Title" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 col-span-1 md:col-span-1" />
            <input id="a-subject" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 col-span-1" />
            <input id="a-due" value={due} onChange={e=>setDue(e.target.value)} type="date" className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 col-span-1" />
            <textarea id="a-desc" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (optional)" className="col-span-1 md:col-span-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700"></textarea>
            <div className="flex justify-end md:col-span-3">
              <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Add Assignment</button>
            </div>
          </form>
        </div>

        <div id="assignments-list" className="space-y-3">
          {assignmentsFiltered.length===0? <div className="text-sm text-slate-500 dark:text-slate-300">No assignments.</div> : assignmentsFiltered.map(a=> (
            <div key={a.id} className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!a.completed} onChange={(e)=>markAssignment(a.id, e.target.checked)} className="assign-check" />
                </label>
                <div>
                  <div className={`font-semibold ${a.completed? 'line-through text-slate-400':''}`}>{a.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-300">{a.subject} • {a.description}</div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div className={`${isOverdue(a.dueDate) && !a.completed? 'text-red-500 font-bold':'text-slate-600 dark:text-slate-300'}`}>{formatPretty(a.dueDate)}</div>
                <div className="flex gap-2">
                  <button onClick={()=>{ if(confirm('Delete this assignment?')) deleteAssignment(a.id) }} className="delete-assignment text-sm px-2 py-1 rounded bg-red-100 text-red-600">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  function Settings(){
    return (
      <section id="settings" className="section-hidden">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow">
          <h3 className="font-semibold mb-3">Settings</h3>
          <div className="flex items-center gap-4 mb-4">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-300">Dark mode</div>
              <div className="text-xs text-slate-400 dark:text-slate-400">Toggle persistent dark theme</div>
            </div>
            <div className="ml-auto">
              <button id="settings-dark-toggle" onClick={()=>setDark(!dark)} className="px-3 py-2 rounded-lg bg-indigo-600 text-white">{dark ? 'Toggle Light' : 'Toggle Dark'}</button>
            </div>
          </div>
          <div className="mb-4">
            <button onClick={()=>{
              if(!confirm('Clear all data for the current user?')) return;
              if(!currentUser){ alert('No user is logged in'); return }
              // remove this user's classes and assignments from the maps
              setClassesMap(prev=>{ const nxt = {...prev}; delete nxt[userId]; return nxt })
              setAssignMap(prev=>{ const nxt = {...prev}; delete nxt[userId]; return nxt })
              alert('Cleared data for ' + (currentUser?.username || 'user'))
            }} className="px-4 py-2 rounded-lg bg-red-600 text-white">Clear all data</button>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-300">School project by GitHub Copilot</div>
        </div>
      </section>
    )
  }

  // Error boundary to surface runtime errors instead of a white screen
  class ErrorBoundary extends React.Component {
    constructor(props){ super(props); this.state = { hasError: false, error: null } }
    static getDerivedStateFromError(error){ return { hasError: true, error } }
    componentDidCatch(error, info){ console.error('ErrorBoundary caught', error, info) }
    render(){
      if(this.state.hasError){
        return (
          <div className="p-6 min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
            <div className="max-w-2xl w-full bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
              <pre className="text-xs text-red-600 mb-4">{String(this.state.error)}</pre>
              <div className="flex gap-2 justify-end">
                <button onClick={()=>{ this.setState({ hasError:false, error:null }); window.location.reload() }} className="px-4 py-2 rounded bg-indigo-600 text-white">Reload</button>
              </div>
            </div>
          </div>
        )
      }
      return this.props.children
    }
  }

  return (
    <ErrorBoundary>
      <div className="antialiased">
        <div className="md:flex md:min-h-screen">
          <Sidebar />
          <div className="flex-1 min-h-screen flex flex-col">
            <Topbar />
            <MobileTop />
            <main className="p-4 md:p-6 flex-1 overflow-y-auto">
              <div className={`${section!=='dashboard'?'hidden':''}`}><Dashboard /></div>
              <div className={`${section!=='schedule'?'hidden':''}`}><Schedule /></div>
              <div className={`${section!=='assignments'?'hidden':''}`}><Assignments /></div>
              <div className={`${section!=='settings'?'hidden':''}`}><Settings /></div>
            </main>
          </div>
          <ClassModal />
          <MobileNavOverlay />
        </div>
        <BottomNav />
        <AuthScreen />
      </div>
    </ErrorBoundary>
  )
}
