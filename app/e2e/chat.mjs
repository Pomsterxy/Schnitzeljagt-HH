// Tourplanung im Chat mit Lilli durchklicken (gemeinsam für alle e2e-Skripte)
const chip = (page, name) => page.locator('.composer .chip', { hasText: name }).first();

export async function planTour(page, o = {}) {
  const {
    team = 'Die Testpiraten',
    people = [['Mama', 'Teen / Erwachsen'], ['Lotta', 'Kind 6–9']],
    districts = ['Winterhude'],
    duration = '2 Stunden',
    legs = 'Höchstens 500 m',
    theme = 'Von allem etwas',
    start = 'U Borgweg (Stadtpark)',
    nav = 'Mit Karte',
    pin = '1234',
    snap = async () => {},
  } = o;
  await page.getByTestId('new-tour').click();
  // Team
  await page.getByTestId('chat-input').fill(team);
  await page.getByRole('button', { name: 'Senden' }).click();
  // Anzahl
  await chip(page, people.length === 1 ? 'Nur ich' : String(people.length)).click();
  // Personen
  for (const [name, age] of people) {
    await page.getByTestId('chat-input').fill(name);
    await chip(page, age).click();
  }
  // Maskottchen
  await chip(page, '🐧').click();
  // Stadtteile (Mehrfachauswahl, dann "Passt so")
  for (const d of districts) await chip(page, d).click();
  await snap('chat-districts');
  await page.getByRole('button', { name: 'Passt so' }).click();
  await chip(page, duration).click();
  await chip(page, legs).click();
  await chip(page, theme).click();
  await chip(page, start).click();
  await chip(page, nav).click();
  // Ja/Nein-Fragen (Schatz, ggf. Pause, ggf. Gedenkorte) mit "Ja" beantworten
  for (let i = 0; i < 3; i++) {
    if (await page.getByTestId('chat-input').count()) break;
    await page.locator('.composer .chip').first().click();
  }
  await page.getByTestId('chat-input').fill(pin);
  await page.getByRole('button', { name: 'Senden' }).click();
  await page.getByRole('button', { name: "Los geht's!" }).waitFor();
  await snap('chat-route');
  const summary = await page.locator('.summary').innerText();
  const legInfo = await page.getByTestId('leg-info').innerText();
  await page.getByRole('button', { name: "Los geht's!" }).click();
  await page.locator('.play').waitFor();
  return { summary, legs: legInfo };
}
