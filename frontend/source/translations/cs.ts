import type {
  FoodCategory,
  HouseholdRole,
  MeasurementUnit,
  StockMovementReason,
  StorageLocation,
  StorageLocationKind,
} from "../api/types";

export const texts = {
  applicationName: "iShelf a recepty",
  common: {
    save: "Uložit",
    cancel: "Zrušit",
    delete: "Smazat",
    rename: "Přejmenovat",
    add: "Přidat",
    loading: "Načítám…",
    offline: "Nepodařilo se spojit se serverem. Zkontroluj připojení k internetu.",
    unexpectedError: "Něco se pokazilo. Zkus to prosím znovu.",
  },
  authentication: {
    logInTitle: "Přihlášení",
    registerTitle: "Registrace",
    email: "E-mail",
    password: "Heslo",
    passwordHint: "Alespoň 8 znaků",
    displayName: "Jméno",
    logIn: "Přihlásit se",
    register: "Zaregistrovat se",
    logOut: "Odhlásit se",
    noAccountYet: "Ještě nemáš účet? Zaregistruj se",
    alreadyHaveAccount: "Už máš účet? Přihlas se",
    incorrectCredentials: "Nesprávný e-mail nebo heslo.",
    emailAlreadyRegistered: "Tento e-mail už je zaregistrovaný.",
    invalidInput: "Zkontroluj prosím vyplněné údaje.",
  },
  navigation: {
    stock: "Zásoby",
    receipts: "Účtenky",
    recipes: "Recepty",
    household: "Domácnost",
  },
  householdSetup: {
    title: "Domácnost",
    introduction:
      "Zásoby sdílíš s ostatními členy domácnosti. Založ novou domácnost, nebo se připoj kódem pozvánky.",
    createTitle: "Založit domácnost",
    householdName: "Název domácnosti",
    create: "Založit",
    joinTitle: "Připojit se kódem",
    inviteCode: "Kód pozvánky",
    join: "Připojit se",
    invalidInviteCode: "Tento kód pozvánky neexistuje.",
    alreadyInHousehold: "Už jsi členem jiné domácnosti.",
  },
  household: {
    inviteTitle: "Pozvat člena",
    inviteDescription: "Pošli tento kód tomu, koho chceš pozvat.",
    shareInviteCode: "Sdílet kód",
    copied: "Kód zkopírován",
    shareMessage: (inviteCode: string) => `Připoj se k mé domácnosti v aplikaci iShelf kódem ${inviteCode}`,
    regenerateInviteCode: "Vytvořit nový kód",
    regenerateConfirmation: "Starý kód přestane platit. Pokračovat?",
    membersTitle: "Členové",
    removeMember: "Odebrat z domácnosti",
    removeMemberConfirmation: (displayName: string) => `Opravdu odebrat ${displayName} z domácnosti?`,
    you: "ty",
    leaveHousehold: "Opustit domácnost",
    leaveConfirmation: "Opravdu chceš opustit domácnost? Tvoje aktivní rezervace se zruší.",
    leaveLastMemberConfirmation:
      "Jsi poslední člen. Odchodem se domácnost i se všemi zásobami a recepty smaže. Pokračovat?",
    storageLocationsTitle: "Místa uložení",
    newStorageLocation: "Nové místo",
    storageLocationName: "Název místa",
    storageLocationNotEmpty: "V tomto místě jsou ještě potraviny. Nejdřív je přesuň nebo spotřebuj.",
    lastStorageLocation: "Poslední místo s historií zásob nejde smazat.",
    deleteStorageLocationConfirmation: (name: string) => `Opravdu smazat místo ${name}?`,
  },
  householdRoles: {
    owner: "vlastník",
    member: "člen",
  } satisfies Record<HouseholdRole, string>,
  storageLocationKinds: {
    fridge: "Lednice",
    freezer: "Mrazák",
    pantry: "Spíž",
    custom: "Vlastní",
  } satisfies Record<StorageLocationKind, string>,
  stock: {
    searchPlaceholder: "Hledat v zásobách",
    allStorageLocations: "Vše",
    empty: "Zatím tu nic není. Přidej první potravinu tlačítkem +.",
    nothingFound: "Nic takového v zásobách není.",
    addStockItem: "Přidat do zásob",
    food: "Potravina",
    startTyping: "Začni psát název potraviny",
    newFoodHint: "Nová potravina, vyber jednotku a kategorii",
    createFoodOption: (name: string) => `Přidat „${name}“`,
    baseUnit: "Měří se v",
    genericName: "Obecný druh (nepovinné)",
    genericNameHint: "Např. Mléko, Mouka, Sýr. Podle něj recepty poznají vhodnou náhradu.",
    category: "Kategorie",
    quantity: "Množství",
    unit: "Jednotka",
    storageLocation: "Místo",
    expirationDate: "Spotřebovat do",
    noExpirationDate: "bez data",
    expiredOn: (date: string) => `prošlo ${date}`,
    expiresToday: "spotřebovat dnes",
    expiresOn: (date: string) => `do ${date}`,
    reserved: (quantity: string) => `rezervováno ${quantity}`,
    reserve: "Rezervovat",
    reservationsTitle: "Rezervace",
    reservationNote: "Poznámka (nepovinné), např. na nedělní oběd",
    reservationBy: (name: string, quantity: string) => `${name}: ${quantity}`,
    cancelReservation: "Zrušit rezervaci",
    notEnoughFree: "Tolik už volné není, část je rezervovaná.",
    reservedByOthers: "Část je rezervovaná jiným členem, sníst můžeš jen volné množství.",
    allReserved: "Všechno je rezervované jinými členy.",
    freeQuantity: (quantity: string) => `volné ${quantity}`,
    invalidQuantity: "Zadej kladné číslo.",
    foodAlreadyExists: "Potravina s tímto názvem už existuje.",
    eatenAll: "Snězeno vše",
    spoiledAll: "Vyhodit (zkažené)",
    writeOffPart: "Odepsat část",
    writeOff: "Odepsat",
    reason: "Důvod",
    moreThanRemains: "Nelze odepsat víc, než zbývá.",
    editTitle: "Upravit",
    correctQuantity: "Opravit množství",
    correctedQuantity: "Skutečné množství",
    correctionHint: "Omylem přidanou položku oprav na 0.",
    historyTitle: "Historie",
    noHistory: "Zatím bez úbytků.",
    addedOn: (date: string) => `Přidáno ${date}`,
    unknownUser: "bývalý člen",
  },
  receipts: {
    scan: "Vyfotit účtenku",
    uploadFile: "Nahrát soubor (fotka nebo PDF)",
    scanning: "Čtu účtenku, chvilku to potrvá…",
    empty: "Zatím žádné účtenky. Vyfoť první účtenku a položky se přidají do zásob.",
    consentTitle: "Souhlas se zpracováním účtenek",
    consentText:
      "Fotka účtenky se odešle ke zpracování umělé inteligenci Google Gemini, která z ní přečte položky. Fotka se nikde neukládá, uloží se jen přečtené položky. Google podle svých podmínek pro placené služby tato data nepoužívá k trénování modelů.",
    consentAgree: "Souhlasím",
    reviewTitle: "Kontrola účtenky",
    storeName: "Obchod",
    purchasedOn: "Datum nákupu",
    totalAmount: "Celkem (Kč)",
    sumMatches: "Součet položek odpovídá celkové částce.",
    sumDiffers: (difference: string) =>
      `Součet položek se liší od celkové částky o ${difference}. Zkontroluj ceny, nebo doplň chybějící položku či slevu.`,
    defaultStorageLocation: "Uložit do",
    itemName: "Název",
    price: "Cena (Kč)",
    addToStock: "Přidat do zásob",
    newFoodSummary: (unit: string, category: string, genericName: string) =>
      `Nová potravina · ${unit} · ${category}${genericName.trim() ? ` · druh ${genericName.trim()}` : ""}`,
    editNewFood: "Upravit",
    removeItem: "Odebrat položku",
    addItem: "Přidat položku",
    newItemText: "Ruční položka",
    originalText: (text: string) => `Na účtence: ${text}`,
    save: "Uložit účtenku",
    saved: "Účtenka uložena",
    invalidPrice: "Zadej cenu, např. 24,90 nebo -20.",
    needsFood: "Vyber potravinu.",
    needsQuantity: "Zadej množství.",
    fixItems: "Některé položky je potřeba opravit.",
    discard: "Zahodit",
    discardConfirmation: "Opravdu zahodit přečtenou účtenku?",
    readFailed: "Účtenku se nepodařilo přečíst. Zkus ji vyfotit znovu, rovně a s dobrým světlem.",
    notConfigured: "Čtení účtenek teď není dostupné.",
    imageTooLarge: "Soubor je příliš velký (nejvýš 10 MB).",
    unsupportedFile: "Tento typ souboru nejde načíst. Použij fotku nebo PDF.",
    itemCount: (count: number) => `${count} ${count === 1 ? "položka" : count < 5 ? "položky" : "položek"}`,
    sumMismatchShort: "nesedí součet",
    addedToStock: "v zásobách",
    uploadedBy: (name: string) => name,
  },
  recipes: {
    searchPlaceholder: "Hledat recept",
    empty: "Zatím žádné recepty. Přidej první tlačítkem +.",
    nothingFound: "Žádný recept neodpovídá hledání.",
    haveEverything: "Máš vše",
    missingCount: (count: number) => `Chybí ${count}`,
    minutes: (minutes: number) =>
      minutes >= 60
        ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim()
        : `${minutes} min`,
    back: "Recepty",
    servings: "Porce",
    missingTitle: "Chybí ti",
    missingNothing: "Všechny suroviny máš doma.",
    missingLine: (name: string, missing: string, required: string) =>
      `${name}: chybí ${missing} z ${required}`,
    missingShort: (missing: string) => `chybí ${missing}`,
    reservedByOthersHint: (quantity: string) => `jiní mají rezervováno ${quantity}`,
    ingredientsTitle: "Suroviny",
    optionalTitle: "Podle chuti",
    statusHave: "máš",
    statusReserved: (quantity: string) => `zarezervováno ${quantity}`,
    anyOfKind: (kind: string) => `jakékoli: ${kind}`,
    instructionsTitle: "Postup",
    priceEstimate: (total: string, perServing: string) => `Odhad ceny: ${total} (${perServing} za porci)`,
    pricePartial: (priced: number, total: number) =>
      `odhad z ${priced} z ${total} surovin podle dřívějších účtenek`,
    priceUnknown: "Odhad ceny zatím není, nejdřív naskenuj účtenky s těmito surovinami.",
    reserveIngredients: "Rezervovat suroviny",
    cooked: "Uvařeno",
    cookTitle: "Odečíst suroviny ze zásob?",
    cookIntroduction: (servings: number) =>
      `Za ${servings} ${servings === 1 ? "porci" : servings < 5 ? "porce" : "porcí"} se ze zásob odečte:`,
    servingCount: (servings: number) =>
      `${servings} ${servings === 1 ? "porce" : servings < 5 ? "porce" : "porcí"}`,
    cookLine: (name: string, quantity: string) => `${name}: ${quantity}`,
    cookMissing: (quantity: string) => `chybí ${quantity}, odečte se jen to, co je doma`,
    cookConfirm: "Odečíst",
    cookDone: "Suroviny odečteny ze zásob",
    reserved: "Suroviny zarezervovány",
    edit: "Upravit",
    delete: "Smazat recept",
    deleteConfirmation: (name: string) => `Opravdu smazat recept ${name}?`,
    newRecipe: "Nový recept",
    editRecipe: "Upravit recept",
    name: "Název",
    preparationMinutes: "Doba přípravy (min)",
    instructions: "Postup",
    addIngredient: "Přidat surovinu",
    removeIngredient: "Odebrat surovinu",
    acceptsAnyOfKind: "Stačí jakákoli stejného druhu",
    isOptional: "Podle chuti (nepovinné)",
    needsFoodAndQuantity: "U každé suroviny vyber potravinu a zadej množství.",
    duplicateFood: "Každá potravina může být v receptu jen jednou.",
    predefined: "předpřipravený",
  },
  units: {
    gram: "gramy (g, kg)",
    milliliter: "mililitry (ml, l)",
    piece: "kusy (ks)",
  } satisfies Record<MeasurementUnit, string>,
  foodCategories: {
    dairy: "Mléčné výrobky",
    meatAndSausages: "Maso a uzeniny",
    fish: "Ryby",
    fruit: "Ovoce",
    vegetables: "Zelenina",
    bakery: "Pečivo",
    dryGoods: "Trvanlivé",
    canned: "Konzervy",
    frozen: "Mražené",
    beverages: "Nápoje",
    spices: "Koření",
    sweets: "Sladkosti",
    other: "Ostatní",
  } satisfies Record<FoodCategory, string>,
  movementReasons: {
    eaten: "Snězeno",
    spoiled: "Zkažené",
    destroyed: "Zničeno",
    cooked: "Uvařeno",
    correction: "Oprava",
  } satisfies Record<StockMovementReason, string>,
  notifications: {
    title: "Upozornění",
    expirationSwitch: "Upozornění na blížící se trvanlivost",
    description: "Každý den v 8:00 přijde souhrn potravin, kterým do 2 dnů končí trvanlivost.",
    unsupported: "Tento prohlížeč upozornění nepodporuje. Na iPhonu je potřeba přidat aplikaci na plochu.",
    denied: "Upozornění jsou v prohlížeči zakázaná. Povol je v nastavení prohlížeče pro tuto stránku.",
    notConfigured: "Upozornění zatím nejsou na serveru nastavená.",
    subscribeFailed:
      "Tento prohlížeč teď nemůže upozornění zapnout. Zkus jiný prohlížeč nebo to zkus později.",
    expirationTitle: (count: number) =>
      count === 1
        ? "1 potravina brzy projde"
        : count < 5
          ? `${count} potraviny brzy projdou`
          : `${count} potravin brzy projde`,
    daysLeft: (days: number) => (days === 0 ? "dnes" : days === 1 ? "zítra" : "pozítří"),
    andMore: (count: number) => `a ${count} další`,
  },
  account: {
    title: "Účet",
    privacyPolicy: "Zásady ochrany soukromí",
    withdrawConsent: "Odvolat souhlas se skenováním účtenek",
    withdrawConsentConfirmation:
      "Další účtenky už nepůjde skenovat, dokud souhlas znovu neudělíš. Už uložené položky zůstanou. Pokračovat?",
    consentWithdrawn: "Souhlas odvolán",
    deleteAccount: "Smazat účet",
    deleteAccountTitle: "Smazat účet natrvalo",
    deleteAccountText:
      "Smaže se tvůj účet, rezervace a přihlášení na všech zařízeních. Zásoby a účtenky zůstanou domácnosti bez tvého jména. Pokud jsi poslední člen, smaže se i celá domácnost. Tuto akci nejde vrátit.",
    confirmationWord: "SMAZAT",
    typeConfirmation: "Pro potvrzení napiš SMAZAT",
    password: "Heslo",
    incorrectPassword: "Nesprávné heslo.",
  },
  registrationConsent: "Registrací souhlasíš se",
  registrationConsentLink: "zásadami ochrany soukromí",
  privacyPolicy: {
    title: "Zásady ochrany soukromí",
    effectiveFrom: "Účinné od 12. 11. 2026",
    back: "Zpět",
    sections: [
      {
        heading: "Kdo data zpracovává",
        paragraphs: [
          "Správcem osobních údajů aplikace iShelf a recepty je Ondřej Líška, e-mail liskaondra2@gmail.com. Na tento e-mail se můžeš obrátit s jakýmkoli dotazem nebo žádostí týkající se tvých údajů.",
        ],
      },
      {
        heading: "Jaké údaje ukládáme a proč",
        paragraphs: [
          "Účet: e-mail, jméno, které zadáš, a heslo uložené pouze jako bezpečný otisk (hash), ze kterého nejde zpětně zjistit.",
          "Domácnost: název domácnosti, její členy, místa uložení, potraviny, zásoby, jejich úbytky a rezervace.",
          "Účtenky: obchod, datum, celková částka a přečtené položky s cenami.",
          "Tyto údaje potřebujeme k tomu, aby aplikace fungovala (plnění smlouvy). Nepoužíváme je k reklamě a neprodáváme je.",
        ],
      },
      {
        heading: "Skenování účtenek",
        paragraphs: [
          "Když vyfotíš nebo nahraješ účtenku, odešleme fotku nebo PDF ke zpracování službě Google Gemini, která z ní přečte položky. Používáme placenou úroveň této služby, u které Google podle svých podmínek odeslaná data nepoužívá k trénování svých modelů.",
          "Fotku ani PDF nikde neukládáme, zpracují se jen v paměti a hned se zahodí. Uloží se pouze položky, které na obrazovce kontroly potvrdíš.",
          "Skenování je možné jen s tvým souhlasem, který udělíš před první účtenkou. Souhlas můžeš kdykoli odvolat na stránce Domácnost. Už uložené položky tím zůstanou zachované.",
        ],
      },
      {
        heading: "Kdo údaje vidí",
        paragraphs: [
          "Členové tvé domácnosti vidí sdílené zásoby, účtenky, rezervace a jména ostatních členů. E-maily ostatních členů nevidí nikdo z domácnosti.",
          "Údaje jsou uložené na serverech v Evropské unii. Kromě služby Google Gemini pro čtení účtenek je nepředáváme nikomu dalšímu.",
        ],
      },
      {
        heading: "Jak dlouho údaje uchováváme",
        paragraphs: [
          "Údaje uchováváme, dokud máš účet. Přihlášení na zařízení vyprší nejpozději po 60 dnech, kdy aplikaci nepoužíváš.",
          "Po smazání účtu se smaže tvůj účet, rezervace a přihlášení. Zásoby, úbytky a účtenky zůstanou domácnosti, ale už bez vazby na tebe. Pokud jsi poslední člen domácnosti, smaže se celá domácnost se všemi daty.",
        ],
      },
      {
        heading: "Tvoje práva",
        paragraphs: [
          "Máš právo na přístup ke svým údajům, jejich opravu a výmaz, na omezení zpracování, na přenositelnost a na odvolání souhlasu. Účet můžeš kdykoli smazat sám na stránce Domácnost, ostatní žádosti pošli na uvedený e-mail.",
          "Pokud si myslíš, že s údaji nakládáme v rozporu se zákonem, můžeš podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.gov.cz).",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Používáme jedinou cookie, která je nutná pro přihlášení. Nepoužíváme reklamní ani analytické cookies.",
        ],
      },
      {
        heading: "Věk",
        paragraphs: ["Aplikace je určena uživatelům starším 15 let."],
      },
    ],
  },
  notFound: "Tato stránka neexistuje.",
};

const defaultStorageLocationNames: Record<StorageLocationKind, string> = {
  fridge: "Fridge",
  freezer: "Freezer",
  pantry: "Pantry",
  custom: "",
};

export function displayStorageLocationName(storageLocation: StorageLocation): string {
  if (storageLocation.name === defaultStorageLocationNames[storageLocation.kind]) {
    return texts.storageLocationKinds[storageLocation.kind];
  }
  return storageLocation.name;
}

const dateFormat = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });

export function formatDate(dateText: string): string {
  const [year, month, day] = dateText.slice(0, 10).split("-").map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}

const timestampFormat = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "short" });

export function formatTimestamp(timestamp: string): string {
  return timestampFormat.format(new Date(timestamp));
}
