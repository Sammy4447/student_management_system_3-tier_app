/*
 * Initials plate. Four muted tints keyed off the name so a student keeps the
 * same colour everywhere — enough to scan a list by, not enough to shout.
 */
const TINTS = [
  { bg: '#e8f0ec', border: '#bcd4c9', fg: '#15604a' },
  { bg: '#f1eee6', border: '#d8d0bd', fg: '#6b5b32' },
  { bg: '#eceef1', border: '#cbd2d9', fg: '#3f4c59' },
  { bg: '#f3ebe9', border: '#dcc7c2', fg: '#7a4a3f' },
];

export const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();

const hash = (str = '') => [...str].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 997, 7);

export const Avatar = ({ name, size = 'md' }) => {
  const tint = TINTS[hash(name) % TINTS.length];
  return (
    <span
      className={`avatar ${size === 'lg' ? 'avatar--lg' : ''}`}
      style={{ background: tint.bg, borderColor: tint.border, color: tint.fg }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
};
