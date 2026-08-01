import { BEHAVIOUR_CONFIG, QUADRANT_CONFIG } from '@/constants/prism'

/**
 * Regression cover for the 2026-08-01 report that a PRISM profile showed the
 * wrong Blue score. Six of the eight behaviours were tinted with — and
 * server-side, averaged into — the wrong quadrant.
 */
describe('PRISM behaviour ↔ quadrant pairing', () => {
  it('assigns each behaviour to its quadrant per the licensed manual', () => {
    const pairing = Object.values(BEHAVIOUR_CONFIG).reduce<
      Record<string, string[]>
    >((acc, b) => {
      const quadrant = QUADRANT_CONFIG[b.quadrant].label
      acc[quadrant] = [...(acc[quadrant] ?? []), b.label]
      return acc
    }, {})

    expect(pairing).toEqual({
      Green: ['Innovating', 'Initiating'],
      Blue: ['Supporting', 'Coordinating'],
      Red: ['Focusing', 'Delivering'],
      Gold: ['Finishing', 'Evaluating'],
    })
  })

  it("tints each behaviour with its own quadrant's colour family", () => {
    // The bug was visible precisely because Supporting rendered red and
    // Focusing rendered gold. Compare the dominant RGB channel of each
    // behaviour swatch against its quadrant's.
    const dominantChannel = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      const max = Math.max(r, g, b)
      return max === r ? (g > b ? 'warm' : 'r') : max === g ? 'g' : 'b'
    }

    for (const behaviour of Object.values(BEHAVIOUR_CONFIG)) {
      const quadrant = QUADRANT_CONFIG[behaviour.quadrant]
      expect({
        label: behaviour.label,
        channel: dominantChannel(behaviour.color),
      }).toEqual({
        label: behaviour.label,
        channel: dominantChannel(quadrant.color),
      })
    }
  })

  it('keys behaviours by PRISM\'s own BehaviourID order', () => {
    // PRISM returns BehaviourID 1-8 with these names; the chart looks the
    // label up by id and discards the API's own Name field, so the order
    // here has to match what PRISM sends.
    expect(
      Object.entries(BEHAVIOUR_CONFIG).map(([id, b]) => [Number(id), b.label]),
    ).toEqual([
      [1, 'Innovating'],
      [2, 'Initiating'],
      [3, 'Supporting'],
      [4, 'Coordinating'],
      [5, 'Focusing'],
      [6, 'Delivering'],
      [7, 'Finishing'],
      [8, 'Evaluating'],
    ])
  })

  it('has exactly four quadrants and none of them is Orange', () => {
    const labels = Object.values(QUADRANT_CONFIG).map((q) => q.label)
    expect(labels.sort()).toEqual(['Blue', 'Gold', 'Green', 'Red'])
  })
})
