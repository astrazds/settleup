import { AppError } from "./errors.js";
import type { EventVersionPrecondition } from "./event-service.js";

export function readVersionPrecondition(
  value: string | undefined,
): EventVersionPrecondition | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value.trim() === "*") {
    return { kind: "any-current" };
  }

  const versions: number[] = [];
  let index = 0;
  let sawTag = false;

  while (index < value.length) {
    while (
      index < value.length &&
      (value[index] === " " ||
        value[index] === "\t" ||
        value[index] === ",")
    ) {
      index += 1;
    }

    if (index >= value.length) {
      break;
    }

    const weak = value.startsWith("W/", index);
    if (weak) {
      index += 2;
    }

    if (value[index] !== '"') {
      throw invalidIfMatch();
    }
    index += 1;

    let opaqueTag = "";
    while (index < value.length && value[index] !== '"') {
      const codePoint = value.charCodeAt(index);
      const isEntityTagCharacter =
        codePoint === 0x21 ||
        (codePoint >= 0x23 && codePoint <= 0x7e) ||
        (codePoint >= 0x80 && codePoint <= 0xff);
      if (!isEntityTagCharacter) {
        throw invalidIfMatch();
      }
      opaqueTag += value[index];
      index += 1;
    }

    if (value[index] !== '"') {
      throw invalidIfMatch();
    }
    index += 1;
    sawTag = true;

    while (
      index < value.length &&
      (value[index] === " " || value[index] === "\t")
    ) {
      index += 1;
    }
    if (index < value.length && value[index] !== ",") {
      throw invalidIfMatch();
    }

    if (!weak) {
      const versionMatch = /^v([1-9]\d*)$/.exec(opaqueTag);
      const version = versionMatch?.[1]
        ? Number(versionMatch[1])
        : Number.NaN;
      if (Number.isSafeInteger(version) && version > 0) {
        versions.push(version);
      }
    }
  }

  if (!sawTag) {
    throw invalidIfMatch();
  }

  return { kind: "strong-tags", versions };
}

function invalidIfMatch(): AppError {
  return new AppError(
    'If-Match must contain valid entity tags such as "v3", or *.',
    400,
  );
}
