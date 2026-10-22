import { groupByDay } from '../lib/format.js';

// Renders items under a heading per calendar day. `row` renders one item.
export default function DayGroups({ items, getDate, row }) {
  return groupByDay(items, getDate).map((group) => (
    <section key={group.key} className="day">
      <h3>{group.label}</h3>
      <ul className="rows">{group.items.map(row)}</ul>
    </section>
  ));
}
