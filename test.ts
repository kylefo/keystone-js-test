import path from 'path';
import { getContext } from '@keystone-6/core/context';
import { resetDatabase } from '@keystone-6/core/testing';
import * as PrismaModule from '.prisma/client';
import baseConfig from './keystone';

const dbUrl = `file:./test-${process.env.JEST_WORKER_ID}.db`;
const prismaSchemaPath = path.join(__dirname, 'schema.prisma');
const config = { ...baseConfig, db: { ...baseConfig.db, url: dbUrl } };

beforeEach(async () => {
  await resetDatabase(dbUrl, prismaSchemaPath);
});

const context = getContext(config, PrismaModule);

test('Create User Test', async () => {
  // Create user without the required `name` field
  const { data, errors } = await context.graphql.raw({
    query: `mutation {
      createUser(data: { email: "alice@example.com", password: "super-secret" }) {
        id name email password { isSet }
      }
    }`,
  }) as any;

  expect(data!.createUser).toBe(null);
  expect(errors).toHaveLength(1);
  expect(errors![0].path).toEqual(['createUser']);
  expect(errors![0].message).toEqual(
    'You provided invalid data for this operation.\n  - User.name: Name must not be empty'
  );
});