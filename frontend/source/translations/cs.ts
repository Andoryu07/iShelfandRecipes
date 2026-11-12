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
    comingSoon: "Tuto část teprve připravujeme.",
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
