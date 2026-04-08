/**
 * "Gesetz des Tages" — Curated collection of interesting, surprising,
 * outdated, funny, and important laws. One per day, rotating.
 */

export interface DailyLaw {
  id: string
  emoji: string
  category: 'verrückt' | 'wichtig' | 'überholt' | 'überraschend' | 'historisch' | 'tierschutz' | 'digital'
  title: string
  law: string
  paragraph: string
  lawId?: string // for linking to full law
  year: number
  context: string // Why does this exist? When? For whom?
  funFact?: string
  needsUpdate?: string // Why is this outdated?
}

export const dailyLaws: DailyLaw[] = [
  // ── VERRÜCKT / LUSTIG ──
  {
    id: "bier",
    emoji: "🍺",
    category: "historisch",
    title: "Das älteste Lebensmittelgesetz der Welt",
    law: "Vorläufiges Biergesetz",
    paragraph: "§ 9 Abs. 1",
    year: 1993,
    context: "Das deutsche Reinheitsgebot von 1516 ist das älteste noch gültige Lebensmittelgesetz der Welt. Über 500 Jahre alt! Es lebt heute im Vorläufigen Biergesetz weiter: Bier darf nur aus Wasser, Malz, Hopfen und Hefe gebraut werden. Bayern hat das 1516 eingeführt, um zu verhindern, dass Bäcker und Brauer um Weizen konkurrieren.",
    funFact: "Bayern drohte 1871 damit, dem Deutschen Reich nicht beizutreten, wenn das Reinheitsgebot nicht bundesweit gilt. Es hat geklappt.",
  },
  {
    id: "stille-nacht",
    emoji: "🔇",
    category: "überraschend",
    title: "Mittagsruhe ist kein Bundesgesetz",
    law: "BImSchG / Landesimmissionsschutzgesetze",
    paragraph: "Verschiedene",
    year: 1974,
    context: "Viele Deutsche glauben, es gibt ein Bundesgesetz für Mittagsruhe (12-15 Uhr). Gibt es nicht! Es gibt nur kommunale Satzungen und Hausordnungen. Das Bundes-Immissionsschutzgesetz regelt Lärm, aber keine feste Mittagsruhe. Trotzdem: in vielen Mietverträgen steht sie drin — und dann gilt sie vertraglich.",
    funFact: "In den meisten EU-Ländern gibt es keine Mittagsruhe-Tradition. Das ist sehr deutsch.",
  },
  {
    id: "schwarzfahren",
    emoji: "🚃",
    category: "überholt",
    title: "Schwarzfahren ist (noch) eine Straftat",
    law: "Strafgesetzbuch",
    paragraph: "§ 265a StGB",
    lawId: "stgb",
    year: 1935,
    context: "Schwarzfahren (\"Erschleichen von Leistungen\") kann mit bis zu einem Jahr Gefängnis bestraft werden. Jedes Jahr werden ~7.000 Menschen in Deutschland dafür inhaftiert — mehr als für manche Gewaltdelikte. Das kostet den Staat ~200 Millionen Euro/Jahr. Mehrere Parteien fordern die Entkriminalisierung.",
    needsUpdate: "Der Bundestag debattiert seit 2024 über die Entkriminalisierung. Vorschlag: Ordnungswidrigkeit statt Straftat. Würde Gefängnisse entlasten und Millionen sparen.",
  },
  {
    id: "tierwuerde",
    emoji: "🐾",
    category: "tierschutz",
    title: "Tiere haben Rechte — aber keine Würde",
    law: "Grundgesetz + Tierschutzgesetz",
    paragraph: "Art. 20a GG, § 1 TierSchG",
    lawId: "tierschg",
    year: 2002,
    context: "Seit 2002 steht Tierschutz im Grundgesetz (Art. 20a). Aber: Deutschland \"schützt\" Tiere — die Schweiz \"achtet ihre Würde\" (seit 2005). Ein Wort Unterschied, massive Konsequenz: \"Würde\" bedeutet, dass Tiere ein Recht auf artgerechtes Leben haben, nicht nur auf Schutz vor Quälerei.",
    needsUpdate: "Die Deutschland 2030 Reform schlägt vor: 'schützt die Tiere' → 'achtet die Würde der Tiere'. Ein Wort. Alles ändert sich.",
  },
  {
    id: "sonntagsfahrverbot",
    emoji: "🚛",
    category: "überraschend",
    title: "LKW dürfen sonntags nicht fahren",
    law: "Straßenverkehrsordnung",
    paragraph: "§ 30 StVO",
    year: 1956,
    context: "An Sonn- und Feiertagen von 0 bis 22 Uhr dürfen LKW über 7,5 Tonnen in Deutschland nicht fahren. Ausnahmen: verderbliche Lebensmittel, Milch, lebende Tiere. Dieses Gesetz gibt es seit 1956 — ursprünglich aus religiösen Gründen (Sonntagsruhe), heute auch für Lärmschutz und Umwelt.",
    funFact: "Deutschland ist eines der wenigen Länder mit so einem strengen Sonntagsfahrverbot. Die Logistikbranche hasst es. Anwohner lieben es.",
  },
  {
    id: "eltern-name",
    emoji: "👶",
    category: "verrückt",
    title: "Du darfst dein Kind nicht 'Pumuckl' nennen — oder doch?",
    law: "Personenstandsgesetz / Namensrecht",
    paragraph: "§ 21 PStG",
    year: 1937,
    context: "In Deutschland prüft das Standesamt jeden Vornamen. Der Name muss als Vorname erkennbar sein, das Geschlecht erkennen lassen (seit 2008 gelockert) und darf das Kind nicht der Lächerlichkeit preisgeben. Tatsächlich wurde 'Pumuckl' als Zweitname genehmigt! Abgelehnt wurden: 'Bierstansen', 'Agfa', 'Ogansen'.",
    funFact: "Erlaubt: Pepsi-Carola, Matt-Eagle, Fanta. Abgelehnt: Schroeder, Tom Tom, Gucci, Whisky.",
  },
  {
    id: "waldrecht",
    emoji: "🌲",
    category: "wichtig",
    title: "Du darfst in jeden Wald — er gehört dir",
    law: "Bundeswaldgesetz",
    paragraph: "§ 14 BWaldG",
    year: 1975,
    context: "In Deutschland darf JEDER jeden Wald betreten — auch Privatwald. Das Betretungsrecht ist gesetzlich garantiert. Du darfst spazieren, wandern, radfahren und sogar Pilze und Beeren sammeln (in geringen Mengen für den Eigenbedarf). In den USA, UK oder Spanien wäre das Hausfriedensbruch.",
    funFact: "Schweden und Finnland haben ein ähnliches Recht: Allemansrätten / Jokamiehenoikeus (Jedermannsrecht). In England wurde das 'Right to Roam' erst 2000 eingeführt — für Deutschland gilt es seit Jahrhunderten.",
  },
  {
    id: "grundgesetz-ewigkeit",
    emoji: "♾️",
    category: "wichtig",
    title: "Die Ewigkeitsklausel — was NIEMALS geändert werden darf",
    law: "Grundgesetz",
    paragraph: "Art. 79 Abs. 3 GG",
    lawId: "gg",
    year: 1949,
    context: "Selbst wenn 100% aller Abgeordneten dafür stimmen würden: Art. 1 (Menschenwürde) und Art. 20 (Demokratie, Bundesstaat, Sozialstaat) dürfen NIEMALS geändert werden. Das ist die Ewigkeitsklausel — eine direkte Lehre aus der Weimarer Republik, wo Hitler die Demokratie legal abschaffte.",
    funFact: "Deutschland ist eines der wenigen Länder mit einer solchen Klausel. Die Verfassungsväter wollten sicherstellen: Nie wieder.",
  },
  {
    id: "totenfuersorge",
    emoji: "⚰️",
    category: "überraschend",
    title: "Du MUSST auf einem Friedhof begraben werden",
    law: "Bestattungsgesetze der Länder",
    paragraph: "Verschiedene Landesgesetze",
    year: 1934,
    context: "In Deutschland herrscht Friedhofszwang — du darfst die Asche eines Verstorbenen nicht mit nach Hause nehmen oder im Garten verstreuen. Einzige Ausnahme: Bremen erlaubt seit 2015 die Verstreuung auf Privatgrundstücken. In den Niederlanden, der Schweiz oder den USA ist es völlig normal, die Urne zuhause zu haben.",
    needsUpdate: "Immer mehr Menschen fordern die Aufhebung des Friedhofszwangs. Der Trend geht zu Baumbestattungen, Seebestattungen, und Naturfriedhöfen — aber die Urne im eigenen Garten ist (fast überall) verboten.",
  },
  {
    id: "kehrwoche",
    emoji: "🧹",
    category: "verrückt",
    title: "Die Kehrwoche ist gesetzlich geregelt",
    law: "Gemeindesatzungen (vor allem Baden-Württemberg)",
    paragraph: "Straßenreinigungssatzungen",
    year: 1492,
    context: "In vielen Gemeinden Baden-Württembergs ist die Kehrwoche — das wöchentliche Putzen von Gehweg, Treppe und Hausflur — tatsächlich in der Gemeindesatzung vorgeschrieben. Wer nicht kehrt, kann ein Bußgeld bekommen. Die Tradition geht auf das 15. Jahrhundert zurück, als Herzog Eberhard die Straßenreinigung in Stuttgart anordnete.",
    funFact: "Die Kehrwoche ist so schwäbisch, dass es dafür kein Äquivalent in anderen Sprachen gibt. Der Kehrwochenplan im Treppenhaus ist heilig.",
  },
  {
    id: "insekten",
    emoji: "🐝",
    category: "tierschutz",
    title: "Bienen haben einen eigenen Paragraphen im BGB",
    law: "Bürgerliches Gesetzbuch",
    paragraph: "§§ 961-964 BGB",
    lawId: "bgb",
    year: 1900,
    context: "Das BGB von 1900 hat vier Paragraphen nur für Bienen: §961 (Eigentumsverlust bei Schwarmflug), §962 (Verfolgungsrecht des Imkers), §963 (Vereinigung von Schwärmen), §964 (Einzug in fremde Beute). Wenn dein Bienenvolk wegschwärmt, darfst du es auf das Grundstück des Nachbarn verfolgen — das ist dein Recht!",
    funFact: "Diese Paragraphen sind über 125 Jahre alt und immer noch geltendes Recht. Kein Witz.",
  },
  {
    id: "nachtruhe",
    emoji: "🌙",
    category: "überraschend",
    title: "Es gibt KEIN bundesweites Nachtruhe-Gesetz",
    law: "TA Lärm / Landesgesetze",
    paragraph: "Verschiedene",
    year: 1968,
    context: "Die berühmte 'Nachtruhe von 22-6 Uhr' steht in keinem Bundesgesetz. Sie ergibt sich aus der Technischen Anleitung zum Schutz gegen Lärm (TA Lärm) und Landesimmissionsschutzgesetzen — also Verwaltungsvorschriften, nicht Parlamentsgesetzen. Die meisten Mietverträge und Hausordnungen übernehmen sie aber.",
    funFact: "In Spanien beginnt die Nachtruhe offiziell erst um 23 Uhr. In Japan gibt es gar keine gesetzliche Nachtruhe.",
  },
  {
    id: "schornsteinfeger",
    emoji: "🎩",
    category: "historisch",
    title: "Schornsteinfeger hatten ein staatliches Monopol — 300 Jahre lang",
    law: "Schornsteinfeger-Handwerksgesetz",
    paragraph: "SchfHwG",
    year: 2008,
    context: "Bis 2008 war Deutschland in Kehrbezirke aufgeteilt — jeder mit einem staatlich zugewiesenen Bezirksschornsteinfeger. Du konntest dir deinen Schornsteinfeger nicht aussuchen. Dieses Monopol gab es seit dem 18. Jahrhundert! Die EU erzwang die Liberalisierung. Seit 2013 darfst du (für manche Arbeiten) selbst wählen.",
    funFact: "Schornsteinfeger gelten in Deutschland als Glücksbringer. Einen am Neujahrstag zu treffen soll besonders viel Glück bringen.",
  },
  {
    id: "digital-erbe",
    emoji: "💀📱",
    category: "digital",
    title: "Was passiert mit deinem Instagram nach dem Tod?",
    law: "BGB (Erbrecht) + BGH-Urteil 2018",
    paragraph: "§ 1922 BGB",
    lawId: "bgb",
    year: 2018,
    context: "Der BGH entschied 2018: Digitale Accounts werden vererbt wie physisches Eigentum. Deine Eltern bekommen Zugang zu deinem Facebook, Instagram und E-Mail — einschließlich privater Nachrichten. Facebook wollte das verhindern, verlor aber. Tipp: Lege einen digitalen Nachlass fest.",
    funFact: "In Deutschland sterben ~900.000 Menschen pro Jahr. Die meisten haben keinen digitalen Nachlassplan. Millionen von Social-Media-Accounts gehören Verstorbenen.",
  },
  {
    id: "feiertag",
    emoji: "🎉",
    category: "überraschend",
    title: "An 'stillen Feiertagen' darfst du nicht tanzen",
    law: "Feiertagsgesetze der Länder",
    paragraph: "Verschiedene",
    year: 1952,
    context: "An Karfreitag, Totensonntag und Volkstrauertag ist in den meisten Bundesländern öffentliches Tanzen verboten. Clubs und Discos müssen geschlossen bleiben. In Bayern gilt das Tanzverbot sogar am Buß- und Bettag. Jedes Jahr gibt es Proteste dagegen — vor allem von jungen Menschen und Clubbetreibern.",
    needsUpdate: "Bremen hat 2018 das Tanzverbot am Karfreitag gelockert. Berlin hat gar keins. Aber in Bayern, Baden-Württemberg und Hessen gilt es streng. Kritiker sagen: In einem säkularen Staat sollte Religion nicht bestimmen wer tanzen darf.",
  },
  {
    id: "pfandflaschen",
    emoji: "♻️",
    category: "wichtig",
    title: "Das Pfandsystem — Deutschlands Exportschlager",
    law: "Verpackungsgesetz",
    paragraph: "§ 31 VerpackG",
    year: 2003,
    context: "Seit 2003 gibt es Pfand auf Einwegflaschen (25 Cent). Seit 2006 auch auf Dosen. Ergebnis: Deutschland hat eine Rückgabequote von 98,5% bei Pfandflaschen — Weltrekord. Das System wird von Ländern wie der Türkei, Rumänien und Portugal als Vorbild studiert.",
    funFact: "Pfandflaschen sammeln ist für viele Menschen in Deutschland eine Einkommensquelle. Es gibt sogar Pfandhalter an Mülleimern — eine deutsche Erfindung.",
  },
  {
    id: "rauchverbot",
    emoji: "🚬",
    category: "historisch",
    title: "Deutschland war eines der LETZTEN EU-Länder mit Rauchverbot",
    law: "Bundesnichtraucherschutzgesetz + Landesgesetze",
    paragraph: "BNichtrSchG",
    year: 2007,
    context: "Erst 2007 kam ein bundesweites Rauchverbot in öffentlichen Gebäuden. Für Gaststätten gelten Landesgesetze — Bayern hat das strengste (seit 2010: komplett rauchfrei). NRW erlaubt noch Raucherräume. Irland war 2004 das erste EU-Land mit totalem Rauchverbot in Pubs. Deutschland brauchte 3 Jahre länger.",
    funFact: "In bayerischen Bierzelten auf dem Oktoberfest ist Rauchen seit 2010 verboten. Die Wirte haben es überlebt.",
  },
  {
    id: "homeschooling",
    emoji: "🏠📚",
    category: "überraschend",
    title: "Homeschooling ist in Deutschland VERBOTEN",
    law: "Schulpflichtgesetze der Länder",
    paragraph: "Verschiedene (z.B. §36 SchulG NRW)",
    year: 1919,
    context: "Deutschland hat eine der strengsten Schulpflichten der Welt. Homeschooling ist verboten — Kinder MÜSSEN eine Schule besuchen. Eltern die dagegen verstoßen können Bußgelder bekommen oder sogar das Sorgerecht verlieren. In den USA, UK, Frankreich und den meisten EU-Ländern ist Homeschooling legal.",
    needsUpdate: "Corona hat die Debatte neu entfacht. Einige Bildungsexperten fordern zumindest eine Ausnahme für besondere Fälle. Andere sagen: Die Schulpflicht ist ein Grundpfeiler der Chancengleichheit.",
  },
  {
    id: "autobahn",
    emoji: "🏎️",
    category: "verrückt",
    title: "Deutschland hat (immer noch) kein generelles Tempolimit",
    law: "Straßenverkehrsordnung",
    paragraph: "§ 3 StVO + Autobahn-Richtgeschwindigkeits-V",
    year: 1978,
    context: "Deutschland ist das EINZIGE Land der Welt ohne generelles Tempolimit auf Autobahnen. Es gibt eine 'Richtgeschwindigkeit' von 130 km/h — aber die ist nicht bindend. Wer 250 fährt verstößt gegen kein Gesetz, solange die Straßenverhältnisse es zulassen. Das Umweltbundesamt empfiehlt seit Jahren ein Limit.",
    needsUpdate: "Die Deutschland 2030 Reform schlägt ein temporäres Tempolimit 120 km/h während der Iran-Energiekrise vor: spart 3-5% Sprit sofort. Langfristig wird über 130 km/h diskutiert.",
    funFact: "80% der Autobahnen haben bereits ein lokales Tempolimit. Nur ~20% sind wirklich unbegrenzt.",
  },
  {
    id: "kontoverbot",
    emoji: "🏦",
    category: "wichtig",
    title: "Jeder Mensch hat Recht auf ein Bankkonto",
    law: "Zahlungskontengesetz",
    paragraph: "§ 31 ZKG",
    year: 2016,
    context: "Seit 2016 hat JEDER in Deutschland — auch Obdachlose, Asylbewerber und Menschen ohne festen Wohnsitz — ein Recht auf ein Basiskonto. Banken dürfen niemanden ablehnen. Das Konto muss Überweisungen, Kartenzahlungen und Bargeldabhebungen ermöglichen. Vorher konnten Banken einfach 'nein' sagen.",
    funFact: "Vor dem Gesetz hatten geschätzt 500.000 Menschen in Deutschland kein Bankkonto. Ohne Konto: kein Mietvertrag, kein Job, keine Sozialleistungen.",
  },
]

/**
 * Get today's law based on the date (deterministic rotation)
 */
export function getDailyLaw(): DailyLaw {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
  return dailyLaws[dayOfYear % dailyLaws.length]
}

export function getCategoryColor(cat: DailyLaw['category']): string {
  const colors: Record<string, string> = {
    'verrückt': 'bg-purple-light text-purple',
    'wichtig': 'bg-blue-light text-blue',
    'überholt': 'bg-red-light text-red',
    'überraschend': 'bg-gold-light text-gold',
    'historisch': 'bg-ink-muted/10 text-ink-muted',
    'tierschutz': 'bg-green-light text-green',
    'digital': 'bg-blue-light text-blue',
  }
  return colors[cat] || 'bg-gold-light text-gold'
}
