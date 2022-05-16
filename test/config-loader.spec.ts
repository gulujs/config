import { expect } from 'chai';
import { ConfigLoader } from '../src';

describe('ConfigLoader', () => {
  it('xxxx', () => {
    const config = ConfigLoader.load({ dir: './test/fixtures', env: 'production' });

    const expectedConfig = {
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

    expect(config.getRaw()).to.deep.equal(expectedConfig);
  });
});
