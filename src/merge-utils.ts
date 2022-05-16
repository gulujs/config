import { ArrayMergeFunc, DeepMergeProgram } from '@lunjs/deep-merge';
import * as TOML from '@lunjs/toml';

type Dict<K extends keyof any = string | symbol, V = unknown> = Record<K, V>;

export enum ArrayMergeLogic {
  Override,
  MergeInOrder,
  Append
}

export function objectMerge(
  target: object,
  source: object,
  path: Array<string | number | symbol>,
  mergeProgram: DeepMergeProgram
): object {
  const dest = mergeProgram.cloneUnlessOtherwiseSpecified(target) as Dict;

  const comment = TOML.getTableComment(source);
  if (comment) {
    const matches = comment.matchAll(/@merge-ignore-target-key[ \t]+(.*)/g);
    for (const m of matches) {
      m[1]!.trim().split(',').forEach((s) => {
        const key = s.trim();
        if (key) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete dest[key];
        }
      });
    }
  }

  const sourceKeys = mergeProgram.getKeys(source);
  for (const key of sourceKeys) {
    if (mergeProgram.propertyIsUnsafe(target, key)) {
      continue;
    }

    if (
      mergeProgram.propertyIsOnObject(target, key)
      && mergeProgram.isMergeableObject((source as Dict)[key])
    ) {
      dest[key] = mergeProgram.mergeUnlessCustomSpecified(
        (target as Dict)[key],
        (source as Dict)[key],
        [...path, key]
      );
    } else {
      dest[key] = mergeProgram.cloneUnlessOtherwiseSpecified((source as Dict)[key]);
    }
  }

  return dest;
}

export function makeArrayMerge(mergeLogic?: ArrayMergeLogic): ArrayMergeFunc {
  if (mergeLogic === ArrayMergeLogic.MergeInOrder) {
    return (target, source, path, mergeProgram) => {
      const len = Math.min(target.length, source.length);
      const dest: unknown[] = Array(len);

      for (let i = 0; i < len; i++) {
        dest[i] = mergeProgram.mergeUnlessCustomSpecified(target[i], source[i], [...path, i]);
      }
      for (let i = len; i < target.length; i++) {
        dest[i] = mergeProgram.cloneUnlessOtherwiseSpecified(target[i]);
      }
      for (let i = len; i < source.length; i++) {
        dest[i] = mergeProgram.cloneUnlessOtherwiseSpecified(source[i]);
      }

      return dest;
    };
  }

  if (mergeLogic === ArrayMergeLogic.Append) {
    return (target, source, _path, mergeProgram) => {
      const dest = mergeProgram.cloneUnlessOtherwiseSpecified(target);

      for (let i = 0; i < source.length; i++) {
        dest.push(mergeProgram.cloneUnlessOtherwiseSpecified(source[i]));
      }

      return dest;
    };
  }

  // Default is `ArrayMergeLogic.Override`
  return (_target, source, _path, mergeProgram) => mergeProgram.cloneUnlessOtherwiseSpecified(source);
}
