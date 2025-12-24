export * from './admin';
export * from './withUUID';

export function useMiddleware(
  handler: (req: Request) => Promise<Response>,
  middlewares: Array<
    (
      req: Request,
      handler: (req: Request) => Promise<Response>
    ) => Promise<Response>
  >
): (req: Request) => Promise<Response> {
  return async function (req: Request): Promise<Response> {
    let composedHandler = handler;
    for (let i = middlewares.length - 1; i >= 0; i--) {
      const currentMiddleware = middlewares[i]!;
      const nextHandler = composedHandler;
      composedHandler = (request: Request): Promise<Response> =>
        currentMiddleware(request, nextHandler);
    }
    return await composedHandler(req);
  };
}
