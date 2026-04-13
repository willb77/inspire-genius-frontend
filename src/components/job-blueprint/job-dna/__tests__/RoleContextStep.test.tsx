import { render, screen, fireEvent } from '@testing-library/react'
import { RoleContextStep } from '../RoleContextStep'

describe('RoleContextStep', () => {
  const mockOnChange = jest.fn()
  const defaultValue = {
    workPressures: [],
    requiredWorkStyles: [],
    environmentalFactors: [],
    culturalFactors: [],
  }

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders heading and description', () => {
    render(<RoleContextStep value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByText('Role Context & Environment')).toBeInTheDocument()
    expect(screen.getByText(/Describe the work environment/)).toBeInTheDocument()
  })

  it('renders all 4 textarea fields', () => {
    render(<RoleContextStep value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByLabelText('Work Pressures')).toBeInTheDocument()
    expect(screen.getByLabelText('Required Work Styles')).toBeInTheDocument()
    expect(screen.getByLabelText('Environmental Factors')).toBeInTheDocument()
    expect(screen.getByLabelText('Cultural Factors')).toBeInTheDocument()
  })

  it('calls onChange when work pressures text changes', () => {
    render(<RoleContextStep value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByLabelText('Work Pressures'), { target: { value: 'Tight deadlines\nHigh expectations' } })
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      workPressures: ['Tight deadlines', 'High expectations'],
    }))
  })

  it('displays pre-filled values as newline-separated text', () => {
    render(
      <RoleContextStep
        value={{ ...defaultValue, workPressures: ['Stress', 'Deadlines'] }}
        onChange={mockOnChange}
      />
    )
    expect(screen.getByLabelText('Work Pressures')).toHaveValue('Stress\nDeadlines')
  })
})
