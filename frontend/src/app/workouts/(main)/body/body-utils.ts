export interface Photo {
  photoId: number;
  measurementId: number;
  filePath: string;
  createdAt: string;
}

export interface Measurement {
  measurementId: number;
  userId: number;
  date: string;
  height: number | null;
  weight: number | null;
  bodyFat: number | null;
  skeletalMuscle: number | null;
  fatMass: number | null;
  waist?: number | null;
  chest?: number | null;
  hips?: number | null;
  biceps?: number | null;
  thighs?: number | null;
  shoulders?: number | null;
  neck?: number | null;
  calves?: number | null;
  createdAt: string;
  photos: Photo[];
}

export type ChartTab = "weight" | "fat" | "muscle" | "bmi";

export type CircumferenceKey = "waist" | "chest" | "hips" | "biceps" | "thighs" | "shoulders" | "neck" | "calves";

export const CIRCUMFERENCE_KEYS: CircumferenceKey[] = ["waist", "chest", "hips", "biceps", "thighs", "shoulders", "neck", "calves"];

export interface FormValues {
  height: string;
  weight: string;
  bodyFat: string;
  skeletalMuscle: string;
  fatMass: string;
  waist: string;
  chest: string;
  hips: string;
  biceps: string;
  thighs: string;
  shoulders: string;
  neck: string;
  calves: string;
}

export const EMPTY_FORM: FormValues = {
  height: "",
  weight: "",
  bodyFat: "",
  skeletalMuscle: "",
  fatMass: "",
  waist: "",
  chest: "",
  hips: "",
  biceps: "",
  thighs: "",
  shoulders: "",
  neck: "",
  calves: "",
};

export function parseNumberInput(v: string): number | null {
  if (!v) return null;
  const num = parseFloat(v.replace(",", "."));
  return isNaN(num) ? null : num;
}

export function formFromLog(log: Measurement): FormValues {
  return {
    height: log.height?.toString() ?? "",
    weight: log.weight?.toString() ?? "",
    bodyFat: log.bodyFat?.toString() ?? "",
    skeletalMuscle: log.skeletalMuscle?.toString() ?? "",
    fatMass: log.fatMass?.toString() ?? "",
    waist: log.waist?.toString() ?? "",
    chest: log.chest?.toString() ?? "",
    hips: log.hips?.toString() ?? "",
    biceps: log.biceps?.toString() ?? "",
    thighs: log.thighs?.toString() ?? "",
    shoulders: log.shoulders?.toString() ?? "",
    neck: log.neck?.toString() ?? "",
    calves: log.calves?.toString() ?? "",
  };
}

export function formToPayload(form: FormValues) {
  return {
    height: parseNumberInput(form.height),
    weight: parseNumberInput(form.weight),
    bodyFat: parseNumberInput(form.bodyFat),
    skeletalMuscle: parseNumberInput(form.skeletalMuscle),
    fatMass: parseNumberInput(form.fatMass),
    waist: parseNumberInput(form.waist),
    chest: parseNumberInput(form.chest),
    hips: parseNumberInput(form.hips),
    biceps: parseNumberInput(form.biceps),
    thighs: parseNumberInput(form.thighs),
    shoulders: parseNumberInput(form.shoulders),
    neck: parseNumberInput(form.neck),
    calves: parseNumberInput(form.calves),
  };
}

export function hasCircumferences(log: Measurement): boolean {
  return Boolean(
    log.waist || log.chest || log.hips || log.biceps ||
    log.thighs || log.shoulders || log.neck || log.calves
  );
}

export function getAutofilledHeight(date: string, currentLogs: Measurement[]): string {
  const sortedPast = [...currentLogs]
    .filter((l) => l.date <= date && l.height !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return sortedPast.length > 0 && sortedPast[0].height ? sortedPast[0].height.toString() : "";
}

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateBMI(weight: number | null, height: number | null): number | null {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
}

export function preventInvalidInput(e: React.KeyboardEvent<HTMLInputElement>) {
  if (["e", "E", "+", "-"].includes(e.key)) {
    e.preventDefault();
  }
}
