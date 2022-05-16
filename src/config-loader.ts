import * as fs from 'fs';
import * as Path from 'path';
import { Configuration } from './configuration';
import { ArrayMergeLogic } from './merge-utils';

export type GetConfigFilenameFn = (toml: boolean, env?: string) => string;

export interface ConfigLoaderOptions {
  dir?: string;
  env?: string;
  filename?: GetConfigFilenameFn;
  disableCache?: boolean;
  /**
   * @default ArrayMergeLogic.Override
   */
  arrayMergeLogic?: ArrayMergeLogic;
}

function getConfigFilename(toml: boolean, env?: string): string {
  if (toml) {
    return env ? `config.${env}.toml` : 'config.toml';
  } else {
    return env ? `.env.${env}` : '.env';
  }
}

export class ConfigLoader {
  static load(options?: ConfigLoaderOptions): Configuration {
    const envFiles = this.collectConfigFiles(process.cwd(), false, options);

    const dir = options?.dir || 'config';
    const configPath = Path.resolve(dir);
    const tomlFiles = this.collectConfigFiles(configPath, true, options);

    return new Configuration({
      envFiles,
      tomlFiles,
      disableCache: options?.disableCache,
      arrayMergeLogic: options?.arrayMergeLogic
    });
  }

  private static collectConfigFiles(configPath: string, isTomlFile: boolean, options?: ConfigLoaderOptions): string[] {
    const files: string[] = [];

    const defaultFilename = (options?.filename || getConfigFilename)(isTomlFile);
    const defaultFilePath = Path.join(configPath, defaultFilename);
    if (fs.existsSync(defaultFilePath)) {
      files.push(defaultFilePath);
    }

    if (options?.env) {
      const envFilename = (options.filename || getConfigFilename)(isTomlFile, options.env);
      const envFilePath = Path.join(configPath, envFilename);
      if (fs.existsSync(envFilePath)) {
        files.push(envFilePath);
      }
    }

    return files;
  }
}
