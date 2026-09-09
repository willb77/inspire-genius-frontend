import { render, screen } from '@testing-library/react'
import { ActivityFeed } from '../ActivityFeed'
import type { ActivityItem } from '@/types/job-blueprint'

const items: ActivityItem[] = [
  { id: 'a1', type: 'job-created', description: 'Blueprint created for Account Executive', timestamp: '2026-08-02T05:28:12Z' },
  { id: 'a2', type: 'scorecard-submitted', description: 'Scorecard submitted (good-alignment)', timestamp: 'not-a-date' },
  // an unknown type from a newer backend must still render
  { id: 'a3', type: 'something-new' as ActivityItem['type'], description: 'Future event', timestamp: '2026-09-01T00:00:00Z' },
]

describe('ActivityFeed', () => {
  it('renders every description verbatim, tolerates an unparseable timestamp and an unknown type', () => {
    render(<ActivityFeed items={items} />)
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    expect(screen.getByText('Blueprint created for Account Executive')).toBeInTheDocument()
    expect(screen.getByText('Scorecard submitted (good-alignment)')).toBeInTheDocument()
    expect(screen.getByText('not-a-date')).toBeInTheDocument()
    expect(screen.getByText('Future event')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })
})
