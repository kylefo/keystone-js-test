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

describe('Auth Test', () => {
  const alice = {
    name: 'alice',
    email: 'alice@example.com',
    password: 'alice-secret'
  };

  const bob = {
    name: 'bob',
    email: 'bob@example.com',
    password: 'bob-secret'
  }

  beforeEach(async () => {
    const { errors } = await context.graphql.raw({
      query: `mutation { createUsers(data: [{
        name: "${alice.name}",
        email: "${alice.email}",
        password: "${alice.password}",
      }, {
        name: "${bob.name}",
        email: "${bob.email}",
        password: "${bob.password}",
      }]) { id }}`,
    });

    expect(errors).toBe(undefined);
  });

  // sign up
  test('sign up with good data', async () => {
    const aliceb = {
      name: 'aliceb',
      email: 'aliceb@example.com',
      password: 'aliceb-secret'
    };

    const { data, errors } = await context.graphql.raw({
      query: `mutation { user: createUser(data: { name: "${aliceb.name}", email: "${aliceb.email}", password: "${aliceb.password}" }) { id name email password { isSet } }}`,
    }) as any;

    expect(errors).toBe(undefined);
    expect(data!.user.name).toEqual(aliceb.name);
    expect(data!.user.email).toEqual(aliceb.email);
    expect(data!.user.password.isSet).toEqual(true);
  });

  test('sign up with existing data', async () => {
    const { data, errors } = await context.graphql.raw({
      query: `mutation { user: createUser(data: { name: "${alice.name}", email: "${alice.email}", password: "${alice.password}" }) { id name email password { isSet } }}`,
    }) as any;

    expect(data!.user).toBe(null);
    expect(errors).toHaveLength(1);
    expect(errors![0].message).toEqual(
      'Prisma error: Unique constraint failed on the fields: (`email`)'
    );
  });

  test('sign up with bad data', async () => {
    const boba = {
      name: '', // required but empty
      email: 'bob@example.com',
      password: 'bob' // min length is 8 but 3
    };

    const { data, errors } = await context.graphql.raw({
      query: `mutation {  user: createUser(data: { name: "${bob.name}", email: "${bob.email}", password: "${bob.password}" }) { id name email password { isSet } }}`,
    }) as any;

    expect(data!.user).toBe(null);
    expect(errors).toHaveLength(1);
    expect(errors![0].message).toEqual(
      'You provided invalid data for this operation.\n  - User.name: Name must not be empty\n  - User.password: Password must be at least 8 characters long'
    );
  });

  // sign in
  test('sign in with good data', async () => {
    const { data, errors } = await context.graphql.raw({
      query: `mutation { authenticate: authenticateUserWithPassword(email: "${alice.email}", password: "${alice.password}") { ... on UserAuthenticationWithPasswordSuccess { item { id name email } } ... on UserAuthenticationWithPasswordFailure { message } }}`,
    }) as any;

    expect(data!.authenticate.message).toBe(undefined);
    expect(data!.authenticate.item.name).toEqual(alice.name);
    expect(data!.authenticate.item.email).toEqual(alice.email);
  });

  test('sign in with bad data', async () => {
    const boba = {
      email: 'bob@example.com',
      password: 'bob'
    };

    const { data, errors } = await context.graphql.raw({
      query: `mutation { authenticate: authenticateUserWithPassword(email: "${bob.email}", password: "${bob.password}") { ... on UserAuthenticationWithPasswordSuccess { item { id name email } } ... on UserAuthenticationWithPasswordFailure { message } }}`,
    }) as any;

    expect(data!.authenticate.message).toEqual('Authentication failed.');
  });
});