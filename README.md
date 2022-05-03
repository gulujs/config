# @lunjs/config

## Installation

```sh
npm install @lunjs/config
```

## Usage

```ts
import { Configuration } from '@lunjs/config';

const config = new Configuration({
  envFiles: ['/path/to/.env', '/path/to/.env.production'],
  tomlFiles: ['/path/to/config.toml', '/path/to/config.production.toml']
});
config.load();

interface RedisOptions {
  host: string;
  port: number;
  pass: string;
}
const options = config.get<RedisOptions>('database.redis');
console.log(options);
```

More detail usage, see the [test](test)

## License

[MIT](LICENSE)
