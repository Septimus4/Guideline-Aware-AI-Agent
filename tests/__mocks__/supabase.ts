// Mock Supabase client for tests
export const createMockSupabaseClient = () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    // The actual data/error response
    data: null,
    error: null,
    count: 0
  };

  // Make the query methods return a promise that resolves to the query object
  const makeAsync = (obj: any) => {
    const asyncObj = Object.assign({}, obj);
    Object.setPrototypeOf(asyncObj, Promise.prototype);
    asyncObj.then = (onResolve: any) => Promise.resolve(obj).then(onResolve);
    asyncObj.catch = (onReject: any) => Promise.resolve(obj).catch(onReject);
    return asyncObj;
  };

  const mockClient = {
    from: jest.fn(() => makeAsync(mockQuery)),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn()
    }
  };

  return { mockClient, mockQuery };
};

export default createMockSupabaseClient;
