import db from "./client";
import { users, modules, usermodulepermissions } from "./schema";
import { eq, and } from "drizzle-orm";
import { ResumeService } from "../modules/resume";
import { DEFAULT_MODULES } from "./user-manager";

const username = process.argv[2] ?? "admin";
const user = db.select().from(users).where(eq(users.username, username)).get();
if (!user) {
  console.error(`User "${username}" not found`);
  process.exit(1);
}

const def = DEFAULT_MODULES.find((m) => m.name === "resume")!;
let mod = db.select().from(modules).where(eq(modules.moduleName, "resume")).get();
if (!mod) {
  mod = db.insert(modules).values({ moduleName: def.name, moduleAlias: def.alias, description: def.description }).returning().get();
}
const hasPerm = db
  .select()
  .from(usermodulepermissions)
  .where(and(eq(usermodulepermissions.userId, user.userId), eq(usermodulepermissions.moduleId, mod.moduleId)))
  .get();
if (!hasPerm) {
  db.insert(usermodulepermissions).values({ userId: user.userId, moduleId: mod.moduleId }).run();
}

const svc = new ResumeService();
const hasData =
  svc.getProfile(user.userId).fullName !== "" ||
  svc.listExperiences(user.userId).length > 0 ||
  svc.listEducations(user.userId).length > 0 ||
  svc.listResumes(user.userId).length > 0;
if (hasData) {
  console.log(`User "${username}" already has resume data, nothing seeded.`);
  process.exit(0);
}

svc.upsertProfile(user.userId, {
  fullName: "Jan Voorbeeld",
  headline: "Student softwareontwikkeling | Fotograaf",
  photoShape: "circle",
  residence: "Voorbeeldstad",
  phone: "+31 6 12345678",
  email: "jan@example.com",
  birthDate: "1 januari 2000",
  drivingLicense: "B",
  links: [
    { label: "voorbeeld.example", url: "https://voorbeeld.example" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/voorbeeld" },
    { label: "GitHub", url: "https://github.com/voorbeeld" },
  ],
  sections: [
    { id: crypto.randomUUID(), title: "Vaardigheden", items: ["Windows, Linux", "C# .NET, Java, Python", "HTML, PHP, CSS, JavaScript", "Photoshop, Lightroom"] },
    { id: crypto.randomUUID(), title: "Talen", items: ["Nederlands moedertaal", "Engels B1"] },
    { id: crypto.randomUUID(), title: "Hobby's", items: ["Fotografie", "Programmeren", "Volleybal"] },
  ],
});

const experiences = [
  { company: "Voorbeeld Studentenhuis", place: "Voorbeeldstad", jobTitle: "Junior IT Consultant / ICT-begeleider", startMonth: 2, startYear: 2026, isCurrent: true,
    description: "Binnen mijn rol heb ik een uitstekende klanttevredenheid behaald onder de doelgroep 50+ door gerichte technische ondersteuning te bieden bij dagelijkse ICT-knelpunten. Hierbij combineerde ik directe probleemoplossing met geduld, helder advies en maatwerk." },
  { company: "Voorbeeld Software BV", place: "Voorbeeldstad", jobTitle: "Stagiair, softwareontwikkeling", startMonth: 9, startYear: 2025, endMonth: 1, endYear: 2026, description: "" },
  { company: "Voorbeeld Webshop", place: "Voorbeelddorp", jobTitle: "Stagiair, helpdeskmedewerker", startMonth: 9, startYear: 2022, endMonth: 6, endYear: 2023,
    description: "Zelfstandig het WordPress-platform van de webshop beheerd en doorontwikkeld, gecombineerd met het dagelijks bieden van telefonische support en oplossingen als servicedeskmedewerker." },
  { company: "Voorbeeld Supermarkt", place: "Voorbeelddorp", jobTitle: "Vulploegmedewerker / verfmenger", startMonth: 4, startYear: 2020, endMonth: 6, endYear: 2023, description: "" },
  { company: "Voorbeeld Fotoatelier", place: "Voorbeeldstad", jobTitle: "Stagiair fotografie, Webshop ontwikkelaar (snuffelstage)", startMonth: 2, startYear: 2019, endMonth: 2, endYear: 2019, description: "" },
];
const expIds = experiences.map((e) => svc.createExperience(user.userId, e).id);

const educations = [
  { institution: "Voorbeeld Hogeschool", place: "Voorbeeldstad", degree: "HBO Software ontwikkeling", startMonth: 9, startYear: 2023, isCurrent: true,
    description: "Momenteel volg ik de opleiding Softwareontwikkeling. Hier ontwikkel ik zowel technische vaardigheden, zoals programmeertalen, als beroepsgerichte competenties, waaronder projectmatig werken." },
  { institution: "Voorbeeld MBO", place: "Voorbeeldstad", degree: "MBO ICT-beheer", startMonth: 9, startYear: 2020, endMonth: 7, endYear: 2023,
    description: "Tijdens deze driejarige opleiding heb ik diverse vaardigheden opgedaan, waaronder netwerkbeheer, systeembeheer voor Windows en Linux, en helpdeskmanagement." },
];
const eduIds = educations.map((e) => svc.createEducation(user.userId, e).id);

const resume = svc.createResume(user.userId, { name: "Voorbeeld CV (IT)" });
svc.setResumeItems(resume.id, user.userId, [
  ...svc.listExperiences(user.userId).filter((e) => expIds.includes(e.id)).map((e) => ({ kind: "experience" as const, refId: e.id })),
  ...svc.listEducations(user.userId).filter((e) => eduIds.includes(e.id)).map((e) => ({ kind: "education" as const, refId: e.id })),
]);

console.log(`Seeded placeholder resume data for "${username}".`);
