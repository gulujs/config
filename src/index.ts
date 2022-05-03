/* eslint-disable node/no-process-env */
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { expandVar, ExpandVarOptions } from '@lunjs/expand-var';
import { ArrayMergeFunc, deepMerge, DeepMergeProgram } from '@lunjs/deep-merge';
import { ObjectPath } from '@lunjs/object-path';
import * as TOML from '@lunjs/toml';

export {
  ExpandVarOptions
};

export enum ArrayMergeLogic {
  Override,
  MergeInOrder,
  Append
}

export interface ConfigurationOptions {
  envFiles?: Array<string | URL>;
  tomlFiles?: Array<string | URL>;
  disableCache?: boolean;
  expandVarOptions?: ExpandVarOptions;
  /**
   * @default ArrayMergeLogic.Override
   */
  arrayMergeLogic?: ArrayMergeLogic;
}

const DEFAULT_EXPAND_VAR_OPTIONS: ExpandVarOptions = {
  get: path => process.env[path]
};

type Dict<K extends keyof any = string | symbol, V = unknown> = Record<K, V>;

function objectMerge(
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

function makeArrayMerge(mergeLogic?: ArrayMergeLogic): ArrayMergeFunc {
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

export class Configuration<T = Record<string, unknown>> {
  private config: Record<string, unknown> = {};
  private readonly configCache: Record<string, unknown> = {};
  private readonly mergeProgram: DeepMergeProgram;
  envFiles?: Array<string | URL>;
  tomlFiles?: Array<string | URL>;
  disableCache: boolean;
  expandVarOptions: ExpandVarOptions;

  constructor(options: ConfigurationOptions) {
    this.envFiles = options.envFiles;
    this.tomlFiles = options.tomlFiles;
    this.disableCache = options.disableCache === true;
    this.expandVarOptions = options.expandVarOptions || DEFAULT_EXPAND_VAR_OPTIONS;
    this.mergeProgram = new DeepMergeProgram({
      objectMerge,
      arrayMerge: makeArrayMerge(options.arrayMergeLogic)
    });
  }

  load(): void {
    this.loadEnvFile();
    this.loadTomlFile();
  }

  get<U = unknown>(path: string): U {
    if (this.disableCache) {
      return ObjectPath.get(this.config, path) as U;
    }

    if (!(path in this.configCache)) {
      this.configCache[path] = ObjectPath.get(this.config, path);
    }
    return this.configCache[path] as U;
  }

  getRaw<U = T>(): U {
    return deepMerge({}, this.config) as U;
  }

  private loadEnvFile(): void {
    if (
      typeof this.envFiles === 'undefined'
      || !this.envFiles.length
    ) {
      return;
    }

    let env: dotenv.DotenvParseOutput = {};
    for (const path of this.envFiles) {
      const obj = dotenv.parse(fs.readFileSync(path, { encoding: 'utf8' }));
      env = Object.assign(env, obj);
    }

    expandVar(env, this.expandVarOptions);
    this.assignVariablesToProcess(env);
  }

  private loadTomlFile(): void {
    if (
      typeof this.tomlFiles === 'undefined'
      || !this.tomlFiles.length
    ) {
      return;
    }

    let config: Record<string, unknown> = {};
    for (const path of this.tomlFiles) {
      const obj = TOML.parse(fs.readFileSync(path, { encoding: 'utf8' }), { enableTableComment: true });
      config = this.mergeProgram.merge(config, obj);
    }

    expandVar(config, this.expandVarOptions);
    this.config = config;
  }

  private assignVariablesToProcess(config: Record<string, unknown>): void {
    if (typeof config !== 'object') {
      return;
    }

    for (const key of Object.keys(config)) {
      if (key in process.env) {
        continue;
      }

      process.env[key] = config[key] as string | undefined;
    }
  }
}
