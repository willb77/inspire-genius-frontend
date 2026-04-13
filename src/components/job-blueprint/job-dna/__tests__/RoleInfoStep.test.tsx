import { render, screen, fireEvent } from '@testing-library/react'
import { RoleInfoStep } from '../RoleInfoStep'

describe('RoleInfoStep', () => {
  const mockOnChange = jest.fn()
  const defaultValue = { roleTitle: '', department: '', tier: 'professional' as const }

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders heading and description', () => {
    render(<RoleInfoStep value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByText('Role Information')).toBeInTheDocument()
    expect(screen.getByText(/Define the basic details/)).toBeInTheDocument()
  })

  it('renders role title input', () => {
    render(<RoleInfoStep value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByLabelText('Role Title')).toBeInTheDocument()
  })

  it('renders department input', () => {
    render(<RoleInfoStep value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByLabelText('Department')).toBeInTheDocument()
  })

  it('renders tier selector', () => {
    render(<RoleInfoStep value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByText('Role Tier')).toBeInTheDocument()
  })

  it('calls onChange when role title changes', () => {
    render(<RoleInfoStep value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByLabelText('Role Title'), { target: { value: 'Engineer' } })
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ roleTitle: 'Engineer' }))
  })

  it('calls onChange when department changes', () => {
    render(<RoleInfoStep value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByLabelText('Department'), { target: { value: 'Sales' } })
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ department: 'Sales' }))
  })

  it('displays pre-filled values', () => {
    render(
      <RoleInfoStep
        value={{ roleTitle: 'Manager', department: 'HR', tier: 'executive' }}
        onChange={mockOnChange}
      />
    )
    expect(screen.getByLabelText('Role Title')).toHaveValue('Manager')
    expect(screen.getByLabelText('Department')).toHaveValue('HR')
  })
})
