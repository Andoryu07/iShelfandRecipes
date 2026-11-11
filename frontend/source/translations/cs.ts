import type { HouseholdRole, StorageLocation, StorageLocationKind } from "../api/types";

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
