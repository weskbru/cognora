/**
 * Adapter que expoe a mesma interface do Base44 SDK, mas chama o backend Python local.
 * Nenhum dos 24 arquivos da app precisa mudar — so este arquivo.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

async function request(method, path, body = null) {
  const token = localStorage.getItem('cognora_token')
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== null ? { body: JSON.stringify(body) } : {}),
  })

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({ detail: res.statusText }))

  if (!res.ok) {
    throw { status: res.status, message: data.detail || 'Erro na requisicao' }
  }

  return data
}

function createEntity(entityName) {
  const base = `/api/${entityName}`

  return {
    async list(sort = null, limit = null) {
      const params = new URLSearchParams()
      if (sort) params.set('sort', sort)
      if (limit) params.set('limit', String(limit))
      const qs = params.toString() ? `?${params}` : ''
      return request('GET', `${base}${qs}`)
    },

    async filter(filters) {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null) params.set(k, String(v))
      }
      const qs = params.toString() ? `?${params}` : ''
      return request('GET', `${base}${qs}`)
    },

    async get(id) {
      return request('GET', `${base}/${id}`)
    },

    async create(data) {
      return request('POST', base, data)
    },

    async update(id, data) {
      return request('PUT', `${base}/${id}`, data)
    },

    async delete(id) {
      return request('DELETE', `${base}/${id}`)
    },

    async bulkCreate(items) {
      return Promise.all(items.map(item => request('POST', base, item)))
    },
  }
}

export const base44 = {
  entities: {
    Subject: createEntity('subjects'),
    Document: createEntity('documents'),
    Question: createEntity('questions'),
    Summary: createEntity('summaries'),
    Competition: createEntity('competitions'),
    UserProgress: createEntity('user_progress'),
    Flashcard: createEntity('flashcards'),
    QuestionAttempt: createEntity('question_attempts'),
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        const token = localStorage.getItem('cognora_token')
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || 'Falha no upload')
        }
        return res.json() // { file_url: '...' }
      },

      async InvokeLLM({ prompt, file_urls, response_json_schema }) {
        return request('POST', '/api/ai/invoke', { prompt, file_urls, response_json_schema })
      },

      async AnalisarDocumento({ file_url }) {
        return request('POST', '/api/nlp/analisar-documento', { file_url })
      },
    },
  },

  limits: {
    async getStatus() {
      return request('GET', '/api/limits/status')
    },
  },

  auth: {
    async me() {
      return request('GET', '/api/auth/me')
    },

    async logout(redirectUrl) {
      localStorage.removeItem('cognora_token')
      window.location.href = redirectUrl || '/login'
    },

    redirectToLogin() {
      window.location.href = '/login'
    },
  },
}
