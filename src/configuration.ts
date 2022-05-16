/* eslint-disable node/no-process-env */
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { deepMerge, DeepMergeProgram } from '@lunjs/deep-merge';
import { expandVar, ExpandVarOptions } from '@lunjs/expand-var';
import { ObjectPath } from '@lunjs/object-path';
import * as TOML from '@lunjs/toml';
import {
  ArrayMergeLogic,
  makeArrayMerge,
  objectMerge
} from './merge-utils';


const DEFAULT_EXPAND_VAR_OPTIONS: ExpandVarOptions = {
  get: path => process.env[path]
};

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

export class Configuration<T = Record<string, unknown>> {
  private config: Record<string, unknown> = {};
  private readonly configCache: Record<string, unknown> = {};
  private readonly mergeProgram: DeepMergeProgram;
  private readonly envFiles?: Array<string | URL>;
  private readonly tomlFiles?: Array<string | URL>;
  private readonly disableCache: boolean;
  private readonly expandVarOptions: ExpandVarOptions;

  constructor(options: ConfigurationOptions) {
    this.envFiles = options.envFiles;
    this.tomlFiles = options.tomlFiles;
    this.disableCache = options.disableCache === true;
    this.expandVarOptions = options.expandVarOptions || DEFAULT_EXPAND_VAR_OPTIONS;
    this.mergeProgram = new DeepMergeProgram({
      objectMerge,
      arrayMerge: makeArrayMerge(options.arrayMergeLogic)
    });

    this.load();
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

  private load(): void {
    this.loadEnvFile();
    this.loadTomlFile();
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
