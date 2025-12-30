import { Hono } from 'hono'

type Bindings = {
  task_db: D1Database
  USER_CONFIG: KVNamespace
  AI: any
}

const app = new Hono<{ Bindings: Bindings }>()

// --------------------
// Middleware: CORS + common headers
// --------------------
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Cache-Control', 'no-store')
  await next()
})

app.options('*', (c) => c.text('', 204))

// --------------------
// Light UI at "/"
// --------------------
app.get('/', async (c) => {
  return c.html(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Task AI Edge</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; max-width: 920px; }
    .card { border: 1px solid #eee; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    input, textarea, select, button { font: inherit; padding: 10px; border-radius: 10px; border: 1px solid #ddd; }
    textarea { width: 100%; min-height: 72px; }
    input { width: 100%; }
    button { cursor: pointer; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .muted { color: #666; font-size: 12px; }
    .title { display:flex; justify-content: space-between; align-items:center; gap: 8px; }
    .pill { padding: 4px 10px; border-radius: 999px; background: #f4f4f4; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Task AI Edge</h1>
  <p class="muted">Light UI served from Cloudflare Worker. Uses D1 + KV + Workers AI.</p>

  <div class="card">
    <h3>Create Task</h3>
    <div style="margin-bottom:10px;">
      <label class="muted">Title</label>
      <input id="title" placeholder="e.g., Final Deployment Test" />
    </div>
    <div style="margin-bottom:10px;">
      <label class="muted">Description</label>
      <textarea id="description" placeholder="Describe the task..."></textarea>
    </div>
    <button id="createBtn">Create</button>
    <div id="createMsg" class="muted" style="margin-top:10px;"></div>
  </div>

  <div class="card">
    <div class="title">
      <h3 style="margin:0;">Preferences</h3>
      <span class="pill" id="themePill">theme: ...</span>
    </div>
    <div class="row" style="margin-top:10px;">
      <div>
        <label class="muted">Theme</label>
        <select id="theme">
          <option value="light">light</option>
          <option value="dark">dark</option>
        </select>
      </div>
      <div style="display:flex;align-items:flex-end;">
        <button id="saveTheme">Save Theme</button>
      </div>
    </div>
    <div id="prefMsg" class="muted" style="margin-top:10px;"></div>
  </div>

  <h2>All Tasks</h2>
  <div id="tasks"></div>

<script>
  const $ = (id) => document.getElementById(id)
  const apiBase = location.origin

  async function fetchTasks() {
    const res = await fetch(apiBase + '/tasks')
    const data = await res.json()
    $('themePill').textContent = 'theme: ' + data.theme
    $('theme').value = data.theme || 'light'

    const container = $('tasks')
    container.innerHTML = ''
    for (const t of data.tasks) {
      const el = document.createElement('div')
      el.className = 'card'
      el.innerHTML = \`
        <div class="title">
          <strong>\${escapeHtml(t.title)}</strong>
          <span class="pill">\${escapeHtml(t.status)}</span>
        </div>
        <div class="muted">id: \${t.id} • created: \${escapeHtml(t.created_at)}</div>
        <p>\${escapeHtml(t.description || '')}</p>
        <div class="muted"><strong>AI:</strong> \${escapeHtml(t.ai_summary || '(none)')}</div>

        <div class="row" style="margin-top:12px;">
          <div>
            <label class="muted">Update Status</label>
            <select data-id="\${t.id}" class="statusSel">
              <option value="pending" \${t.status === 'pending' ? 'selected' : ''}>pending</option>
              <option value="done" \${t.status === 'done' ? 'selected' : ''}>done</option>
            </select>
          </div>
          <div style="display:flex;align-items:flex-end;gap:10px;">
            <button data-id="\${t.id}" class="saveBtn">Save</button>
            <button data-id="\${t.id}" class="delBtn">Delete</button>
          </div>
        </div>
      \`
      container.appendChild(el)
    }

    document.querySelectorAll('.saveBtn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id')
        const sel = document.querySelector('.statusSel[data-id="'+id+'"]')
        const status = sel.value
        await fetch(apiBase + '/tasks/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        })
        fetchTasks()
      })
    })

    document.querySelectorAll('.delBtn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id')
        await fetch(apiBase + '/tasks/' + id, { method: 'DELETE' })
        fetchTasks()
      })
    })
  }

  $('createBtn').addEventListener('click', async () => {
    $('createMsg').textContent = ''
    const title = $('title').value
    const description = $('description').value
    const res = await fetch(apiBase + '/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      $('createMsg').textContent = 'Error: ' + (data.error || res.status)
      return
    }
    $('title').value = ''
    $('description').value = ''
    $('createMsg').textContent = 'Created. AI summary: ' + (data.ai_summary || '(none)')
    fetchTasks()
  })

  $('saveTheme').addEventListener('click', async () => {
    $('prefMsg').textContent = ''
    const theme = $('theme').value
    const res = await fetch(apiBase + '/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    })
    const data = await res.json().catch(() => ({}))
    $('prefMsg').textContent = res.ok ? 'Saved.' : ('Error: ' + (data.error || res.status))
    fetchTasks()
  })

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;")
  }

  fetchTasks()
</script>
</body>
</html>`)
})

// --------------------
// Preferences (KV)
// --------------------
app.get('/preferences', async (c) => {
  const theme = (await c.env.USER_CONFIG.get('theme')) || 'light'
  return c.json({ theme }, 200)
})

app.put('/preferences', async (c) => {
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON' }, 400) }

  const theme = typeof body.theme === 'string' ? body.theme.trim() : ''
  if (!['light', 'dark'].includes(theme)) return c.json({ error: 'theme must be light or dark' }, 400)

  await c.env.USER_CONFIG.put('theme', theme)
  return c.json({ message: 'Preferences updated', theme }, 200)
})

// --------------------
// Tasks CRUD (D1 + AI)
// --------------------
app.post('/tasks', async (c) => {
  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON body' }, 400) }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''

  if (!title) return c.json({ error: 'title is required' }, 400)

  let summary: string | null = null
  if (description) {
    try {
      const aiOutput = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
        prompt: `Summarize this task in one short sentence: ${description}`
      })
      summary = typeof aiOutput?.response === 'string' ? aiOutput.response : null
    } catch {
      summary = null
    }
  }

  const res = await c.env.task_db
    .prepare('INSERT INTO tasks (title, description, ai_summary) VALUES (?, ?, ?)')
    .bind(title, description || null, summary)
    .run()

  const id = res.meta?.last_row_id
  return c.json({ message: 'Task created', id, ai_summary: summary }, 201)
})

app.get('/tasks', async (c) => {
  const theme = (await c.env.USER_CONFIG.get('theme')) || 'light'
  const { results } = await c.env.task_db.prepare('SELECT * FROM tasks ORDER BY id DESC').all()
  return c.json({ theme, tasks: results }, 200)
})

app.get('/tasks/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const row = await c.env.task_db
    .prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(id)
    .first()

  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row, 200)
})

app.patch('/tasks/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  let body: any
  try { body = await c.req.json() } catch { return c.json({ error: 'Invalid JSON body' }, 400) }

  const title = typeof body.title === 'string' ? body.title.trim() : undefined
  const description = typeof body.description === 'string' ? body.description.trim() : undefined
  const status = typeof body.status === 'string' ? body.status.trim() : undefined

  if (status && !['pending', 'done'].includes(status)) {
    return c.json({ error: 'status must be pending or done' }, 400)
  }

  const existing = await c.env.task_db
    .prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) return c.json({ error: 'Not found' }, 404)

  // regenerate AI summary only if description changed & non-empty
  let summary: string | null = existing.ai_summary as any
  if (typeof description === 'string' && description !== (existing.description as any) && description) {
    try {
      const aiOutput = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
        prompt: `Summarize this task in one short sentence: ${description}`
      })
      if (typeof aiOutput?.response === 'string') summary = aiOutput.response
    } catch {
      // keep old summary
    }
  }

  const newTitle = typeof title === 'string' && title ? title : (existing.title as any)
  const newDesc = typeof description === 'string' ? (description || null) : (existing.description as any)
  const newStatus = typeof status === 'string' ? status : (existing.status as any)

  await c.env.task_db
    .prepare('UPDATE tasks SET title = ?, description = ?, ai_summary = ?, status = ? WHERE id = ?')
    .bind(newTitle, newDesc, summary, newStatus, id)
    .run()

  return c.json({ message: 'Updated', id }, 200)
})

app.delete('/tasks/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.json({ error: 'Invalid id' }, 400)

  const existing = await c.env.task_db
    .prepare('SELECT id FROM tasks WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) return c.json({ error: 'Not found' }, 404)

  await c.env.task_db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run()
  return c.text('', 204)
})

export default app
