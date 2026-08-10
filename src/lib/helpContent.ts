export interface HelpItem {
  title: string
  content: string
}

export interface HelpSection {
  id: string
  title: string
  items: HelpItem[]
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'zoznam',
    title: 'Zoznam zákaziek (úvodná stránka)',
    items: [
      {
        title: 'Filtre a vyhľadávanie',
        content:
          'Tlačidlá Všetky / Rozpracované / Pripravené na odoslanie / Odoslané / Archivované filtrujú zoznam podľa stavu. Pole "Hľadať podľa mena zákazníka" filtruje priebežne podľa mena, ako píšeš.',
      },
      {
        title: '+ Nová zákazka',
        content:
          'Založí novú obhliadku. Stačí meno zákazníka, ostatné kontaktné údaje sa dajú doplniť neskôr v záložke Kontakt. Appka automaticky pridelí referenčné číslo v tvare OBH-001/2026 (poradové číslo v rámci aktuálneho roka).',
      },
      {
        title: 'Stavy zákazky',
        content:
          'Rozpracované = obhliadka sa ešte vypĺňa. Pripravené na odoslanie = checklist aj ponuka sú hotové, čaká sa na odoslanie zákazníkovi. Odoslané = ponuka bola odoslaná/odovzdaná. Archivované = zákazka je uzavretá (napr. zrealizovaná alebo zrušená). Stav meníš v hlavičke detailu obhliadky, appka ho sama nemení.',
      },
      {
        title: 'Online / Offline a synchronizácia',
        content:
          'Vpravo hore je vidno, či je appka práve pripojená na internet. Appka funguje aj úplne bez signálu — všetko, čo na tablete zapíšeš (fotky, checklist, ponuku), sa uloží priamo v zariadení a keď sa pripojenie obnoví, samo sa to odošle na server. Pokiaľ niečo čaká na odoslanie, vidno pri indikátore počet čakajúcich zmien.',
      },
    ],
  },
  {
    id: 'detail-hlavicka',
    title: 'Detail obhliadky — hlavička',
    items: [
      {
        title: 'Referenčné číslo',
        content: 'Jedinečné číslo zákazky v tvare OBH-XXX/ROK. Prideľuje sa automaticky pri založení a už sa nedá zmeniť.',
      },
      {
        title: 'Duplikovať',
        content:
          'Vytvorí novú obhliadku s rovnakými kontaktnými údajmi a rovnakým checklistom (hrany strechy, plochy, odkvapový systém, zvody, technické riešenie, výmera, popis stavu). Fotky, výkres a cenová ponuka sa NEKOPÍRUJÚ — tie sú vždy špecifické pre konkrétnu návštevu/realizáciu. Hodí sa napr. pri viacerých vchodoch toho istého bytového domu.',
      },
      {
        title: 'Priradenie technika',
        content:
          'Výber technika zodpovedného za obhliadku/realizáciu. Používa sa aj v Pláne — appka ťa upozorní, ak má jeden technik dve akcie v ten istý deň.',
      },
    ],
  },
  {
    id: 'fotky',
    title: 'Záložka: Fotky',
    items: [
      {
        title: 'Nahrávanie fotiek',
        content:
          'Dá sa nahrať viacero fotiek naraz, ku každej sa dá napísať popisok. Fotky sa pred uložením zmenšia priamo v telefóne/tablete, aby nezaberali zbytočne veľa miesta.',
      },
      {
        title: 'Označiť na fotke',
        content:
          'Tlačidlo "✎ Označiť na fotke" otvorí fotku s možnosťou kresliť po nej perom (4 farby) — napr. zakrúžkovať poškodené miesto. Po uložení kresba nahradí pôvodnú fotku (pôvodná bez kresby sa nezachováva).',
      },
    ],
  },
  {
    id: 'vykres',
    title: 'Záložka: Výkres',
    items: [
      {
        title: 'Nahrať súbor',
        content: 'Dá sa nahrať odfotená papierová skica alebo PDF nákresu strechy.',
      },
      {
        title: 'Nakresliť výkres',
        content: 'Tlačidlo "✎ Nakresliť výkres" otvorí prázdne plátno, kde sa dá od ruky nakresliť pôdorys strechy priamo na tablete (pero, 4 farby, 3 hrúbky čiary).',
      },
    ],
  },
  {
    id: 'checklist',
    title: 'Záložka: Checklist',
    items: [
      {
        title: 'Základné údaje',
        content:
          'Dátum a čas obhliadky, Výmera strechy (m²) — hlavné číslo, z ktorého sa počíta cena pri "Generovať z checklistu". Je strecha zateplená? — appka podľa tejto odpovede sama navrhne vhodnú materiálovú skladbu pri generovaní ponuky. Popis súčasného stavu — voľný text.',
      },
      {
        title: 'Hrany strechy a atika',
        content:
          'Zoznam hrán/atík s dĺžkou (m) a výškou atiky (cm). Súčet dĺžok sa použije pri generovaní ponuky na riadok "Dodanie a aplikovanie atikového klinu".',
      },
      {
        title: 'Čiastkové plochy strechy',
        content:
          'Rozpis strechy na menšie časti (názov, šírka, výška — plocha m² sa dopočíta sama). Používa sa iba ako doplňujúci popis vo vygenerovanom dokumente "Návrh technického riešenia" (veta "Čiastkové plochy: ..."). Do ceny sa nepremieta — na cenu sa vždy počíta z celkovej Výmery strechy vyššie. Ak ti stačí jedno celkové číslo, túto sekciu netreba vypĺňať.',
      },
      {
        title: 'Odkvapový systém',
        content:
          'Zoznam položiek odkvapového systému (háky, žľab, kotlík, čelá, zvod, kolená, objímky, odkvapový plech, tmel, rohy) s množstvom a jednotkou. Položky žľab/kotlík/zvod/odkvapový plech majú v Katalógu (Cenník) priradenú cenu a pri "Generovať z checklistu" sa automaticky ocenia; ostatné typy sa pridajú s cenou 0 (dopočítaš ručne v Ponuke).',
      },
      {
        title: 'Zvody',
        content: 'Samostatné zvody (označenie + dĺžka), ktoré sa pri generovaní ponuky ocenia podľa ceny zvodového systému.',
      },
      {
        title: 'Technické riešenie',
        content:
          'Zoznam položiek z Katalógu → Technické riešenie, ktoré na tejto obhliadke zaškrtneš. Pri každej zaškrtnutej položke vidno jej jednotku a doplníš Hodnotu (číslo, napr. koľko m² alebo ks) a voliteľnú Poznámku. Zaškrtnuté položky sa automaticky vypíšu do vygenerovaného dokumentu "Návrh technického riešenia". Tlačidlo "+ Pridať vlastnú položku" založí úplne novú položku (názov, jednotka, cena, kategória materiál/práce) — tá sa hneď zaškrtne na tejto obhliadke a od tej chvíle sa ponúka aj na všetkých budúcich obhliadkach (viď aj Katalóg nižšie).',
      },
      {
        title: 'Doplnkové práce navyše',
        content:
          'Voľné položky s popisom a fotkou pre prácu, ktorá nezapadá do bežného checklistu (napr. výmena zhnitého laťovania). Pri generovaní ponuky sa každá stane samostatným riadkom v sekcii "nad rámec" s cenou 0 — cenu doplníš ručne v Ponuke.',
      },
    ],
  },
  {
    id: 'kontakt',
    title: 'Záložka: Kontakt',
    items: [
      {
        title: 'Kontaktné údaje zákazníka',
        content:
          'Meno/názov, Adresa, Pracovisko (vyplň len ak je miesto realizácie iné ako adresa zákazníka — napr. pri firmách/SVB), Telefón, Email, Správca budovy. Ukladá sa automaticky pár sekundov po tom, čo prestaneš písať.',
      },
      {
        title: 'Prečo je email zákazníka dôležitý',
        content:
          'Bez emailu sa zákazníkovi nedá poslať cenová ponuka priamo z appky (tlačidlo "Odoslať zákazníkovi" v Ponuke) a nepríde mu ani deň-vopred pripomienka o dohodnutom termíne.',
      },
    ],
  },
  {
    id: 'ponuka',
    title: 'Záložka: Ponuka',
    items: [
      {
        title: 'Alternatívy (a, b, ...)',
        content:
          'Jedna obhliadka môže mať viacero cenových variantov (napr. "so zateplením" vs. "bez zateplenia"). Prepínaš medzi nimi hornými štítkami, tlačidlom "+ Alternatíva" pridáš ďalší variant.',
      },
      {
        title: 'Generovať z checklistu',
        content:
          'Vytvorí (alebo prepočíta) položky ponuky priamo z údajov na Checkliste: penetračný náter, vrchná hydroizolácia a odvetrávacie komínky podľa Výmery strechy; atikový klin podľa súčtu dĺžok hrán; odkvapový systém a zvody podľa svojich cien; doplnkové práce ako neocenené riadky. Zároveň podľa odpovede "Je strecha zateplená?" sama navrhne vhodnú materiálovú skladbu, ak ešte nie je vybraná. Dá sa kľudne kliknúť opakovane (napr. po úprave checklistu) — pri opätovnom generovaní sa staré automaticky vytvorené riadky nahradia novými, žiadne duplicity nevzniknú. Riadky, ktoré si predtým ručne upravil, sa novým generovaním neprepíšu.',
      },
      {
        title: 'Riadky ponuky (dve sekcie)',
        content:
          'Hydroizolačné a zatepľovacie práce = hlavné položky. Tesárske a klampiarske práce (nad rámec) = doplnkové položky mimo hlavnej hydroizolácie. Stĺpce: Popis, Množstvo (jediné, z ktorého sa počíta cena), Jednotky, Jedn. cena, Stratné % (percento navyše pripočítané k cene, napr. na odrez materiálu), Celkom = Množstvo × Jedn. cena × (1 + Stratné/100).',
      },
      {
        title: 'Zľava, Spolu, Celkom na úhradu',
        content: 'Zľava (%) sa uplatní na súčet danej sekcie. Appka priebežne dopočítava Spolu, výšku zľavy a finálne Celkom na úhradu za obe sekcie dokopy.',
      },
      {
        title: 'Popis alternatívy, dátumy, záruka, realizácia',
        content:
          'Popis alternatívy (napr. "zo zateplením"), Dátum vystavenia, Platí do, Záruka (roky) — všetko sa vypíše do vygenerovanej cenovej ponuky. Realizácia od/do + Čas realizácie od/do — používa sa aj v Pláne (kalendári) a pri deň-vopred pripomienke.',
      },
      {
        title: 'Materiálová skladba',
        content:
          'Výber konkrétnej skladby z Katalógu materiálov (Nastavenia → Materiálové skladby) — jej vrstvy, postup prác a vyzdvihnutý produkt sa použijú vo vygenerovanom dokumente "Návrh technického riešenia".',
      },
      {
        title: 'Upozornenie na chýbajúce polia',
        content:
          'Žltý pás nad tlačidlami ukáže, čo v dokumente ostane prázdne (napr. chýbajúci dátum vystavenia, záruka, materiálová skladba, email zákazníka) — aby sa to zistilo skôr, než dokument uvidí zákazník.',
      },
      {
        title: 'Cenová ponuka (DOCX) / Návrh riešenia (DOCX)',
        content:
          'Stiahne skutočný Word dokument vygenerovaný z firemných šablón, naplnený údajmi tejto alternatívy. "Cenová ponuka" = cenník s položkami. "Návrh riešenia" = technický popis (skladba materiálu, postup prác, fotky, výkres, zaškrtnuté položky z Technického riešenia).',
      },
      {
        title: 'Odoslať zákazníkovi',
        content:
          'Pošle Cenovú ponuku (DOCX) emailom priamo zákazníkovi ako prílohu. Tlačidlo je needostupné, ak zákazník nemá vyplnený email v záložke Kontakt.',
      },
      {
        title: 'Vymazať alternatívu',
        content: 'Natrvalo zmaže celý variant ponuky vrátane všetkých jeho riadkov. Nedá sa vrátiť späť.',
      },
    ],
  },
  {
    id: 'plan',
    title: 'Plán (kalendár)',
    items: [
      {
        title: 'Týždenný / mesačný pohľad',
        content: 'Prepínač hore, šípky na navigáciu vpred/vzad, tlačidlo "Dnes" na návrat na aktuálny týždeň/mesiac.',
      },
      {
        title: 'Farebné odlíšenie',
        content: 'Sivá značka = obhliadka. Farebná (brand) značka = realizácia. Žltá/jantárová = iná (vlastná) udalosť.',
      },
      {
        title: 'Upozornenie na dvojitú rezerváciu technika',
        content: 'Ak má ten istý technik v jeden deň dve alebo viac akcií, appka to označí ⚠ a farebne zvýrazní — je to len upozornenie, appka v tom nebráni.',
      },
      {
        title: '+ Iná udalosť',
        content:
          'Vlastná udalosť nezávislá od zákazky (napr. nákup materiálu, stretnutie s dodávateľom) — názov, dátum, čas od-do, miesto, poznámka. Dá sa zmazať tlačidlom pri položke (obhliadky/realizácie sa mažú/menia cez samotnú zákazku, nie tu).',
      },
      {
        title: '⬇ PDF',
        content: 'Stiahne PDF so zoznamom všetkých dohodnutých činností za práve zobrazené obdobie (deň, typ, zákazník/názov, čas, miesto, technik).',
      },
      {
        title: 'Automatické emailové pripomienky',
        content:
          'Appka každý deň automaticky (o cca 7:00–8:00 ráno) skontroluje, čo je naplánované na zajtra, a pošle pripomienkový email majiteľovi (na email z Firemných údajov) a zákazníkovi (ak má email vyplnený a ide o obhliadku alebo realizáciu). Každá položka dostane pripomienku len raz. Rovnako appka upozorní na blížiaci sa koniec záruky (30 dní vopred, len majiteľovi).',
      },
    ],
  },
  {
    id: 'suhrn',
    title: 'Súhrn (vykonané práce)',
    items: [
      {
        title: 'Prehľad dokončených realizácií',
        content:
          'Vyber mesiac, kvartál alebo rok — appka ukáže zoznam realizácií dokončených v danom období (podľa "Realizácia do" v Ponuke), spolu s celkovou plochou (m²) a tržbou po zľave.',
      },
    ],
  },
  {
    id: 'katalog',
    title: 'Katalóg',
    items: [
      {
        title: 'Prepínač Checklist / Technické riešenie',
        content: 'Katalóg má dva samostatné zoznamy položiek — prepínaš medzi nimi hornými tlačidlami.',
      },
      {
        title: 'Checklist (Cenník)',
        content:
          'Položky používané pri tlačidle "Generovať z checklistu" v Ponuke — kľúč položky, jednotka (ks/m²/bm...), cena, kategória (materiál/práce). Toto je zdrojová cenová databáza appky pre automatické generovanie ponuky.',
      },
      {
        title: 'Technické riešenie',
        content:
          'Položky ponúkané v Checkliste v sekcii "Technické riešenie" — názov, jednotka, cena, kategória, Aktívna (zaškrtávacie políčko) a Pôvod (pôvodná/vlastná). Odškrtnutím "Aktívna" položka zmizne z ponuky pre NOVÉ obhliadky, ale obhliadky, ktoré ju už použili, ostanú nezmenené — takže sa dá bezpečne "vyradiť" zastaraná položka bez toho, aby sa pokazili staré záznamy. Nová položka pridaná priamo v Checkliste tlačidlom "+ Pridať vlastnú položku" sa tu automaticky objaví, a naopak — nová položka pridaná tu sa ponúkne vo všetkých budúcich obhliadkach.',
      },
    ],
  },
  {
    id: 'nastavenia',
    title: 'Nastavenia',
    items: [
      {
        title: 'Technici',
        content: 'Zoznam technikov (meno, email) na priraďovanie k obhliadkam/realizáciám.',
      },
      {
        title: 'Materiálové skladby',
        content:
          'Definície kompletných skladieb strechy — názov, vrstvy (jedna na riadok), postup prác, záruka (roky), vyzdvihnutý produkt (technická charakteristika). Vyberajú sa v Ponuke a ich obsah sa vypisuje do "Návrhu technického riešenia".',
      },
      {
        title: 'Popisy materiálov',
        content: 'Knižnica technických popisov konkrétnych produktov (názov + dlhší popis vlastností), ktoré sa dajú priradiť ako "vyzdvihnutý produkt" k materiálovej skladbe.',
      },
      {
        title: 'Textové šablóny',
        content:
          'Osobný archív textov (napr. príbeh firmy, texty k emailom), ktoré si tu môžeš uložiť a upravovať pre vlastnú potrebu — napríklad ako podklad pri príprave nových Word šablón. Pozor: appka tieto texty automaticky nevkladá do generovaných dokumentov ani emailov — tie majú svoj text pevne v .docx šablónach alebo priamo v kóde emailu.',
      },
      {
        title: 'Firemné údaje',
        content:
          'IČO, DIČ, IBAN, BIC, adresa, email, telefón a logo firmy — vypisujú sa do vygenerovaných dokumentov. Email tu zadaný sa zároveň používa ako adresa majiteľa pre všetky automatické pripomienky (deň-vopred aj koniec záruky).',
      },
    ],
  },
  {
    id: 'ine',
    title: 'Ostatné — prihlásenie, offline, tablet, inštalácia',
    items: [
      {
        title: 'Prihlásenie heslom',
        content: 'Appka je chránená jedným spoločným heslom. Odhlásiť sa dá cez Nastavenia → Odhlásiť sa.',
      },
      {
        title: 'Offline režim',
        content:
          'Appka funguje aj úplne bez internetu — vytvoriť novú zákazku, upraviť checklist, pridať fotky aj ponuku sa dá aj offline, appka to uloží priamo v tablete a sama odošle na server hneď, ako sa pripojenie obnoví (indikátor Online/Offline vpravo hore ukazuje, koľko zmien ešte čaká na odoslanie).',
      },
      {
        title: 'Len pre tablet',
        content: 'Appka je navrhnutá výhradne pre tablety — na telefóne sa zobrazí len upozornenie, že appka je pre tablety, samotný obsah sa nezobrazí.',
      },
      {
        title: 'Inštalácia na plochu (PWA)',
        content:
          'V prehliadači na tablete (Chrome/Safari) ponuka "Pridať na plochu" / "Install app" appku nainštaluje ako samostatnú ikonu, ktorá sa spúšťa ako normálna appka, nie ako záložka v prehliadači.',
      },
    ],
  },
]
