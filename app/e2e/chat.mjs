// Tourplanung im Chat mit Lilli durchklicken (gemeinsam für alle e2e-Skripte)
// Der Chat hat 6 Fragen: Team, Wer ist dabei, Stadtteile, Dauer, Start, PIN.
// Thema, Wege, Navigation und Extras werden danach unter "Anpassen" gesetzt.
const chip = (page, name) => page.locator('.composer .chip', { hasText: name }).first();

export async function planTour(page, o = {}) {
  const {
    team = 'Die Testpiraten',
    people = { adults: 1, tweens: 0, kids: 1 },
    districts = ['Winterhude'],
    duration = '2 Stunden',
    theme = 'Von allem etwas',
    legs = 'Höchstens 500 m',
    start = 'U Borgweg (Stadtpark)',
    nav = 'Mit Karte',
    pin = '1234',
    snap = async () => {},
  } = o;
  // Wettervorhersage im Test nachstellen (kein Regen, außer o.rain)
  await page.route(/api\.open-meteo\.com/, (r) => {
    const t = new Date();
    const time = [];
    for (let i = 0; i < 24; i++) {
      const d = new Date(t.valueOf() + i * 3600000);
      const p2 = (n) => String(n).padStart(2, '0');
      time.push(`${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:00`);
    }
    const p = time.map((_, i) => (o.rain && i === 1 ? 80 : 5));
    const mm = time.map((_, i) => (o.rain && i === 1 ? 1.2 : 0));
    return r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ hourly: { time, precipitation_probability: p, precipitation: mm } }) });
  });
  await page.getByTestId('new-tour').click();
  // 1. Team
  await page.getByTestId('chat-input').fill(team);
  await page.getByRole('button', { name: 'Senden' }).click();
  // 2. Wer ist dabei (Zähler)
  const LABEL = { adults: 'Erwachsene & Teens', tweens: 'Kinder 10–13', kids: 'Kinder 6–9' };
  await page.getByTestId('people').waitFor();
  for (const age of ['adults', 'tweens', 'kids']) {
    for (let guard = 0; guard < 12; guard++) {
      const n = Number(await page.getByTestId(`count-${age}`).innerText());
      if (n === people[age]) break;
      await page.getByRole('button', { name: `${LABEL[age]}: eins ${n < people[age] ? 'mehr' : 'weniger'}` }).click();
    }
  }
  await page.getByRole('button', { name: 'Passt so' }).click();
  // 3. Stadtteile
  for (const d of districts) await chip(page, d).click();
  await snap('chat-districts');
  await page.getByRole('button', { name: 'Passt so' }).click();
  // 4. Dauer, 5. Start
  await chip(page, duration).click();
  await chip(page, start).click();
  // 6. PIN
  await page.getByTestId('chat-input').fill(pin);
  await page.getByRole('button', { name: 'Senden' }).click();
  await page.getByRole('button', { name: "Los geht's!" }).waitFor();
  // Anpassen (nur wenn vom Standard abweichend)
  if (theme !== 'Von allem etwas' || legs !== 'Höchstens 500 m' || nav !== 'Mit Karte') {
    await page.getByTestId('tour-settings').locator('summary').click();
    if (theme !== 'Von allem etwas') await page.getByTestId('set-theme').getByRole('button', { name: theme }).click();
    if (legs !== 'Höchstens 500 m') await page.getByTestId('set-legs').getByRole('button', { name: legs }).click();
    if (nav !== 'Mit Karte') await page.getByTestId('set-nav').getByRole('button', { name: new RegExp(nav) }).click();
  }
  await snap('chat-route');
  const summary = await page.locator('.summary').innerText();
  const legInfo = await page.getByTestId('leg-info').innerText();
  await page.getByRole('button', { name: "Los geht's!" }).click();
  await page.locator('.play').waitFor();
  return { summary, legs: legInfo };
}
