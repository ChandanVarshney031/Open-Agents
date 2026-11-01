import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  Bot,
  Folder,
  GitBranch,
  Settings,
  ArrowRight,
  Command,
} from 'lucide-react'
import { useAgents } from '../lib/useAgents'
import { DEFAULT_COLLECTION_ID, loadCollections, useCollections } from '../lib/useCollections'
import { fetchWorkflows } from '../hooks/useWorkflows'
import { useDialogFocus } from '../hooks/useDialogFocus'

const STATIC_SETTINGS_ITEMS = [
  {
    id: 'settings-general',
    type: 'settings',
    category: 'Settings',
    title: 'Settings',
    description: 'Manage API keys, default provider, and privacy',
    path: '/settings',
    keywords: 'settings preferences configuration general',
  },
  {
    id: 'settings-api-keys',
    type: 'settings',
    category: 'Settings',
    title: 'API Keys',
    description: 'Configure OpenAI, Anthropic, Gemini, and OpenRouter keys',
    path: '/settings',
    keywords: 'api keys openai anthropic gemini openrouter credentials token secret',
  },
  {
    id: 'settings-default-provider',
    type: 'settings',
    category: 'Settings',
    title: 'Default Provider',
    description: 'Choose your default LLM provider for running agents',
    path: '/settings',
    keywords: 'default provider model settings llm configuration',
  },
  {
    id: 'settings-privacy',
    type: 'settings',
    category: 'Settings',
    title: 'Privacy & Storage',
    description: 'Manage browser credentials, clearing keys, and privacy',
    path: '/settings',
    keywords: 'privacy security storage clean credentials keys',
  },
]

const STATIC_WORKFLOW_PAGES = [
  {
    id: 'workflow-library-page',
    type: 'workflow',
    category: 'Workflow',
    title: 'Workflow Library',
    description: 'Browse, run, and fork public workflows',
    path: '/workflows',
    keywords: 'workflows library browse pipelines automation',
  },
  {
    id: 'workflow-builder-page',
    type: 'workflow',
    category: 'Workflow',
    title: 'Workflow Builder',
    description: 'Chain multiple AI agents into automated pipelines',
    path: '/workflows/build',
    keywords: 'workflow builder create new chain custom pipeline',
  },
]

const STATIC_COLLECTION_PAGES = [
  {
    id: 'collections-index-page',
    type: 'collection',
    category: 'Collection',
    title: 'All Collections',
    description: 'View and manage all custom agent collections',
    path: '/collections',
    keywords: 'collections all collections groups categories',
  },
]

function getCategoryIcon(type) {
  switch (type) {
    case 'agent':
      return <Bot size={15} aria-hidden="true" />
    case 'collection':
      return <Folder size={15} aria-hidden="true" />
    case 'workflow':
      return <GitBranch size={15} aria-hidden="true" />
    case 'settings':
      return <Settings size={15} aria-hidden="true" />
    default:
      return <Command size={15} aria-hidden="true" />
  }
}

export default function QuickJumpModal({
  isOpen,
  onClose,
  agents: propAgents,
  collections: propCollections,
  workflows: propWorkflows,
  initialQuery = '',
  onSelect,
}) {
  const navigate = useNavigate()
  const dialogRef = useRef(null)
  const inputRef = useRef(null)
  const activeItemRef = useRef(null)
  const [query, setQuery] = useState(initialQuery)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [fetchedWorkflows, setFetchedWorkflows] = useState([])

  // Safe context resolution for agents
  let contextAgents = []
  try {
    const agentsCtx = useAgents()
    contextAgents = agentsCtx?.agents || []
  } catch {
    // Outside AgentsProvider (e.g. isolated test)
  }

  // Safe context resolution for collections
  let contextCollections = []
  try {
    const collectionsCtx = useCollections()
    contextCollections = collectionsCtx?.collections || []
  } catch {
    contextCollections = loadCollections()
  }

  const agents = propAgents || contextAgents || []
  const collections = propCollections || contextCollections || []

  // Fetch workflows once when opening if not provided as prop
  useEffect(() => {
    if (!isOpen || propWorkflows) return
    let mounted = true
    fetchWorkflows()
      .then(({ data }) => {
        if (mounted && Array.isArray(data)) {
          setFetchedWorkflows(data)
        }
      })
      .catch(() => {
        // Ignore Supabase connection failures
      })
    return () => {
      mounted = false
    }
  }, [isOpen, propWorkflows])

  // Reset query and selectedIndex when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      setSelectedIndex(0)
    }
  }, [isOpen, initialQuery])

  // Trap focus while open, close on Esc, and restore focus on close
  useDialogFocus(dialogRef, { active: isOpen, onClose })

  // Construct all searchable items
  const allItems = useMemo(() => {
    const items = []

    // 1. Settings pages
    items.push(...STATIC_SETTINGS_ITEMS)

    // 2. Collection pages & collections
    items.push(...STATIC_COLLECTION_PAGES)
    collections.forEach((col) => {
      if (col.id === DEFAULT_COLLECTION_ID) {
        items.push({
          id: `col-${col.id}`,
          type: 'collection',
          category: 'Collection',
          title: col.name || 'All Agents',
          description: `${col.agentIds?.length || 0} agents in collection`,
          path: '/collections',
          keywords: `${col.name} all agents collection`,
        })
      } else {
        items.push({
          id: `col-${col.id}`,
          type: 'collection',
          category: 'Collection',
          title: col.name,
          description: `${col.agentIds?.length || 0} agent${col.agentIds?.length === 1 ? '' : 's'}`,
          path: `/collections/${col.id}`,
          keywords: `${col.name} collection custom`,
        })
      }
    })

    // 3. Workflow pages & individual workflows
    items.push(...STATIC_WORKFLOW_PAGES)
    const workflowList = propWorkflows || fetchedWorkflows || []
    workflowList.forEach((wf) => {
      items.push({
        id: `wf-${wf.id}`,
        type: 'workflow',
        category: 'Workflow',
        title: wf.title,
        description: wf.description || `Workflow with ${(wf.agents || []).length} steps`,
        path: `/workflows/${wf.id}`,
        keywords: `${wf.title} ${wf.description || ''} workflow pipeline`,
      })
    })

    // 4. Agents
    agents.forEach((agent) => {
      items.push({
        id: `agent-${agent.id}`,
        type: 'agent',
        category: agent.category ? `Agent · ${agent.category}` : 'Agent',
        title: agent.name,
        description: agent.description || '',
        path: `/agent/${agent.id}`,
        keywords: `${agent.name} ${agent.id} ${agent.category || ''} ${agent.description || ''} agent`,
      })
    })

    return items
  }, [agents, collections, propWorkflows, fetchedWorkflows])

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      // Empty query: show default selection across categories
      return allItems.slice(0, 30)
    }

    const scored = []
    for (const item of allItems) {
      const titleLower = item.title.toLowerCase()
      const descLower = (item.description || '').toLowerCase()
      const categoryLower = (item.category || '').toLowerCase()
      const keywordsLower = (item.keywords || '').toLowerCase()

      let score = 0
      if (titleLower === q) {
        score = 100
      } else if (titleLower.startsWith(q)) {
        score = 80
      } else if (titleLower.includes(q)) {
        score = 60
      } else if (categoryLower.includes(q)) {
        score = 40
      } else if (descLower.includes(q)) {
        score = 30
      } else if (keywordsLower.includes(q)) {
        score = 20
      }

      if (score > 0) {
        scored.push({ item, score })
      }
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 30).map((s) => s.item)
  }, [allItems, query])

  // Scroll active item into view
  useEffect(() => {
    if (activeItemRef.current?.scrollIntoView) {
      activeItemRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Adjust selectedIndex if filteredItems change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  const handleSelect = (item) => {
    if (!item) return
    if (onSelect) {
      onSelect(item)
    } else {
      navigate(item.path)
    }
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filteredItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filteredItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const activeItem = filteredItems[selectedIndex]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Jump"
      id="quick-jump-dialog"
      ref={dialogRef}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-surface-card border border-zinc-200 dark:border-border shadow-pop overflow-hidden flex flex-col max-h-[75vh]">
        {/* Combobox Search Input */}
        <div className="relative flex items-center px-4 py-3 border-b border-zinc-100 dark:border-border">
          <Search size={18} className="text-zinc-400 dark:text-text-muted shrink-0 mr-3" aria-hidden="true" />
          <input
            ref={inputRef}
            data-autofocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls="quick-jump-listbox"
            aria-activedescendant={
              activeItem ? `quick-jump-item-${activeItem.id}` : undefined
            }
            aria-label="Search agents, collections, workflows, and settings"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to an agent, collection, workflow, or settings page..."
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-text-primary placeholder:text-zinc-400 dark:placeholder:text-text-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-text-primary transition-colors"
              aria-label="Clear search query"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 dark:text-text-muted border border-zinc-200 dark:border-border bg-zinc-50 dark:bg-surface-input ml-2 shrink-0">
            Esc
          </kbd>
        </div>

        {/* Listbox Results */}
        <ul
          id="quick-jump-listbox"
          role="listbox"
          aria-label="Quick jump suggestions"
          tabIndex={-1}
          className="overflow-y-auto p-2 divide-y divide-zinc-50 dark:divide-border/40 focus:outline-none"
        >
          {filteredItems.length === 0 ? (
            <li
              role="presentation"
              className="p-8 text-center text-sm text-zinc-500 dark:text-text-muted"
            >
              No matches found for &ldquo;{query}&rdquo;
            </li>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex
              const optionId = `quick-jump-item-${item.id}`

              return (
                <li
                  key={item.id}
                  id={optionId}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  ref={isSelected ? activeItemRef : null}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                    isSelected
                      ? 'bg-zinc-100 dark:bg-surface-hover text-zinc-900 dark:text-text-primary'
                      : 'text-zinc-700 dark:text-text-secondary hover:bg-zinc-50 dark:hover:bg-surface-hover/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-7 h-7 bg-zinc-500/10 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                      {getCategoryIcon(item.type)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate text-[13px] text-zinc-900 dark:text-text-primary">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-[11px] text-zinc-400 dark:text-text-muted truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider border border-zinc-200 dark:border-border text-zinc-500 dark:text-text-muted">
                      {item.category}
                    </span>
                    {isSelected && (
                      <ArrowRight size={13} className="text-zinc-400 dark:text-text-muted" aria-hidden="true" />
                    )}
                  </div>
                </li>
              )
            })
          )}
        </ul>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-100 dark:border-border bg-zinc-50/70 dark:bg-surface/50 text-[11px] text-zinc-400 dark:text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 border border-zinc-200 dark:border-border bg-white dark:bg-surface-input font-mono text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 border border-zinc-200 dark:border-border bg-white dark:bg-surface-input font-mono text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-zinc-200 dark:border-border bg-white dark:bg-surface-input font-mono text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span>{filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}

export { QuickJumpModal as CommandPalette }
