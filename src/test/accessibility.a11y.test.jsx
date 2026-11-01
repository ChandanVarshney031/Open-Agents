import { fireEvent, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, vi } from 'vitest'
import AgentCard from '../components/AgentCard'
import CustomSelect from '../components/CustomSelect'
import Navbar from '../components/Navbar'
import QuickJumpModal from '../components/QuickJumpModal'
import SettingsPage from '../pages/SettingsPage'
import { expectNoA11yViolations } from './a11y'

vi.mock('../lib/useFavorites', () => ({
  useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }),
}))

const agent = {
  id: 'accessibility-test-agent',
  name: 'Accessibility Test Agent',
  description: 'Checks an accessible component boundary.',
  category: 'Engineering',
  provider: 'openai',
  icon: 'Bot',
  systemPrompt: 'Be helpful.',
}

describe('automated accessibility checks', () => {
  it('keeps the primary agent card free of detectable violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <AgentCard agent={agent} />
      </MemoryRouter>
    )
    await expectNoA11yViolations(container)
  })

  it('checks the custom select in both collapsed and expanded states', async () => {
    const { container, getByRole } = render(
      <CustomSelect
        label="Model provider"
        value="openai"
        onChange={vi.fn()}
        options={['openai', 'anthropic']}
      />
    )
    await expectNoA11yViolations(container)

    fireEvent.click(getByRole('button', { name: /model provider/i }))
    await expectNoA11yViolations(container)
  })

  it('checks the global navigation landmark', async () => {
    const { container } = render(
      <MemoryRouter>
        <Navbar sidebarOpen={false} setSidebarOpen={vi.fn()} />
      </MemoryRouter>
    )
    await expectNoA11yViolations(container)
  })

  it('checks the quick jump dialog', async () => {
    const { container } = render(
      <MemoryRouter>
        <QuickJumpModal isOpen={true} onClose={vi.fn()} workflows={[]} />
      </MemoryRouter>
    )
    await expectNoA11yViolations(container)
  })

  it('checks the settings page and credential controls', async () => {
    const { container } = render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    )
    await expectNoA11yViolations(container)
  })
})
