import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import QuickJumpModal from './QuickJumpModal'

const mockAgents = [
  {
    id: 'ab-test-analyzer',
    name: 'A/B Test Analyzer',
    description: 'Analyze experimental test results with statistical rigour',
    category: 'Productivity',
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Automated PR reviewer and security analysis',
    category: 'Engineering',
  },
]

const mockCollections = [
  {
    id: 'col-1',
    name: 'Favorites',
    agentIds: ['ab-test-analyzer'],
  },
  {
    id: 'all-agents',
    name: 'All Agents',
    agentIds: ['ab-test-analyzer', 'code-reviewer'],
  },
]

const mockWorkflows = [
  {
    id: 'wf-101',
    title: 'Daily Code Pipeline',
    description: 'Run linter and tests',
    agents: ['code-reviewer'],
  },
]

afterEach(cleanup)

function renderModal(props = {}) {
  const onClose = props.onClose || vi.fn()
  const onSelect = props.onSelect || vi.fn()
  const utils = render(
    <MemoryRouter>
      <QuickJumpModal
        isOpen={true}
        onClose={onClose}
        onSelect={onSelect}
        agents={mockAgents}
        collections={mockCollections}
        workflows={mockWorkflows}
        {...props}
      />
    </MemoryRouter>
  )
  return { ...utils, onClose, onSelect }
}

describe('QuickJumpModal component', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <MemoryRouter>
        <QuickJumpModal isOpen={false} onClose={() => {}} />
      </MemoryRouter>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders with proper dialog and combobox semantics when open', () => {
    renderModal()

    const dialog = screen.getByRole('dialog', { name: /quick jump/i })
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const input = screen.getByRole('combobox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    expect(input).toHaveAttribute('aria-haspopup', 'listbox')
    expect(input).toHaveAttribute('aria-controls', 'quick-jump-listbox')
    expect(input).toHaveAttribute('data-autofocus')

    const listbox = screen.getByRole('listbox')
    expect(listbox).toBeInTheDocument()
    expect(listbox).toHaveAttribute('id', 'quick-jump-listbox')
  })

  it('searches agents, collections, workflows, and settings pages', () => {
    renderModal()
    const input = screen.getByRole('combobox')

    // Search agent
    fireEvent.change(input, { target: { value: 'A/B Test' } })
    expect(screen.getByText('A/B Test Analyzer')).toBeInTheDocument()

    // Search collection
    fireEvent.change(input, { target: { value: 'Favorites' } })
    expect(screen.getByText('Favorites')).toBeInTheDocument()

    // Search workflow
    fireEvent.change(input, { target: { value: 'Daily Code' } })
    expect(screen.getByText('Daily Code Pipeline')).toBeInTheDocument()

    // Search settings
    fireEvent.change(input, { target: { value: 'API Keys' } })
    expect(screen.getByText('API Keys')).toBeInTheDocument()
  })

  it('shows no results message when query has no matches', () => {
    renderModal()
    const input = screen.getByRole('combobox')

    fireEvent.change(input, { target: { value: 'xyznonexistent123' } })
    expect(screen.getByText(/no matches found/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('navigates with ArrowDown and ArrowUp keys, updating aria-activedescendant', () => {
    renderModal()
    const input = screen.getByRole('combobox')
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(2)

    // Initially first item is selected
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id)

    // Arrow down moves to second
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(options[0]).toHaveAttribute('aria-selected', 'false')
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id)

    // Arrow up moves back to first
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id)

    // Arrow up from first wraps to last
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    const lastOption = options[options.length - 1]
    expect(lastOption).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', lastOption.id)
  })

  it('selects active item on Enter key and calls onClose', () => {
    const { onSelect, onClose } = renderModal()
    const input = screen.getByRole('combobox')

    fireEvent.change(input, { target: { value: 'Code Reviewer' } })
    const matchingOption = screen.getByRole('option', { name: /code reviewer/i })
    expect(matchingOption).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Code Reviewer',
        path: '/agent/code-reviewer',
      })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('selects an item on click and calls onClose', () => {
    const { onSelect, onClose } = renderModal()
    const input = screen.getByRole('combobox')

    fireEvent.change(input, { target: { value: 'Daily Code' } })
    const option = screen.getByRole('option', { name: /daily code pipeline/i })

    fireEvent.click(option)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Daily Code Pipeline',
        path: '/workflows/wf-101',
      })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape key', () => {
    const { onClose } = renderModal()
    const input = screen.getByRole('combobox')

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on clicking the backdrop', () => {
    const { onClose } = renderModal()
    const dialog = screen.getByRole('dialog', { name: /quick jump/i })

    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clears search query when clear button is clicked', () => {
    renderModal()
    const input = screen.getByRole('combobox')

    fireEvent.change(input, { target: { value: 'test' } })
    expect(input).toHaveValue('test')

    const clearButton = screen.getByRole('button', { name: /clear search/i })
    fireEvent.click(clearButton)
    expect(input).toHaveValue('')
  })
})
