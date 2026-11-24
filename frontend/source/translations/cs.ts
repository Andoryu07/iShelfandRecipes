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
    or: "nebo",
    close: "Zavřít",
    back: "Zpět",
    cancel: "Zrušit",
    delete: "Smazat",
    rename: "Přejmenovat",
    add: "Přidat",
    loading: "Načítám…",
    offline: "Nepodařilo se spojit se serverem. Zkontroluj připojení k internetu.",
    unexpectedError: "Něco se pokazilo. Zkus to prosím znovu.",
  },
  authentication: {
    aboutApplication: "Co aplikace umí",
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
    forgotPassword: "Zapomenuté heslo?",
  },
  passwordReset: {
    forgotTitle: "Zapomenuté heslo",
    forgotIntroduction: "Zadej e-mail, se kterým se přihlašuješ. Pošleme ti odkaz na nastavení nového hesla.",
    sendLink: "Poslat odkaz",
    linkSent: (email: string) =>
      `Pokud účet s e-mailem ${email} existuje, poslali jsme na něj odkaz. Platí 1 hodinu. Nevidíš ho? Podívej se i do spamu.`,
    backToLogIn: "Zpět na přihlášení",
    newPasswordTitle: "Nové heslo",
    newPassword: "Nové heslo",
    repeatPassword: "Nové heslo znovu",
    passwordsDiffer: "Hesla se neshodují.",
    savePassword: "Uložit heslo",
    passwordChanged: "Heslo je změněné a ostatní zařízení jsou odhlášená. Teď se přihlas novým heslem.",
    invalidLink: "Odkaz je neplatný nebo už vypršel. Požádej o nový.",
    requestNewLink: "Poslat nový odkaz",
    changeTitle: "Heslo",
    changeDescription: "Po změně se odhlásíš na ostatních zařízeních.",
    changeButton: "Změnit heslo",
    currentPassword: "Současné heslo",
    changed: "Heslo změněno",
  },
  navigation: {
    overview: "Přehled",
    recipe: "Recept",
    stock: "Zásoby",
    receipts: "Účtenky",
    recipes: "Recepty",
    household: "Domácnost",
  },
  householdSetup: {
    title: "Domácnost",
    introduction:
      "Zásoby sdílíš s ostatními členy domácnosti. Založ novou domácnost, nebo požádej o připojení kódem pozvánky.",
    createTitle: "Založit domácnost",
    householdName: "Název domácnosti",
    create: "Založit",
    joinTitle: "Připojit se kódem",
    inviteCode: "Kód pozvánky",
    join: "Připojit se",
    invalidInviteCode: "Tento kód pozvánky neexistuje.",
    alreadyInHousehold: "Už jsi členem jiné domácnosti.",
    joinCodeHint: "Vlastník domácnosti tvou žádost schválí. Když ti poslal odkaz, stačí ho otevřít.",
    sendRequest: "Požádat o připojení",
    waitingTitle: "Čeká se na schválení",
    waitingText: (household: string) =>
      `Žádost o připojení do domácnosti ${household} je odeslaná. Jakmile ji vlastník schválí, aplikace se otevře sama.`,
    cancelRequest: "Zrušit žádost",
    rejectedTitle: "Žádost byla zamítnuta",
    rejectedText: (household: string) =>
      `Vlastník domácnosti ${household} žádost nepřijal. Můžeš založit vlastní domácnost nebo zkusit jiný kód.`,
    dismiss: "Rozumím",
    joiningByLink: "Připojuji tě do domácnosti…",
    linkInvalid: "Odkaz už neplatí. Mohl být použit, zrušen nebo mu vypršela platnost. Požádej o nový.",
    linkWithoutToken: "Odkaz je neúplný. Zkopíruj ho prosím celý.",
    alreadyMember: "Už jsi členem domácnosti. Pro připojení k jiné ji nejdřív opusť.",
    continue: "Pokračovat",
  },
  household: {
    inviteTitle: "Pozvat člena",
    inviteDescription: "Kdo zadá tento kód, pošle žádost a vlastník ji schválí.",
    inviteLink: "Pozvat odkazem",
    inviteLinkHint: "Odkaz připojí jednoho člověka hned, bez schválení. Platí 7 dní.",
    inviteLinkMessage: (url: string) => `Připoj se k mé domácnosti v aplikaci iShelf: ${url}`,
    inviteLinkCopied: "Odkaz zkopírován",
    activeLinks: "Nepoužité odkazy",
    linkValidUntil: (date: string) => `platí do ${date}`,
    revokeLink: "Zrušit",
    joinRequestsTitle: "Žádosti o připojení",
    approve: "Schválit",
    reject: "Zamítnout",
    requestedAt: (date: string) => `žádost ${date}`,
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
    soonSection: "Brzy projde",
    recentFoods: "Naposledy:",
    inOneDay: "+1 den",
    inThreeDays: "+3 dny",
    inOneWeek: "+1 týden",
    inOneMonth: "+1 měsíc",
    pickDate: "Vybrat datum…",
    editFood: "Upravit potravinu",
    foodSaved: "Potravina upravena",
    otherSection: "Ostatní",
    empty: "Zatím tu nic není. Přidej první potravinu, nebo vyfoť účtenku.",
    nothingFound: "Nic takového v zásobách není.",
    addStockItem: "Přidat do zásob",
    food: "Potravina",
    startTyping: "Začni psát název potraviny",
    newFoodHint: "Nová potravina, vyber kategorii",
    createFoodOption: (name: string) => `Přidat „${name}“`,
    baseUnit: "Měří se v",
    genericName: "Obecný druh (nepovinné)",
    genericNameHint: "Např. Mléko, Mouka, Sýr. Podle něj recepty poznají vhodnou náhradu.",
    category: "Kategorie",
    quantity: "Množství",
    prefilledFromLastTime: "Předvyplněno podle minula",
    prefilledFromCatalog: "Předvyplněno podle balení z databáze potravin",
    yourFoods: "Tvoje potraviny",
    catalogFoods: "Databáze potravin (Open Food Facts)",
    prefillWarningTitle: "Množství podle minula",
    prefillWarningText: (quantity: string) =>
      `Množství ${quantity} je předvyplněné podle toho, kolik se přidávalo minule. Sedí i tentokrát?`,
    catalogPrefillTitle: "Množství z databáze potravin",
    catalogPrefillText: (quantity: string) =>
      `Množství ${quantity} je předvyplněné podle balení v databázi potravin. Sedí s tím, co je na obalu?`,
    doNotShowAgain: "Příště nezobrazovat",
    editQuantity: "Upravit",
    prefillConfirm: "Ano, přidat",
    storageLocation: "Místo",
    expirationDate: "Spotřebovat do",
    noExpirationDate: "bez data",
    expiredOn: (date: string) => `prošlo ${date}`,
    expiresToday: "spotřebovat dnes",
    expired: "prošlé",
    today: "dnes",
    tomorrow: "zítra",
    inDays: (days: number) => `za ${days} ${days < 5 ? "dny" : "dní"}`,
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
    swipeHint: "Tip: potáhni řádek doprava, když potravinu sníš, nebo doleva, když ji vyhazuješ.",
    swipeEaten: "Snězeno",
    swipeSpoiled: "Vyhodit",
    quickWriteOffDone: (reason: "eaten" | "spoiled", name: string, quantity: string) =>
      `${reason === "eaten" ? "Snězeno" : "Vyhozeno"}: ${name} (${quantity})`,
    quickWriteOffReserved: "Tahle potravina je celá rezervovaná pro ostatní, sníst ji teď nejde.",
    undo: "Zpět",
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
    showSavedReceipt: "Zobrazit",
    possibleDuplicate: (matchedBy: "file" | "receiptNumber" | "storeDateTotal", description: string) =>
      matchedBy === "receiptNumber"
        ? `Účtenka se stejným číslem už je uložená (${description}). Zkontroluj, jestli ji neukládáš podruhé.`
        : `Účtenka se stejným obchodem, datem a částkou už je uložená (${description}). Může jít o dva stejné nákupy.`,
    sameFileTitle: "Tahle účtenka už je načtená",
    sameFileText: (description: string) =>
      `Stejný soubor už je uložený jako účtenka ${description}. Když ho načteš znovu, spotřebuje se jeden sken.`,
    scanAnyway: "Přesto načíst",
    sharedTitle: "Přidat potraviny z této účtenky?",
    sharedText: "Účtenku přečteme a položky si před uložením zkontroluješ.",
    sharedConfirm: "Načíst účtenku",
    sharedUnsupported: "Sdílený obsah není obrázek ani PDF. Pošli účtenku jako obrázek nebo PDF soubor.",
    sharedMissing: "Sdílená účtenka už není k dispozici. Zkus ji sdílet znovu.",
    scan: "Vyfotit účtenku",
    uploadFile: "Nahrát soubor (fotka nebo PDF)",
    scanning: "Čtu účtenku, chvilku to potrvá…",
    empty: "Zatím žádné účtenky. Vyfoť první účtenku a položky se přidají do zásob.",
    consentTitle: "Souhlas se zpracováním fotek",
    consentText:
      "Fotky účtenek a receptů se odešlou ke zpracování umělé inteligenci Google Gemini, která z nich přečte položky nebo recept. Fotky se nikde neukládají, uloží se jen to, co na obrazovce kontroly potvrdíš. Google podle svých podmínek pro placené služby tato data nepoužívá k trénování modelů.",
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
    removeItem: "Odebrat položku",
    addItem: "Přidat položku",
    newItemText: "Ruční položka",
    originalText: (text: string) => `Na účtence: ${text}`,
    save: "Uložit účtenku",
    saveWithCount: (count: number) => `Uložit (${count} do zásob)`,
    sumMatchesShort: (sum: string) => `✓ Součet sedí (${sum})`,
    collapse: "Sbalit",
    rememberedHint: "jako minule",
    quantityFromHistory: "množství jako minule",
    quantityFromCatalog: "množství podle ostatních",
    estimateChip: "ODHAD",
    estimateFromModel:
      "Množství není na účtence, je to jen odhad obvyklého balení. Zkontroluj ho na obalu a oprav, nebo potvrď.",
    estimateTypical:
      "Množství není na účtence, je to jen obvyklá velikost balení tohoto druhu. Zkontroluj ho na obalu a oprav, nebo potvrď.",
    estimateConfirm: "Sedí",
    estimatesBanner: (count: number) =>
      `${count === 1 ? "1 položka má" : count < 5 ? `${count} položky mají` : `${count} položek má`} jen odhadnuté množství (oranžově). Než účtenku uložíš, zkontroluj je na obalech.`,
    estimatesConfirmTitle: "Některá množství jsou jen odhad",
    estimatesConfirmText: (count: number) =>
      `${count === 1 ? "1 položka má" : count < 5 ? `${count} položky mají` : `${count} položek má`} množství jen odhadnuté. Do zásob se uloží odhad, který nemusí odpovídat skutečnosti.`,
    estimatesCheck: "Zkontrolovat",
    estimatesSaveAnyway: "Uložit i tak",
    newFoodShort: "nová potravina",
    notToStock: "nejde do zásob",
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
    filterCookNow: "Můžu uvařit hned",
    filterExpiring: "Využije brzy prošlé",
    filterVegetarian: "Vegetariánské",
    moreFilters: "Filtry",
    filtersTitle: "Filtry a řazení",
    maxMissingTitle: "Chybí nejvýš",
    maxMissingAny: "Libovolný počet (5 a víc)",
    maxMissingNone: "Nic nechybí (mám vše)",
    maxMissingChip: (count: number) => (count === 0 ? "Mám vše" : `Chybí nejvýš ${count}`),
    dishTypeTitle: "Druh jídla",
    containsTitle: "Obsahuje suroviny",
    containsHint: (maximum: number) => `Vyber až ${maximum} potravin, recept musí obsahovat všechny.`,
    containsLimit: (maximum: number) => `Víc než ${maximum} potravin vybrat nejde.`,
    chooseFood: "Přidat potravinu",
    sortTitle: "Řazení",
    sortOptions: {
      name: "Podle názvu",
      missing: "Nejméně chybí",
      time: "Nejkratší příprava",
      price: "Nejlevnější",
    },
    favouritesStayOnTop: "Oblíbené recepty zůstávají vždy nahoře.",
    clearFilters: "Zrušit filtry",
    showResults: (count: number) => `Zobrazit (${count})`,
    usesExpiring: (count: number) => `využije ${count} brzy prošl${count === 1 ? "ou" : "é"}`,
    vegetarian: "vegetariánské",
    dishType: "Druh jídla",
    dishTypeNone: "Neurčeno",
    isVegetarian: "Vegetariánské (bez masa a ryb)",
    dishTypes: {
      soup: "Polévka",
      mainCourse: "Hlavní jídlo",
      sideDish: "Příloha",
      dessert: "Dezert",
      breakfast: "Snídaně",
    },
    filterQuick: "Do 30 min",
    filterOwn: "Moje",
    moreActions: "Další akce",
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
    missingWhole: (name: string, missing: string) => `${name}: chybí ${missing}`,
    moreMissing: (count: number) => `a další (${count})`,
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
    reserveShort: "Rezervovat",
    addFavourite: "Přidat do oblíbených",
    writeRecipe: "Napsat recept",
    cookingMode: "Vařím (obrazovka nezhasne)",
    scanRecipe: "Vyfotit recept z kuchařky",
    scanTitle: "Recept z fotky",
    scanIntroduction: "Vyfoť stránku s receptem. Když je recept přes víc stránek, přidej až 3 fotky.",
    scanAllowance: (used: number, limit: number, period: "month" | "total") =>
      `Využito ${used} z ${limit} skenování receptů${period === "month" ? " tento měsíc" : ""}.`,
    scanLimitReached: (limit: number, period: "month" | "total") =>
      period === "month"
        ? `Všech ${limit} skenování receptů na tento měsíc je využitých. Recepty můžeš dál psát ručně.`
        : `Všechna ${limit} skenování receptů jsou využitá. Víc jich má Premium, recepty můžeš dál psát ručně.`,
    takePhoto: "Vyfotit stránku",
    uploadPhoto: "Nahrát fotku nebo PDF",
    page: (number: number) => `Stránka ${number}`,
    removePage: "Odebrat stránku",
    readRecipe: "Přečíst recept",
    readingRecipe: "Čtu recept, chvilku to potrvá…",
    scanFailed: "Recept se nepodařilo přečíst. Zkus ostřejší fotku s celým receptem.",
    scanNoRecipe: "Na fotce jsme recept nenašli. Vyfoť celou stránku s receptem.",
    scanNotConfigured: "Čtení receptů zatím není na serveru nastavené.",
    scanTooLarge: "Fotka je příliš velká.",
    scanUnsupported: "Tento typ souboru nejde použít. Pošli fotku nebo PDF.",
    recipeConsentTitle: "Fotky receptů",
    recipeConsentText:
      "Fotky receptů se stejně jako účtenky odešlou ke zpracování službě Google Gemini a nikde se neukládají. Přečtený recept si před uložením zkontroluješ a zůstane jen ve tvé domácnosti.",
    scannedNotice: "Recept je přečtený z fotky. Zkontroluj suroviny a množství, než ho uložíš.",
    scannedMissingQuantities: (count: number) =>
      `${count} ${count === 1 ? "surovině" : "surovinám"} chybí množství, doplň ho prosím.`,
    removeFavourite: "Odebrat z oblíbených",
    filterFavourites: "Oblíbené",
    cooked: "Uvařeno",
    cookTitle: "Odečíst suroviny ze zásob?",
    cookIntroduction: (servings: number) =>
      `Za ${servings} ${servings === 1 ? "porci" : servings < 5 ? "porce" : "porcí"} se ze zásob odečte:`,
    servingCount: (servings: number) =>
      `${servings} ${servings === 1 ? "porce" : servings < 5 ? "porce" : "porcí"}`,
    cookLine: (name: string, quantity: string) => `${name}: ${quantity}`,
    cookedWithMissing: (count: number) => `Uvařeno (chybí ${count})`,
    cookMissingTitle: "Některé suroviny chybí",
    cookMissingWarning: "Tyto suroviny v zásobách nejsou. Odečte se jen to, co doma je:",
    cookAnyway: "Uvařit i tak",
    addMissing: "Přidat chybějící potraviny",
    addMissingTitle: "Přidat do zásob",
    addMissingHint: "Máš víc, než recept potřebuje? Uprav množství, zbytek zůstane v zásobách.",
    addMissingConfirm: (count: number) => `Přidat (${count})`,
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
    isForFrying: "Na smažení (do výživy jen 10 %)",
    forFrying: "na smažení",
    needsFoodAndQuantity: "U každé suroviny vyber potravinu a zadej množství.",
    duplicateFood: "Každá potravina může být v receptu jen jednou.",
    predefined: "předpřipravený",
  },
  spending: {
    receiptsTab: "Účtenky",
    spendingTab: "Útraty",
    previousMonth: "Předchozí měsíc",
    nextMonth: "Další měsíc",
    spentThisMonth: "Utraceno",
    receiptCount: (count: number) =>
      `${count} ${count === 1 ? "účtenka" : count >= 2 && count <= 4 ? "účtenky" : "účtenek"}`,
    changeAgainstPrevious: (percent: number) =>
      percent === 0
        ? "stejně jako minulý měsíc"
        : percent < 0
          ? `o ${-percent} % méně než minulý měsíc`
          : `o ${percent} % více než minulý měsíc`,
    discounts: (amount: string) => `ušetřeno na slevách ${amount}`,
    trend: "Vývoj",
    sixMonths: "6 měsíců",
    year: "Rok",
    monthsChart: "Útraty po měsících",
    monthTooltip: (month: string, total: string, count: number) =>
      `${month}: ${total} (${count} ${count === 1 ? "účtenka" : count >= 2 && count <= 4 ? "účtenky" : "účtenek"})`,
    byStore: "Podle obchodů",
    byCategory: "Podle kategorií",
    unknownStore: "Neznámý obchod",
    noReceipts: "V tomto měsíci nejsou žádné uložené účtenky.",
    overviewTitle: (month: string) => `Útraty v ${month}`,
    overviewEmpty: "Útraty se spočítají z uložených účtenek.",
  },
  foodPhotos: {
    menuLabel: "Změnit ikonu nebo fotku potraviny",
    changeIcon: "Změnit ikonu",
    takePhoto: "Vyfotit",
    choosePhoto: "Vybrat fotku",
    removePhoto: "Odebrat fotku",
    failed: "Fotku se nepodařilo uložit. Zkus to znovu.",
  },
  icons: {
    title: "Vyber ikonu",
    change: "Změnit",
    ownIcon: "Vlastní ikona",
    automaticIcon: "Automatická ikona",
    automaticHint: "První ikona se vybírá automaticky podle druhu nebo kategorie.",
    changeStorageLocationIcon: "Změnit ikonu",
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
    moved: "Přesunuto",
  } satisfies Record<StockMovementReason, string>,
  shoppingList: {
    title: "Nákupní seznam",
    open: "Nákupní seznam",
    shared: "Společný",
    personal: "Můj",
    sharedHint: "Vidí a upravuje celá domácnost.",
    personalHint: "Vidíš jen ty.",
    addPlaceholder: "Co koupit?",
    add: "Přidat",
    empty: "Seznam je prázdný. Přidej, co chceš koupit, nebo chybějící suroviny z receptu.",
    inCart: (count: number) => `V košíku (${count})`,
    addBoughtToStock: (count: number) => `Přidat koupené do zásob (${count})`,
    clearChecked: "Smazat odškrtnuté",
    addBoughtTitle: "Přidat koupené do zásob",
    addBoughtHint: "Zkontroluj množství, místo a datum. Přidané položky zmizí ze seznamu.",
    forRecipe: (name: string) => `pro ${name}`,
    addedBy: (name: string) => `přidal(a) ${name}`,
    editTitle: "Položka seznamu",
    quantity: "Množství (nepovinné)",
    note: "Poznámka (nepovinné)",
    moveToPersonal: "Přesunout na můj seznam",
    moveToShared: "Přesunout na společný seznam",
    remove: "Odebrat ze seznamu",
    addMissing: "Na nákupní seznam",
    addedMissing: (count: number) =>
      count === 0
        ? "Na seznamu už všechno je."
        : `Na nákupní seznam ${count === 1 ? "přidána 1 položka" : count < 5 ? `přidány ${count} položky` : `přidáno ${count} položek`}`,
    ranOut: "Došlo, přidat na seznam",
    addedFood: (name: string) => `${name} je na nákupním seznamu`,
    show: "Zobrazit",
    overviewTitle: "Nákupní seznam",
    overviewEmpty: "Nic nechybí.",
    overviewCount: (count: number) =>
      count === 1
        ? "1 položka ke koupi"
        : count < 5
          ? `${count} položky ke koupi`
          : `${count} položek ke koupi`,
  },
  history: {
    movedBetween: (from: string, to: string) => `Přesunuto: ${from} → ${to}`,
    unknownStorageLocation: "smazané místo",
    storageLocationTitle: (name: string) => `Historie: ${name}`,
    storageLocationEmpty: "Tady se zatím nic nestalo.",
    added: "Přidáno",
    movedIn: (from: string) => `Přesunuto sem z: ${from}`,
    movedOut: (to: string) => `Přesunuto do: ${to}`,
    cookingsTitle: "Historie vaření",
    cookingsEmpty: "Tento recept zatím nikdo neuvařil.",
    householdCookingsEmpty: "Zatím se nic nevařilo. Uvařené recepty se tu objeví po stisknutí Uvařeno.",
    deletedRecipe: (name: string) => `${name} (smazaný recept)`,
    today: "Dnes",
    yesterday: "Včera",
    openHistory: "Historie",
    cookingLine: (name: string, servings: string) => `${name} · ${servings}`,
  },
  notifications: {
    title: "Upozornění",
    joinRequestTitle: "Nová žádost o připojení",
    joinRequestBody: (name: string) =>
      `${name} se chce připojit k tvé domácnosti. Otevři Domácnost a rozhodni.`,
    expirationSwitch: "Upozornění na blížící se trvanlivost",
    description: (hour: number, days: number) =>
      days === 0
        ? `Každý den v ${hour}:00 přijde souhrn potravin, kterým ten den končí trvanlivost.`
        : `Každý den v ${hour}:00 přijde souhrn potravin, kterým do ${days} ${days === 1 ? "dne" : "dnů"} končí trvanlivost.`,
    settingsTitle: "Kdy upozornit",
    settingsDescription: "Nastavení platí jen pro tebe. Podle něj se počítá i sekce Brzy projde v zásobách.",
    hour: "Čas souhrnu",
    daysAhead: "Kolik dní předem",
    daysAheadOption: (days: number) =>
      days === 0
        ? "v den konce"
        : days === 1
          ? "1 den"
          : days < 5
            ? `${days} dny`
            : days === 7
              ? "týden"
              : `${days} dní`,
    settingsSaved: "Nastavení uloženo",
    unsupported: "Tento prohlížeč upozornění nepodporuje. Na iPhonu je potřeba přidat aplikaci na plochu.",
    denied: "Upozornění jsou v prohlížeči zakázaná. Povol je v nastavení prohlížeče pro tuto stránku.",
    sendTest: "Poslat zkušební upozornění",
    testSent: "Zkušební upozornění odesláno. Mělo by se objevit do pár sekund.",
    testFailed: "Zkušební upozornění se nepodařilo doručit. Vypni a znovu zapni upozornění a zkus to znovu.",
    testTitle: "Upozornění fungují",
    testBody: "Takhle ti bude iShelf připomínat potraviny, kterým končí trvanlivost.",
    hints: {
      iosInstall:
        "Na iPhonu a iPadu fungují upozornění jen v aplikaci přidané na plochu (iOS 16.4 a novější). V Safari ťukni na Sdílet → Přidat na plochu, otevři iShelf z plochy a zapni upozornění tam.",
      iosTooOld:
        "Upozornění potřebují iOS 16.4 nebo novější. Aktualizuj prosím systém v Nastavení → Obecné → Aktualizace.",
      brave:
        "V Brave jsou upozornění ve výchozím stavu vypnutá. Otevři Nastavení → Soukromí a zabezpečení, zapni Používat služby Google pro push zprávy, restartuj Brave a zkus to znovu.",
      deniedIos: "Upozornění jsou zakázaná. Povol je v Nastavení → Oznámení → iShelf → Povolit oznámení.",
      deniedInstalledAndroid:
        "Upozornění jsou zakázaná. Povol je v Nastavení telefonu → Aplikace → iShelf → Oznámení a pak sem vrať.",
      deniedFirefox:
        "Upozornění jsou zakázaná. Ťukni na zámek vedle adresy → Oprávnění → Oznámení → Povolit a stránku obnov.",
      deniedSafari:
        "Upozornění jsou zakázaná. Otevři Safari → Nastavení → Webové stránky → Oznámení, u ishelf.cz zvol Povolit a stránku obnov.",
      deniedMobile:
        "Upozornění jsou zakázaná. Ťukni na ikonu vedle adresy → Oprávnění (Nastavení webu) → Oznámení → Povolit a stránku obnov.",
      deniedDesktop:
        "Upozornění jsou zakázaná. Klikni na ikonu vedle adresy → Nastavení webu → Oznámení → Povolit a stránku obnov.",
    },
    notConfigured: "Upozornění zatím nejsou na serveru nastavená.",
    subscribeFailed:
      "Tento prohlížeč teď nemůže upozornění zapnout. Zkus jiný prohlížeč nebo to zkus později.",
    expirationTitle: (count: number) =>
      count === 1
        ? "1 potravina brzy projde"
        : count < 5
          ? `${count} potraviny brzy projdou`
          : `${count} potravin brzy projde`,
    daysLeft: (days: number) =>
      days === 0
        ? "dnes"
        : days === 1
          ? "zítra"
          : days === 2
            ? "pozítří"
            : `za ${days} ${days < 5 ? "dny" : "dní"}`,
    andMore: (count: number) => `a ${count} další`,
  },
  unhealthy: {
    title: "Nezdravé útraty",
    premiumTeaser:
      "Kolik utrácíš za sladkosti, slané pochutiny, slazené nápoje, alkohol a tabák a jak se to mění měsíc od měsíce.",
    share: (percent: number) => `${percent} % všech útrat`,
    nothing: "Tento měsíc žádné nezdravé nákupy.",
    label: "Nezdravé",
    none: "Ne",
    kinds: {
      sweets: "Sladkosti",
      saltySnacks: "Slané pochutiny",
      sugaryDrinks: "Slazené nápoje",
      alcohol: "Alkohol",
      tobacco: "Tabák",
    },
  },
  nutrition: {
    title: "Výživové hodnoty",
    summary: (kcal: number, isLiquid: boolean) => `${kcal} kcal na 100 ${isLiquid ? "ml" : "g"}`,
    per100: (isLiquid: boolean) => `Na 100 ${isLiquid ? "ml" : "g"}`,
    empty: "Hodnoty zatím nejsou vyplněné. Doplníš je z obalu, nebo se doplní samy u potravin z databáze.",
    edit: "Upravit hodnoty",
    fillIn: "Doplnit z obalu",
    editTitle: (name: string) => `Výživové hodnoty: ${name}`,
    editHint: (isLiquid: boolean) =>
      `Opiš hodnoty na 100 ${isLiquid ? "ml" : "g"} z obalu. Prázdná pole zůstanou nevyplněná.`,
    invalidValue: "Zadej číslo od 0 do 1000.",
    pieceWeight: "Hmotnost 1 ks (g)",
    pieceWeightHint: "Podle ní se kusy přepočítají na gramy, třeba u výživy receptu.",
    pieceWeightValue: (grams: number) => `1 ks váží ${String(grams).replace(".", ",")} g`,
    nutriscore: (grade: string) => `Nutri-Score ${grade}`,
    labels: {
      energyKcal: "Energie",
      fat: "Tuky",
      saturatedFat: "z toho nasycené",
      carbohydrates: "Sacharidy",
      sugars: "z toho cukry",
      proteins: "Bílkoviny",
      fiber: "Vláknina",
      salt: "Sůl",
    },
    recipeTitle: "Výživa na porci",
    recipeKcal: (kcal: number) => `~${kcal} kcal`,
    recipeMacros: (proteins: string, fat: string, carbohydrates: string) =>
      `bílkoviny ${proteins} · tuky ${fat} · sacharidy ${carbohydrates}`,
    recipeKnown: (known: number, total: number) =>
      known === total
        ? "Spočítáno ze všech surovin."
        : `Spočítáno z ${known} z ${total} surovin, u ostatních hodnoty chybí.`,
    fryingNote: "Tuk na smažení se počítá jen z 10 %, kolik ho jídlo nasaje.",
    recipeUnknown: "Výživu nejde spočítat, suroviny zatím nemají vyplněné hodnoty.",
  },
  barcodes: {
    scan: "Naskenovat čárový kód",
    title: "Čárový kód",
    hint: "Namiř fotoaparát na čárový kód na obalu.",
    noCamera: "Fotoaparát není dostupný nebo k němu aplikace nemá přístup. Kód můžeš opsat.",
    typeCode: "Kód z obalu",
    useCode: "Použít",
    invalidCode: "Kód nesedí, zkontroluj čísla.",
    looking: "Hledám potravinu…",
    knownFood: (name: string) => `Kód patří potravině ${name} z tvé domácnosti.`,
    fromCatalog:
      "Nalezeno v databázi potravin. Zkontroluj název, druh a množství podle obalu, data v databázi nemusí být přesná.",
    notFound: (barcode: string) =>
      `Kód ${barcode} v databázi není. Napiš název potraviny, příště ji podle kódu poznáme.`,
    lookupFailed: "Kód se nepodařilo vyhledat. Zkus to znovu.",
  },
  households: {
    title: "Tvoje domácnosti",
    switch: "Přepnout domácnost",
    add: "Vytvořit nebo připojit další domácnost",
    addTitle: "Další domácnost",
    addIntroduction: (count: number, limit: number) =>
      `Máš ${count} z ${limit} ${limit === 1 ? "domácnosti" : "domácností"}.`,
    limitReached: "Víc domácností mít nemůžeš. Ve verzi zdarma jde mít 1 domácnost, s Premium až 3.",
    premiumLimitReached: "Máš nejvyšší možný počet domácností (3).",
    morePremium:
      "Ve verzi zdarma můžeš mít jednu domácnost. S Premium můžeš mít až tři, třeba byt, chatu a domácnost rodičů.",
    morePremiumShort: "Až 3 domácnosti s Premium",
    alreadyMember: "V této domácnosti už jsi.",
    cannotBeShared: "Tuto domácnost nejde sdílet.",
    lockedShort: "uzamčená",
    lockedTitle: "Domácnost je uzamčená",
    lockedOwner: (isOverMemberLimit: boolean, limit: number) =>
      `${isOverMemberLimit ? `Bez Premium může mít domácnost nejvýš ${limit} členů.` : "Bez Premium můžeš mít jen jednu vlastní domácnost, odemčená zůstává ta nejstarší."} Dokud si znovu nezapneš Premium${isOverMemberLimit ? " nebo neodebereš členy" : ""}, nejde tu nic přidávat, skenovat ani měnit. Data si můžeš prohlížet a stáhnout do CSV.`,
    lockedMember:
      "Vlastníkovi skončilo Premium a domácnost teď přesahuje limity jeho tarifu. Dokud ho neobnoví, nejde tu nic přidávat, skenovat ani měnit. Data si můžeš prohlížet a stáhnout do CSV.",
    locksSoonTitle: "Domácnost se brzy uzamkne",
    locksSoonOwner: (time: string) =>
      `Tvoje Premium skončilo a domácnost přesahuje limity verze zdarma. Uzamkne se ${time} a pak v ní nepůjde nic měnit. Obnov Premium, nebo odeber členy navíc.`,
    locksSoonMember: (time: string) =>
      `Vlastníkovi skončilo Premium. Pokud ho neobnoví, domácnost se uzamkne ${time} a pak v ní nepůjde nic měnit.`,
    lockedAction:
      "Domácnost je uzamčená, protože má víc členů, než dovoluje tarif vlastníka. Změny teď nejdou uložit.",
    storageLocationCount: (count: number, limit: number) => `${count} z ${limit} úložišť`,
    storageLimitReached:
      "Víc úložišť ve verzi zdarma mít nejde. S Premium vlastníka domácnosti jich může být až 9.",
    storageLimitReachedPremium: "Domácnost má nejvyšší možný počet úložišť (9).",
    exportTitle: "Export dat",
    exportDescription:
      "Stáhni si zásoby nebo položky z účtenek jako tabulku. Soubor Excel otevřou Tabulky Google i telefon, CSV se hodí pro český Excel.",
    exportExcel: "Excel",
    exportCsv: "CSV",
    exportStock: "Zásoby",
    exportReceipts: "Účtenky",
    exportFailed: "Export se nepodařil. Zkus to znovu.",
    stockFileName: "zasoby",
    receiptsFileName: "uctenky",
    stockColumns: [
      "Potravina",
      "Druh",
      "Kategorie",
      "Množství",
      "Jednotka",
      "Rezervováno",
      "Úložiště",
      "Spotřebovat do",
    ],
    receiptColumns: [
      "Datum",
      "Obchod",
      "Text na účtence",
      "Potravina",
      "Kategorie",
      "Množství",
      "Jednotka",
      "Cena",
      "Sleva",
    ],
  },
  tour: {
    next: "Další",
    back: "Zpět",
    skip: "Přeskočit",
    done: "Hotovo",
    progress: (step: number, count: number) => `${step} z ${count}`,
    helpButton: "Nápověda k této obrazovce",
    offerTitle: "Chceš krátkou prohlídku aplikace?",
    offerText:
      "Ukážu ti, kde co najdeš a k čemu jsou jednotlivá tlačítka. Zabere to asi minutu a kdykoli ji můžeš ukončit.",
    offerHint: "Prohlídku každé obrazovky spustíš i později otazníkem v horní liště.",
    offerShow: "Ukázat",
    offerLater: "Teď ne",
    hintText: "Poprvé tady? Ukážu ti, co na této obrazovce najdeš.",
    hintShow: "Ukázat",
    names: {
      overview: "Přehled",
      stock: "Zásoby",
      receipts: "Účtenky",
      recipes: "Recepty",
      recipeDetail: "Detail receptu",
      household: "Domácnost",
      shoppingList: "Nákupní seznam",
    },
    steps: {
      overview: {
        welcome: {
          title: "Vítej v aplikaci",
          text: "Tohle je Přehled, tvoje výchozí obrazovka. Ukážu ti, co tu najdeš a jak se dostaneš jinam.",
        },
        scan: {
          title: "Vyfotit účtenku",
          text: "Nejrychlejší způsob, jak naskladnit nákup. Položky z účtenky se přečtou samy a ty je jen zkontroluješ.",
        },
        add: {
          title: "Přidat potravinu",
          text: "Jednu potravinu přidáš ručně nebo naskenováním čárového kódu na obalu.",
        },
        expiring: {
          title: "Brzy projde",
          text: "Co je potřeba sníst nejdřív. Kolik dní dopředu se má potravina ukázat, nastavíš v Profilu v části Upozornění.",
        },
        spending: {
          title: "Útraty",
          text: "Kolik jste tento měsíc utratili podle uložených účtenek. Klepnutím otevřeš podrobný přehled.",
        },
        cookNow: {
          title: "Můžeš uvařit hned",
          text: "Recepty, na které máš doma všechny suroviny.",
        },
        householdSwitcher: {
          title: "Domácnost",
          text: "Pod názvem obrazovky vidíš, ve které domácnosti jsi. Klepnutím ji přepneš nebo přidáš další.",
        },
        shoppingCart: {
          title: "Nákupní seznam",
          text: "Košík otevře nákupní seznam. Číslo ukazuje, kolik věcí zbývá koupit.",
        },
        help: {
          title: "Nápověda",
          text: "Otazník spustí prohlídku obrazovky, na které zrovna jsi. Návody najdeš i v Profilu.",
        },
        profile: {
          title: "Profil",
          text: "Účet, Premium, vzhled a vibrace, upozornění, soukromí a nápověda.",
        },
        navigation: {
          title: "Záložky",
          text: "Tady přepínáš mezi Přehledem, Zásobami, Recepty, Účtenkami a Domácností. Na každé záložce ti otazník ukáže, co tam najdeš.",
        },
      },
      stock: {
        search: {
          title: "Hledání",
          text: "Napiš část názvu a seznam se hned zúží. Na diakritice nezáleží.",
        },
        locations: {
          title: "Místa uložení",
          text: "Zobraz jen lednici, mrazák nebo spíž. Místa upravíš v záložce Domácnost.",
        },
        list: {
          title: "Položky zásob",
          text: "Nahoře je, co brzy projde. Stejné potraviny jsou v jednom řádku a šipka je rozbalí. Klepnutím otevřeš podrobnosti: snězeno, vyhozeno, rezervace na vaření, úprava, historie a výživa.",
        },
        swipe: {
          title: "Rychlé odepsání",
          text: "Potáhni řádek doprava, když potravinu sníš, nebo doleva, když ji vyhazuješ. Pět vteřin to jde vrátit tlačítkem Zpět.",
        },
        add: {
          title: "Přidat potravinu",
          text: "Otevře přidání potraviny. Najdeš v něm i skenování čárového kódu a databázi potravin.",
        },
      },
      receipts: {
        switch: {
          title: "Účtenky a útraty",
          text: "Přepínáš mezi seznamem účtenek a přehledem útrat po měsících, obchodech a druzích potravin.",
        },
        scan: {
          title: "Načíst účtenku",
          text: "Vyfoť účtenku, nebo nahraj fotku či PDF. Účtenku můžeš poslat i z aplikace obchodu přes Sdílet a iShelf.",
        },
        review: {
          title: "Kontrola před uložením",
          text: "Po přečtení položky zkontroluješ. Oranžová množství jsou jen odhad, dole vidíš, jestli sedí součet. Uložené potraviny se přidají do zásob.",
        },
        list: {
          title: "Uložené účtenky",
          text: "Klepnutím otevřeš detail účtenky s položkami a cenami.",
        },
      },
      recipes: {
        search: { title: "Hledání receptů", text: "Hledej podle názvu receptu." },
        history: {
          title: "Historie vaření",
          text: "Co se v domácnosti vařilo, kdo vařil a kolik porcí.",
        },
        filters: {
          title: "Rychlé filtry",
          text: "Oblíbené, co uvaříš hned, co využije brzy prošlé potraviny, rychlá a vegetariánská jídla nebo tvoje vlastní recepty.",
        },
        moreFilters: {
          title: "Další filtry",
          text: "Kolik surovin smí chybět, druh jídla, recepty s vybranými surovinami a řazení.",
        },
        card: {
          title: "Recept",
          text: "Štítek ukazuje, jestli máš vše, nebo kolik surovin chybí. Hvězdička přidá recept mezi oblíbené, ty jsou vždy nahoře.",
        },
        add: {
          title: "Nový recept",
          text: "Napiš vlastní recept, nebo vyfoť stránku z kuchařky a aplikace ho přečte.",
        },
      },
      recipeDetail: {
        missing: {
          title: "Co ti chybí",
          text: "Nejdůležitější část receptu. Chybějící suroviny přidáš jedním klepnutím na nákupní seznam.",
        },
        servings: {
          title: "Porce",
          text: "Změň počet porcí a množství surovin se přepočítají.",
        },
        cookingMode: {
          title: "Vařím",
          text: "Zapni, když vaříš, a obrazovka telefonu nezhasne.",
        },
        history: { title: "Historie vaření", text: "Kdy a kdo tento recept vařil." },
        actions: {
          title: "Rezervovat a Uvařeno",
          text: "Rezervovat zamluví suroviny, aby je mezitím nikdo nesnědl. Uvařeno odečte suroviny ze zásob.",
        },
        menu: { title: "Další akce", text: "Úprava a smazání receptu." },
      },
      household: {
        invite: {
          title: "Pozvat členy",
          text: "Pošli odkaz, nebo sdílej kód. Žádost o připojení kódem schvaluje vlastník domácnosti.",
        },
        members: { title: "Členové", text: "Kdo v domácnosti je a kdo ji vlastní." },
        locations: {
          title: "Místa uložení",
          text: "Lednice, mrazák, spíž a další. Hodiny u místa ukážou historii, co se tam přidalo a ubralo.",
        },
        export: {
          title: "Export dat",
          text: "Stáhni si zásoby nebo položky z účtenek jako tabulku pro Excel nebo Tabulky Google.",
        },
      },
      shoppingList: {
        tabs: {
          title: "Společný a můj seznam",
          text: "Společný seznam vidí celá domácnost, Můj seznam jen ty.",
        },
        add: {
          title: "Přidat na seznam",
          text: "Vyber potravinu, nebo napiš cokoli jiného, třeba „pečivo na víkend“.",
        },
        items: {
          title: "Položky",
          text: "Zaškrtnutím dáš věc do košíku. Klepnutím změníš množství, poznámku nebo ji přesuneš na druhý seznam.",
        },
        checked: {
          title: "V košíku",
          text: "Po nákupu přidej koupené potraviny do zásob jedním tlačítkem.",
        },
      },
    },
  },
  help: {
    title: "Nápověda a průvodce",
    back: "Zpět",
    toursTitle: "Prohlídky obrazovek",
    toursIntro: "Krátké prohlídky ukážou, k čemu jsou tlačítka na jednotlivých obrazovkách.",
    start: "Spustit",
    seen: "prošlá",
    recipeDetailHint: "Otevři libovolný recept a klepni na otazník nahoře.",
    signInToStart: "Prohlídky spustíš v aplikaci po přihlášení.",
    openApplication: "Přihlásit se",
    howToTitle: "Jak na to",
    howTo: [
      {
        question: "Jak pozvat ostatní do domácnosti?",
        answer:
          "V záložce Domácnost klepni na Pozvat odkazem a pošli odkaz, třeba přes WhatsApp. Kdo ho otevře a přihlásí se, je hned v domácnosti. Odkaz platí 7 dní pro jednoho člověka. Druhá možnost je kód domácnosti: kdo ho zadá, pošle žádost a vlastník ji schválí.",
      },
      {
        question: "Jak načíst účtenku?",
        answer:
          "V záložce Účtenky klepni na Vyfotit účtenku, nebo nahraj fotku či PDF. Po přečtení zkontroluj položky, množství a místo uložení a klepni na Uložit. Potraviny se přidají do zásob.",
      },
      {
        question: "Jak poslat účtenku z aplikace obchodu?",
        answer:
          "V aplikaci obchodu otevři účtenku, klepni na Sdílet a vyber iShelf. Funguje to v nainstalované aplikaci na Androidu a ve Windows, na iPhonu zatím ne. Tam účtenku ulož jako obrázek nebo PDF a nahraj ji v záložce Účtenky.",
      },
      {
        question: "Co znamená oranžové „ODHAD“ u účtenky?",
        answer:
          "Množství nebylo na účtence vytištěné, takže je jen odhadnuté. Zkontroluj ho podle obalu a oprav, nebo potvrď tlačítkem Sedí.",
      },
      {
        question: "Jak zapsat snědené nebo vyhozené jídlo?",
        answer:
          "V Zásobách potáhni řádek doprava (snězeno) nebo doleva (vyhozeno). Když jde jen o část, klepni na položku a zadej, kolik se snědlo nebo vyhodilo.",
      },
      {
        question: "K čemu je rezervace?",
        answer:
          "Když chceš něco uvařit později, zamluv si suroviny. Ostatní členové pak uvidí, že jsou rezervované, a snědí jen zbytek.",
      },
      {
        question: "Jak nainstalovat aplikaci do telefonu?",
        answer:
          "Na Androidu otevři ishelf.cz v Chromu a v menu ⋮ zvol Přidat na plochu nebo Nainstalovat aplikaci. Na iPhonu otevři ishelf.cz v Safari, klepni na Sdílet a zvol Přidat na plochu.",
      },
      {
        question: "Jak zapnout upozornění?",
        answer:
          "V Profilu v části Upozornění zapni upozornění na tomto zařízení a vyber hodinu a kolik dní dopředu chceš upozornit. Když prohlížeč upozornění blokuje, aplikace ti ukáže, kde je povolit.",
      },
      {
        question: "Proč je domácnost uzamčená?",
        answer:
          "Domácnost má víc členů nebo je navíc, než dovoluje tarif vlastníka, typicky po skončení Premium. Prohlížet a exportovat jde dál. Odemkne se, když vlastník obnoví Premium nebo odebere členy.",
      },
    ],
    resetTitle: "Tipy a prohlídky",
    resetText: "Vrátí nabídku prohlídek a jednorázové tipy, které jsi už zavřel.",
    reset: "Obnovit všechny tipy",
    resetDone: "Tipy jsou zpět.",
  },
  landing: {
    pageTitle: "iShelf a recepty – společné zásoby, účtenky a recepty pro domácnost",
    headline: "Víš, co máš doma. A\u00a0co z\u00a0toho uvaříš.",
    subtitle:
      "Společné zásoby pro celou domácnost. Účtenku vyfotíš a potraviny se přidají samy, aplikace pohlídá trvanlivost a ukáže recepty z toho, co máš.",
    tryWithoutAccount: "Vyzkoušet bez účtu",
    register: "Vytvořit účet",
    logIn: "Přihlásit se",
    heroNote: "Funguje v prohlížeči i jako aplikace v telefonu. Bez instalace z obchodu.",
    featuresTitle: "Co aplikace umí",
    features: [
      {
        icon: "🧺",
        title: "Společné zásoby",
        text: "Všichni v domácnosti vidí, co je doma, kde to leží a kdy to projde. Snědené a vyhozené odečteš jedním tahem prstu.",
      },
      {
        icon: "🧾",
        title: "Účtenka místo přepisování",
        text: "Vyfoť účtenku nebo ji pošli z aplikace obchodu. Položky se přečtou samy, ty je jen zkontroluješ.",
      },
      {
        icon: "⏰",
        title: "Hlídání trvanlivosti",
        text: "Ve zvolenou hodinu ti přijde upozornění, co je potřeba brzy sníst. Méně jídla skončí v koši.",
      },
      {
        icon: "🍲",
        title: "Recepty podle zásob",
        text: "U každého receptu hned vidíš, co máš a co chybí. Po uvaření se suroviny ze zásob odečtou samy.",
      },
      {
        icon: "🛒",
        title: "Nákupní seznam",
        text: "Společný pro celou domácnost i jen tvůj. Chybějící suroviny z receptu přidáš jedním klepnutím.",
      },
      {
        icon: "🙋",
        title: "Rezervace na vaření",
        text: "Zamluv si suroviny na večeři, aby je mezitím nikdo nesnědl.",
      },
      {
        icon: "📊",
        title: "Přehled útrat",
        text: "Kolik za jídlo utrácíte každý měsíc, v jakých obchodech a za jaké druhy potravin.",
      },
      {
        icon: "🔎",
        title: "Čárové kódy a výživa",
        text: "Naskenuj kód na obalu a aplikace potravinu najde v databázi i s kaloriemi a nutričními hodnotami.",
      },
    ],
    stepsTitle: "Jak to funguje",
    steps: [
      { title: "Založ domácnost", text: "A pozvi ostatní odkazem nebo kódem. Každý má svůj účet." },
      { title: "Naskladni", text: "Účtenkou, čárovým kódem nebo ručně. Napoprvé to zabere pár minut." },
      { title: "Jez, vař a nakupuj", text: "Zásoby se samy odečítají a ty víš, co dojít koupit." },
    ],
    screenshotsTitle: "Jak aplikace vypadá",
    screenshots: [
      { file: "overview", caption: "Přehled dne: co brzy projde a co můžeš uvařit" },
      { file: "stock", caption: "Zásoby rozdělené podle toho, co je potřeba sníst" },
      { file: "receipt", caption: "Kontrola načtené účtenky před uložením" },
      { file: "recipe", caption: "Recept s tím, co máš doma a co chybí" },
    ],
    screenshotAlt: (caption: string) => `Snímek obrazovky: ${caption}`,
    questionsTitle: "Časté otázky",
    moreHelp: "Další návody k používání aplikace",
    questions: [
      {
        question: "Je aplikace zdarma?",
        answer:
          "Ano, aplikaci můžeš používat zdarma. Vyzkoušet ji jde i bez účtu, účet si vytvoříš později a o data nepřijdeš.",
      },
      {
        question: "Jak ji dostanu do telefonu?",
        answer:
          "Otevři ishelf.cz v telefonu. Na Androidu v Chromu klepni v menu ⋮ na Přidat na plochu nebo Nainstalovat aplikaci. Na iPhonu v Safari klepni na Sdílet a pak na Přidat na plochu. Aplikace se pak otevírá z plochy jako každá jiná.",
      },
      {
        question: "Musí mít účet všichni v domácnosti?",
        answer:
          "Každý člen má svůj účet, aby bylo vidět, kdo co snědl nebo si rezervoval. Do domácnosti se připojí přes odkaz nebo kód od vlastníka.",
      },
      {
        question: "Ukládáte fotky mých účtenek?",
        answer:
          "Ne. Fotka se pošle ke čtení službě Google Gemini a uloží se jen přečtené položky. Než pošleš první účtenku, aplikace se tě zeptá na souhlas.",
      },
      {
        question: "Kde jsou moje data?",
        answer:
          "Na serveru v datovém centru v České republice. Nikomu je neprodáváme. Podrobnosti najdeš v zásadách ochrany osobních údajů.",
      },
      {
        question: "Můžu účet smazat?",
        answer:
          "Ano, kdykoli sám v Profilu v části Účet. Zásoby a účtenky si předtím můžeš stáhnout jako tabulku.",
      },
    ],
    closingTitle: "Zkus to s tím, co máš doma",
    closingText: "Bez e-mailu a hesla, stačí jedno klepnutí.",
    footerContact: "Kontakt",
    footerPrivacy: "Ochrana osobních údajů",
    footerOpenFoodFacts: "Data o potravinách: Open Food Facts (ODbL)",
  },
  guest: {
    tryWithoutAccount: "Vyzkoušet bez účtu",
    tryHint: "Bez e-mailu a hesla. Účet si můžeš vytvořit později a o nic nepřijdeš.",
    householdName: "Moje domácnost",
    planName: "Bez účtu",
    bannerTitle: "Používáš aplikaci bez účtu",
    bannerText:
      "Když smažeš data prohlížeče nebo ztratíš telefon, přijdeš o zásoby. Po 60 dnech bez použití se data smažou.",
    createAccount: "Vytvořit účet",
    upgradeTitle: "Vytvoř si účet",
    upgradeText: "Všechno, co už v aplikaci máš, zůstane zachované.",
    upgraded: "Účet je vytvořený. Příště se přihlásíš e-mailem a heslem.",
    emailTaken: "Tento e-mail už je registrovaný. Použij jiný.",
    cannotJoin: "Bez účtu se nejde připojit k jiné domácnosti. Nejdřív si vytvoř účet.",
    householdsNeedAccount: "Další domácnosti a sdílení domácnosti jsou dostupné s účtem.",
    sharingNeedsAccount: "Pozvat další členy můžeš, až si vytvoříš účet.",
    photosNeedAccount: "Fotky potravin jsou dostupné s účtem.",
    recipeScanNeedsAccount: "Recept z fotky je dostupný s účtem. S účtem máš 3 skeny receptů zdarma.",
    receiptTrialUsed: "Zkušební sken účtenky je využitý. S účtem máš 10 skenů měsíčně.",
    tooManyGuests:
      "Z tohoto připojení dnes vzniklo příliš mnoho zkušebních účtů. Zkus to zítra, nebo si vytvoř účet.",
    logOutWarning:
      "Bez účtu se po odhlášení už ke svým datům nedostaneš. Nejdřív si vytvoř účet, pokud chceš data zachovat.",
    deleteData: "Smazat data",
    deleteDataText: "Smaže zásoby, recepty i účtenky z tohoto zkušebního účtu. Nejde to vrátit.",
    deleteDataConfirm: "Smazat všechno",
  },
  ads: {
    label: "Reklama",
    placeholderTitle: "Místo pro reklamu",
    placeholderText: "Tady se bude zobrazovat reklama. S Premium reklamy nejsou.",
    removeAds: "Bez reklam",
    rewardedOffer: "Podívej se na krátkou reklamu a získej 1 sken navíc.",
    rewardedButton: "Sken navíc za reklamu",
    rewardedLeft: (count: number) => `Dnes ještě ${count}×`,
    rewardedTitle: "Reklama",
    rewardedPlaying: "Tady poběží krátká reklama. Zatím jde jen o ukázku místa.",
    rewardedSeconds: (seconds: number) => `Odměna za ${seconds} s`,
    rewardedClaim: "Získat sken",
    rewardedDone: "Máš 1 sken navíc.",
    rewardedFailed: "Odměnu se nepodařilo připsat. Dnešní reklamy za odměnu jsou možná vyčerpané.",
  },
  premium: {
    title: "Premium",
    free: "Zdarma",
    premium: "Premium",
    active: "Aktivní",
    freeDescription: "Základní verze aplikace.",
    activeUntil: (date: string) => `Aktivní do ${date}.`,
    receiptScans: "Skenování účtenek",
    recipeScans: "Recepty z fotky",
    usage: (used: number, limit: number, period: "month" | "total") =>
      `${used} z ${limit}${period === "month" ? " tento měsíc" : " celkem"}`,
    comparisonTitle: "Co získáš s Premium",
    comparison: [
      ["Skeny účtenek", "10 měsíčně", "60 měsíčně"],
      ["Recepty z fotky", "3 celkem", "20 měsíčně"],
      ["Členové domácnosti", "až 6", "až 12"],
      ["Domácnosti", "1", "až 3"],
      ["Úložiště v domácnosti", "3", "až 9"],
      ["Historie útrat", "6 měsíců", "celá"],
      ["Nezdravé útraty", "ne", "ano"],
      ["Reklamy", "ano", "bez reklam"],
    ] as [string, string, string][],
    price: "59 Kč měsíčně nebo 590 Kč ročně",
    paymentsLater:
      "Premium platí pro tvůj účet. Ostatní členové tvé domácnosti mají víc místa, i když premium nemají. Placení zatím není spuštěné.",
    testDescription: "Testovací verze: premium si můžeš zdarma zapnout na 30 dní a kdykoli ho zase vypnout.",
    activateTest: "Vyzkoušet premium na 30 dní",
    cancelTest: "Ukončit testovací premium",
    lockedHint: "V Premium",
    guestNeedsAccount:
      "Premium si můžeš zapnout, až si vytvoříš účet. Všechno, co už máš, zůstane zachované.",
    olderSpendingInPremium: "Starší útraty a pohled na celý rok jsou v Premium.",
    receiptScansLeft: (left: number) =>
      left === 1
        ? "Tento měsíc ti zbývá 1 sken."
        : left < 5
          ? `Tento měsíc ti zbývají ${left} skeny.`
          : `Tento měsíc ti zbývá ${left} skenů.`,
    receiptLimitReached:
      "Skeny účtenek na tento měsíc jsou vyčerpané. Další přibudou 1. dne příštího měsíce, víc jich má Premium.",
    householdFull: (limit: number) =>
      `Domácnost je plná (nejvýš ${limit} členů). Víc členů umožní Premium vlastníka domácnosti.`,
    householdFullForApplicant: "Domácnost je plná. Požádej vlastníka, ať si zapne Premium nebo uvolní místo.",
    showPremium: "Premium",
  },
  profile: {
    title: "Profil",
    account: "Účet",
    accountDescription: "Jméno, e-mail, smazání účtu",
    premium: "Premium",
    premiumDescription: (isPremium: boolean) => (isPremium ? "Aktivní" : "Zdarma, porovnání a limity"),
    appearance: "Vzhled a ovládání",
    appearanceDescription: "Motiv, vibrace",
    vibrations: "Vibrace",
    vibrationsDescription:
      "Krátké zavibrování při potažení řádku v zásobách, odškrtnutí na nákupním seznamu, naskenování kódu a uvaření. Platí pro toto zařízení.",
    vibrationsUnsupported:
      "Tento prohlížeč vibrace nepodporuje (například iPhone). Volba platí pro toto zařízení.",
    notifications: "Upozornění",
    notificationsDescription: "Blížící se trvanlivost",
    privacy: "Soukromí a data",
    privacyDescription: "Zásady, souhlas se skenováním účtenek",
    about: "O aplikaci",
    aboutDescription: "Verze, kontakt",
    theme: "Motiv",
    themeLight: "Světlý",
    themeDark: "Tmavý",
    themeSystem: "Podle systému",
    themeStoredOnDevice: "Volba platí pro toto zařízení.",
    receiptConsent: "Souhlas se skenováním účtenek",
    consentGivenAt: (date: string) => `Udělen ${date}.`,
    consentNotGiven: "Zatím neudělen. Aplikace se zeptá před prvním skenem.",
    version: (version: string) => `Verze ${version}`,
    aboutText:
      "Sdílená evidence potravin pro domácnost: zásoby, účtenky, rezervace a recepty na jednom místě.",
    help: "Nápověda a průvodce",
    helpDescription: "Prohlídky obrazovek a návody",
    contact: "Kontakt:",
    writeEmail: "Napsat e-mail",
    copyEmail: "Zkopírovat adresu",
    emailCopied: "Adresa je zkopírovaná.",
    contactEmail: "liskaondra2@gmail.com",
    openFoodFactsCredit: "Databáze potravin obsahuje data z projektu",
    openFoodFactsLicence: "licence Open Database License, ODbL",
  },
  overview: {
    greeting: (partOfDay: "morning" | "day" | "evening", name: string) =>
      `${partOfDay === "morning" ? "Dobré ráno" : partOfDay === "evening" ? "Dobrý večer" : "Ahoj"}${name ? `, ${name}` : ""}`,
    scanReceipt: "Vyfotit účtenku",
    addFood: "Přidat potravinu",
    expiringTitle: "Brzy projde",
    expiringNothing: "Nic nespěchá, žádná potravina v nejbližších dnech neprojde.",
    reservationsTitle: "Moje rezervace",
    cookNowTitle: "Můžeš uvařit hned",
    cookNowNothing: "Na žádný recept zatím nemáš všechny suroviny.",
    showAll: "Vše",
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
      "Účet se smaže za 14 dní a hned se odhlásíš na všech zařízeních. Do té doby ho můžeš obnovit tím, že se znovu přihlásíš. Po smazání zmizí tvůj účet a rezervace, zásoby a účtenky zůstanou domácnosti bez tvého jména. Pokud jsi poslední člen, smaže se i celá domácnost.",
    restoreTitle: "Účet je naplánovaný ke smazání",
    restoreText: (date: string) => `Účet se trvale smaže ${date}. Chceš ho obnovit a dál aplikaci používat?`,
    restore: "Obnovit účet",
    confirmationWord: "SMAZAT",
    typeConfirmation: "Pro potvrzení napiš SMAZAT",
    password: "Heslo",
    incorrectPassword: "Nesprávné heslo.",
  },
  registrationConsent: "Registrací souhlasíš se",
  registrationConsentLink: "zásadami ochrany soukromí",
  privacyPolicy: {
    title: "Zásady ochrany soukromí",
    effectiveFrom: "Účinné od 17. 11. 2026",
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
          "Domácnost: název domácnosti, její členy, místa uložení, potraviny, zásoby, jejich úbytky a rezervace, recepty, historii vaření a společný nákupní seznam. Osobní nákupní seznam, oblíbené recepty a nastavení upozornění patří jen tobě.",
          "Účtenky: obchod, datum, celková částka a přečtené položky s cenami.",
          "Společný katalog množství: když u položky z účtenky potvrdíš množství, uložíme do katalogu sdíleného všemi uživateli jen název obchodu, text položky z účtenky a množství (například Albert, „JOG.BILY“, 150 g), bez vazby na tebe nebo tvou domácnost. Ostatním to pak předvyplní množství u stejného produktu.",
          "Tarif: jestli a do kdy máš Premium, počet skenů účtenek a receptů a počet reklam za odměnu. Potřebujeme to kvůli limitům tarifu.",
          "Zkušební použití bez účtu: ukládáme stejná data domácnosti, ale žádný e-mail ani jméno. Proti hromadnému zakládání zkušebních účtů ukládáme otisk (hash) IP adresy, ze kterého adresu nejde zpětně zjistit. Otisk se smaže, když si vytvoříš účet.",
          "Tyto údaje potřebujeme k tomu, aby aplikace fungovala (plnění smlouvy). Nepoužíváme je k reklamě a neprodáváme je.",
        ],
      },
      {
        heading: "Skenování účtenek a receptů",
        paragraphs: [
          "Když vyfotíš nebo nahraješ účtenku nebo recept (například stránku kuchařky), odešleme fotky nebo PDF ke zpracování službě Google Gemini, která z nich přečte položky nebo recept. Používáme placenou úroveň této služby, u které Google podle svých podmínek odeslaná data nepoužívá k trénování svých modelů.",
          "Fotku ani PDF nikde neukládáme, zpracují se jen v paměti a hned se zahodí. Uloží se pouze položky nebo recept, které na obrazovce kontroly potvrdíš. Recepty z fotek zůstávají jen ve tvé domácnosti a nikde se nesdílejí.",
          "Fotky potravin, které si sám přidáš místo ikony, se do Gemini neposílají. Na telefonu se zmenší na malý čtverec, uloží se na našem serveru u potraviny a vidí je jen členové tvé domácnosti. Fotku můžeš kdykoli odebrat, smaže se také se zrušením domácnosti.",
          "Skenování je možné jen s tvým souhlasem, který udělíš před první fotkou. Souhlas můžeš kdykoli odvolat v Profilu v části Soukromí a data. Už uložené položky tím zůstanou zachované.",
        ],
      },
      {
        heading: "E-maily",
        paragraphs: [
          "Na tvůj e-mail posíláme jen zprávy k účtu: odkaz na obnovu hesla, upozornění na změnu hesla a upozornění na žádost o smazání účtu. Žádné reklamní e-maily neposíláme.",
          "E-maily odesílá služba Brevo (Sendinblue SAS, Francie, EU), které kvůli tomu předáváme tvůj e-mail a text zprávy.",
        ],
      },
      {
        heading: "Kdo údaje vidí",
        paragraphs: [
          "Členové tvé domácnosti vidí sdílené zásoby, účtenky, rezervace a jména ostatních členů. E-maily ostatních členů nevidí nikdo z domácnosti. Když požádáš o připojení kódem, vlastník domácnosti uvidí tvé jméno a začátek e-mailu (například an•••@gmail.com), aby poznal, koho schvaluje.",
          "Údaje jsou uložené na serverech v Evropské unii. Kromě služby Google Gemini pro čtení účtenek a služby Brevo pro odesílání e-mailů je nepředáváme nikomu dalšímu.",
        ],
      },
      {
        heading: "Jak dlouho údaje uchováváme",
        paragraphs: [
          "Údaje uchováváme, dokud máš účet. Přihlášení na zařízení vyprší nejpozději po 60 dnech, kdy aplikaci nepoužíváš.",
          "Zkušební účet bez e-mailu, který 60 dní nepoužiješ, se automaticky smaže i se svou domácností a všemi daty. Smazat ho můžeš i sám v Profilu v části Účet, a to hned, bez čekací doby.",
          "Když účet smažeš, hned se odhlásíš na všech zařízeních a účet se trvale smaže po 14 dnech. Během této doby ho můžeš obnovit tím, že se znovu přihlásíš. Po smazání zmizí tvůj účet, rezervace a přihlášení. Zásoby, úbytky a účtenky zůstanou domácnosti, ale už bez vazby na tebe. Pokud jsi poslední člen domácnosti, smaže se celá domácnost se všemi daty.",
        ],
      },
      {
        heading: "Tvoje práva",
        paragraphs: [
          "Máš právo na přístup ke svým údajům, jejich opravu a výmaz, na omezení zpracování, na přenositelnost a na odvolání souhlasu. Účet můžeš kdykoli smazat sám v Profilu v části Účet. Zásoby a položky z účtenek si můžeš stáhnout jako tabulku CSV v záložce Domácnost. Ostatní žádosti pošli na uvedený e-mail.",
          "Pokud si myslíš, že s údaji nakládáme v rozporu se zákonem, můžeš podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.gov.cz).",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "Používáme jedinou cookie, která je nutná pro přihlášení. Nepoužíváme reklamní ani analytické cookies.",
          "Ve verzi zdarma jsou v aplikaci zatím jen vyhrazená místa pro reklamu. Žádná reklamní síť není zapojená a žádné údaje reklamním firmám nepředáváme. Než skutečné reklamy zapneme, tyto zásady upravíme a požádáme tě o souhlas.",
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
