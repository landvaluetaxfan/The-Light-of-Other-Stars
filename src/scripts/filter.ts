/**
 * Declarative client-side filtering for record lists.
 *
 *   <div data-filter>
 *     <input data-f="q">                 free text, matched against data-text
 *     <select data-f="status">           matched against data-status (space-separated tokens)
 *     <output data-count></output>
 *     <… data-item data-status="enacted" data-text="…">
 *     <… data-empty hidden>               shown when nothing matches
 *     <… data-group> … items … </…>       hidden when all its items are hidden
 *   </div>
 *
 * State is mirrored to the query string so filtered views can be linked.
 */
function init(root: HTMLElement) {
  const controls = [...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-f]')];
  const items = [...root.querySelectorAll<HTMLElement>('[data-item]')];
  const groups = [...root.querySelectorAll<HTMLElement>('[data-group]')];
  const count = root.querySelector<HTMLElement>('[data-count]');
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const params = new URLSearchParams(location.search);

  for (const c of controls) {
    const v = params.get(c.dataset.f!);
    if (v !== null) {
      if (c instanceof HTMLSelectElement && ![...c.options].some((o) => o.value === v)) continue;
      c.value = v;
    }
  }

  const apply = () => {
    let shown = 0;
    const active: [string, string][] = controls.map((c) => [c.dataset.f!, c.value.trim().toLowerCase()]);
    for (const it of items) {
      let ok = true;
      for (const [key, val] of active) {
        if (!val) continue;
        if (key === 'q') {
          const hay = (it.dataset.text ?? it.textContent ?? '').toLowerCase();
          ok = val.split(/\s+/).every((w) => hay.includes(w));
        } else {
          const tokens = (it.dataset[key] ?? '').toLowerCase().split(/\s+/);
          ok = tokens.includes(val);
        }
        if (!ok) break;
      }
      it.hidden = !ok;
      if (ok) shown++;
    }
    for (const g of groups) g.hidden = ![...g.querySelectorAll<HTMLElement>('[data-item]')].some((i) => !i.hidden);
    if (count) count.textContent = `${shown} of ${items.length} record${items.length === 1 ? '' : 's'}`;
    if (empty) empty.hidden = shown !== 0;
    const next = new URLSearchParams(location.search);
    for (const c of controls) {
      if (c.value.trim()) next.set(c.dataset.f!, c.value.trim());
      else next.delete(c.dataset.f!);
    }
    const qs = next.toString();
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
  };

  for (const c of controls) c.addEventListener(c instanceof HTMLSelectElement ? 'change' : 'input', apply);
  root.querySelector<HTMLButtonElement>('[data-reset]')?.addEventListener('click', () => {
    for (const c of controls) c.value = '';
    apply();
  });
  apply();
}

document.querySelectorAll<HTMLElement>('[data-filter]').forEach(init);
