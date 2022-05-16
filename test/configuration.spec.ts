/* eslint-disable node/no-process-env */
import { expect } from 'chai';
import { ArrayMergeLogic, Configuration } from '../src/index.js';

const ENV_FILE_DEFAULT = new URL('./fixtures/.env', import.meta.url);
const ENV_FILE_PRODUCTION = new URL('./fixtures/.env.production', import.meta.url);
const TOML_FILE_DEFAULT = new URL('./fixtures/config.toml', import.meta.url);
const TOML_FILE_PRODUCTION = new URL('./fixtures/config.production.toml', import.meta.url);

describe('Configuration', () => {
  beforeEach(() => {
    const removedKeys = ['PORT', 'BIND_IP', 'DB_HOST', 'DB_PASS', 'TITLE'];
    for (const key of removedKeys) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[key];
    }
  });

  it('empty options', () => {
    const config = new Configuration({});

    expect(config.getRaw()).to.deep.equal({});

    expect(config.get('foo')).to.be.undefined;
    expect(config.get('foo.bar')).to.be.undefined;
  });

  it('one env file', () => {
    const env = { PORT: '3001' };
    expect(process.env).to.not.include(env);

    const config = new Configuration({
      envFiles: [ENV_FILE_DEFAULT]
    });

    expect(process.env).to.include(env);
    expect(config.getRaw()).to.deep.equal({});
  });

  it('multiple env files', () => {
    const env = {
      PORT: '3001',
      BIND_IP: '127.0.0.1',
      DB_HOST: '192.168.42.42',
      DB_PASS: 's1mpl3',
      TITLE: 'LUNJS'
    };
    expect(process.env).to.not.include(env);

    const config = new Configuration({
      envFiles: [ENV_FILE_DEFAULT, ENV_FILE_PRODUCTION]
    });

    expect(process.env).to.include(env);
    expect(config.getRaw()).to.deep.equal({});
  });

  it('expand environment variables existing already on the machine', () => {
    process.env['PORT'] = '8000';
    process.env['PASSWORD'] = 'hello';

    expect(process.env['DB_PASS']).to.be.undefined;

    const config = new Configuration({
      envFiles: [ENV_FILE_DEFAULT, ENV_FILE_PRODUCTION]
    });

    expect(process.env['PORT']).to.equal('8000');
    expect(process.env['DB_PASS']).to.equal('hello');
    expect(config.getRaw()).to.deep.equal({});
  });

  it('one toml file', () => {
    const config = new Configuration({
      tomlFiles: [TOML_FILE_DEFAULT]
    });

    const configRawObject = {
      host: 'example.lunjs.org',
      port: '3000',
      bindIP: '0.0.0.0',
      siteURL: 'https://example.lunjs.org:3000/',
      title: 'https://example.lunjs.org:3000/',
      database: {
        mongodb: {
          uri: 'mongodb://localhost:27017/test',
          options: {
            user: 'foo',
            pass: 'bar',
            autoIndex: false
          }
        },
        sequelize: {
          dialect: 'sqlite',
          storage: 'path/to/database.sqlite'
        },
        redis: {
          host: '127.0.0.1',
          port: 6379,
          pass: 'hello'
        }
      },
      kafka: {
        clientId: 'my-app',
        brokers: [
          'kafka1:9092',
          'kafka2:9092'
        ]
      },
      users: [
        {
          name: 'tom',
          pass: '123'
        },
        {
          name: 'peter',
          pass: '456'
        }
      ]
    };

    expect(config.getRaw()).to.deep.equal(configRawObject);
    expect(config.get('database.mongodb.uri')).to.equal('mongodb://localhost:27017/test');
  });

  it('multiple toml files', () => {
    const config = new Configuration({
      tomlFiles: [TOML_FILE_DEFAULT, TOML_FILE_PRODUCTION]
    });

    const configRawObject = {
      host: 'example.lunjs.org',
      port: '3000',
      bindIP: '0.0.0.0',
      siteURL: 'https://example.lunjs.org:3000/',
      title: 'https://example.lunjs.org:3000/',
      database: {
        mongodb: {
          uri: 'mongodb://localhost:27017/test',
          options: {
            user: 'foo',
            pass: 'bar',
            autoIndex: false
          }
        },
        sequelize: {
          dialect: 'mysql',
          database: 'test',
          username: 'foo',
          password: 'bar',
          host: 'localhost',
          port: '3306',
          pool: {
            max: 10,
            min: 5
          }
        },
        redis: {
          host: '127.0.0.1',
          port: 6379,
          pass: 'hello'
        }
      },
      kafka: {
        clientId: 'my-app',
        brokers: [
          'kafka3:9092',
          'kafka4:9092'
        ]
      },
      users: [
        {
          name: 'bob',
          pass: '789'
        }
      ]
    };

    expect(config.getRaw()).to.deep.equal(configRawObject);
    expect(config.get('database.mongodb.uri')).to.equal('mongodb://localhost:27017/test');
  });

  it('multiple env files and multiple toml files', () => {
    const config = new Configuration({
      envFiles: [ENV_FILE_DEFAULT, ENV_FILE_PRODUCTION],
      tomlFiles: [TOML_FILE_DEFAULT, TOML_FILE_PRODUCTION]
    });

    const configRawObject = {
      host: 'example.lunjs.org',
      port: '3001',
      bindIP: '127.0.0.1',
      siteURL: 'https://example.lunjs.org:3001/',
      title: 'LUNJS',
      database: {
        mongodb: {
          uri: 'mongodb://192.168.42.42:27017/test',
          options: {
            user: 'foo',
            pass: 'hello',
            autoIndex: false
          }
        },
        sequelize: {
          dialect: 'mysql',
          database: 'test',
          username: 'foo',
          password: 'hello',
          host: '192.168.42.42',
          port: '3306',
          pool: {
            max: 10,
            min: 5
          }
        },
        redis: {
          host: '127.0.0.1',
          port: 6379,
          pass: 'hello'
        }
      },
      kafka: {
        clientId: 'my-app',
        brokers: [
          'kafka3:9092',
          'kafka4:9092'
        ]
      },
      users: [
        {
          name: 'bob',
          pass: '789'
        }
      ]
    };

    expect(config.getRaw()).to.deep.equal(configRawObject);
    expect(config.get('database.mongodb.uri')).to.equal('mongodb://192.168.42.42:27017/test');
  });

  it('options.arrayMergeLogic = ArrayMergeLogic.MergeInOrder', () => {
    const config = new Configuration({
      tomlFiles: [TOML_FILE_DEFAULT, TOML_FILE_PRODUCTION],
      arrayMergeLogic: ArrayMergeLogic.MergeInOrder
    });

    const brokers = [
      'kafka3:9092',
      'kafka4:9092'
    ];
    const users = [
      {
        name: 'bob',
        pass: '789'
      },
      {
        name: 'peter',
        pass: '456'
      }
    ];

    expect(config.get('kafka.brokers')).to.deep.equal(brokers);
    expect(config.get('users')).to.deep.equal(users);
  });

  it('options.arrayMergeLogic = ArrayMergeLogic.Append', () => {
    const config = new Configuration({
      tomlFiles: [TOML_FILE_DEFAULT, TOML_FILE_PRODUCTION],
      arrayMergeLogic: ArrayMergeLogic.Append
    });

    const brokers = [
      'kafka1:9092',
      'kafka2:9092',
      'kafka3:9092',
      'kafka4:9092'
    ];
    const users = [
      {
        name: 'tom',
        pass: '123'
      },
      {
        name: 'peter',
        pass: '456'
      },
      {
        name: 'bob',
        pass: '789'
      }
    ];

    expect(config.get('kafka.brokers')).to.deep.equal(brokers);
    expect(config.get('users')).to.deep.equal(users);
  });
});
