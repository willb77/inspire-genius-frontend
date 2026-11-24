/**
 * The word PRISM as the house style writes it: all capitals, italic.
 *
 * Use this wherever user-visible JSX names the assessment. Text that comes from a
 * string (a translation, a prop) goes through `withPrism()` in `@/lib/withPrism`,
 * which makes the same element. An `<em>` carries the italic, so assistive tech
 * and copy-paste still read the plain word.
 */
export function Prism() {
  return <em>PRISM</em>
}
