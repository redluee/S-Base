import { AppError } from "../../utils/errors";

export function notImplemented(): never {
  throw new AppError(501, "todo.notImplemented");
}
